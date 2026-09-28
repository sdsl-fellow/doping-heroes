/**
 * Doping Heroes cloud save API
 *
 * Bound this script to a private Google Sheet, add a temporary Script Property
 * named ROOT_PIN, and run setupDopingHeroes() once before deploying as a web app.
 */

const API_VERSION = 20;
const RELEASE_LABEL = 'v20-roster-identifiers';
const ROOT_STUDENT_ID = typeof PropertiesService==='undefined'?'':(PropertiesService.getScriptProperties().getProperty('ROOT_STUDENT_ID')||'');
const ROOT_NAME = typeof PropertiesService==='undefined'?'관리자':(PropertiesService.getScriptProperties().getProperty('ROOT_NAME')||'관리자');
const ROSTER_SHEET = 'Roster';
const STUDENTS_SHEET = 'Students';
const STAGES_SHEET = 'StageReleases';
const AUDIT_SHEET = 'AuditLog';
const TOKEN_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_SAVE_BYTES = 100000;

const STUDENT_HEADERS = [
  'studentId', 'name', 'doping', 'type', 'coins',
  'items', 'saveJson', 'revision', 'updatedAt', 'createdAt', 'pinSalt', 'pinHash'
];
const ROSTER_HEADERS = ['studentId', 'name'];
const STAGE_HEADERS = ['stageNumber', 'released', 'updatedAt', 'updatedBy'];
const AUDIT_HEADERS = ['timestamp', 'event', 'studentId', 'detail'];

function setupDopingHeroes() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) throw new Error('Google Sheet에서 확장 프로그램 → Apps Script로 연 뒤 실행하세요.');
  spreadsheet.setSpreadsheetTimeZone('Asia/Seoul');

  const props = PropertiesService.getScriptProperties();
  props.setProperty('SPREADSHEET_ID', spreadsheet.getId());
  if (!props.getProperty('AUTH_SECRET')) {
    props.setProperty('AUTH_SECRET', randomSecret_());
  }

  const temporaryRootPin = props.getProperty('ROOT_PIN');
  if (!props.getProperty('ROOT_PIN_HASH')) {
    if (!temporaryRootPin || !/^\d{6,12}$/.test(temporaryRootPin)) {
      throw new Error('프로젝트 설정 → 스크립트 속성에 ROOT_PIN(숫자 6~12자리)을 먼저 추가하세요.');
    }
    const salt = Utilities.getUuid();
    props.setProperties({
      ROOT_PIN_SALT: salt,
      ROOT_PIN_HASH: hashPin_(ROOT_STUDENT_ID, temporaryRootPin, salt)
    });
    props.deleteProperty('ROOT_PIN');
  }

  const roster = ensureSheet_(spreadsheet, ROSTER_SHEET, ROSTER_HEADERS);
  roster.getRange('A:A').setNumberFormat('@');
  const students = ensureSheet_(spreadsheet, STUDENTS_SHEET, STUDENT_HEADERS);
  students.getRange('A:A').setNumberFormat('@');

  const stages = ensureSheet_(spreadsheet, STAGES_SHEET, STAGE_HEADERS);
  if (stages.getLastRow() < 2) {
    const now = koreaTimestamp_();
    const rows = Array.from({length: 12}, function (_, index) {
      return [index + 1, false, now, 'setup'];
    });
    stages.getRange(2, 1, rows.length, STAGE_HEADERS.length).setValues(rows);
  }

  ensureSheet_(spreadsheet, AUDIT_SHEET, AUDIT_HEADERS);
  ensureRootRow_(students);
  migrateCompletionFields();
  repairInventoryAndSeoulTime();
  SpreadsheetApp.flush();
  return 'Doping Heroes 시트 초기화 완료';
}

function doGet() {
  try {
    return jsonOutput_({
      ok: true,
      apiVersion: API_VERSION,
      release: RELEASE_LABEL,
      item_schema: ITEM_SCHEMA,
      stage_layout: 3,
      stages: readStages_(),
      serverTime: koreaTimestamp_()
    });
  } catch (error) {
    return errorOutput_(error);
  }
}

function doPost(e) {
  let request;
  try {
    request = parseRequest_(e);
    switch (request.action) {
      case 'checkStudent': return jsonOutput_(checkStudent_(request));
      case 'register': return jsonOutput_(registerStudent_(request));
      case 'login': return jsonOutput_(loginStudent_(request));
      case 'rootLogin': return jsonOutput_(loginRoot_(request));
      case 'load': return jsonOutput_(loadStudent_(request));
      case 'save': return jsonOutput_(saveStudent_(request));
      case 'stageState': return jsonOutput_({ok: true, stages: readStages_(), serverTime: koreaTimestamp_()});
      case 'translationStart':
      case 'translationAnswer': return jsonOutput_(translationAction_(request));
      case 'learningStart':
      case 'learningAnswer': return jsonOutput_(learningContentAction_(request));
      case 'qaCreate':
      case 'qaList': return jsonOutput_(questionsAction_(request));
      case 'setStage': return jsonOutput_(setStage_(request));
      default: throw apiError_('UNKNOWN_ACTION', '지원하지 않는 요청입니다.');
    }
  } catch (error) {
    auditRequestError_(request,error);
    return errorOutput_(error);
  }
}

function checkStudent_(request) {
  const studentId = requireStudentId_(request.studentId);
  if (studentId === ROOT_STUDENT_ID) return {ok: true, allowed: true, registered: true};
  const allowed = rosterStudent_(studentId) !== null;
  const row = allowed ? findStudentRow_(studentsSheet_(), studentId) : 0;
  const registered = row ? Boolean(studentsSheet_().getRange(row, STUDENT_HEADERS.indexOf("pinHash") + 1).getValue()) : false;
  return {ok: true, allowed: allowed, registered: registered};
}

function registerStudent_(request) {
  const studentId = requireStudentId_(request.studentId);
  const name = requireName_(request.name);
  const pin = requireStudentPin_(request.pin);
  if (studentId === ROOT_STUDENT_ID) throw apiError_('RESERVED_ACCOUNT', 'root 계정은 rootLogin을 사용하세요.');
  assertRosterAllowed_(studentId);

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = studentsSheet_();
    if (findStudentRow_(sheet, studentId)) throw apiError_('ACCOUNT_EXISTS', '이미 등록된 학번입니다. 로그인하세요.');

    const salt = Utilities.getUuid();
    const save = normalizeSave_(request.save, studentId, name);
    delete save.translation_progress;
    const now = koreaTimestamp_();
    appendStudent_(sheet, studentId, name, save, 1, now, now, salt, hashPin_(studentId, pin, salt));
    audit_('REGISTER', studentId, {revision: 1});
    return studentResponse_(studentId, name, save, 1, issueToken_(studentId, 'student'));
  } finally {
    lock.releaseLock();
  }
}

function loginStudent_(request) {
  const studentId = requireStudentId_(request.studentId);
  const pin = requireStudentPin_(request.pin);
  if (studentId === ROOT_STUDENT_ID) throw apiError_('INVALID_CREDENTIALS', '학번 또는 PIN을 확인하세요.');
  assertRosterAllowed_(studentId);
  enforceLoginLimit_(studentId);

  const sheet = studentsSheet_();
  const row = findStudentRow_(sheet, studentId);
  if (!row) {
    recordLoginFailure_(studentId);
    throw apiError_('INVALID_CREDENTIALS', '학번 또는 PIN을 확인하세요.');
  }
  const values = sheet.getRange(row, 1, 1, STUDENT_HEADERS.length).getValues()[0];
  if (!constantTimeEqual_(hashPin_(studentId, pin, String(values[STUDENT_HEADERS.indexOf("pinSalt")])), String(values[STUDENT_HEADERS.indexOf("pinHash")]))) {
    recordLoginFailure_(studentId);
    throw apiError_('INVALID_CREDENTIALS', '학번 또는 PIN을 확인하세요.');
  }
  clearLoginFailures_(studentId);
  const save = parseStoredSave_(values[STUDENT_HEADERS.indexOf("saveJson")], studentId, String(values[1]));
  audit_('LOGIN', studentId, {});
  return studentResponse_(studentId, String(values[1]), save, Number(values[STUDENT_HEADERS.indexOf("revision")]) || 1, issueToken_(studentId, 'student'));
}

function loginRoot_(request) {
  const pin = String(request.pin || '');
  enforceLoginLimit_('root');
  const props = PropertiesService.getScriptProperties();
  const expected = props.getProperty('ROOT_PIN_HASH');
  const salt = props.getProperty('ROOT_PIN_SALT');
  if (!expected || !salt || !constantTimeEqual_(hashPin_(ROOT_STUDENT_ID, pin, salt), expected)) {
    recordLoginFailure_('root');
    throw apiError_('INVALID_CREDENTIALS', '관리자 PIN을 확인하세요.');
  }
  clearLoginFailures_('root');

  const sheet = studentsSheet_();
  const row = ensureRootRow_(sheet);
  if (!Number.isInteger(row) || row < 2) throw apiError_('ROOT_ROW_ERROR', 'root 계정 행을 복구하지 못했습니다. repairRootAccount를 실행해 주세요.');
  const values = sheet.getRange(row, 1, 1, STUDENT_HEADERS.length).getValues()[0];
  const save = parseStoredSave_(values[STUDENT_HEADERS.indexOf("saveJson")], ROOT_STUDENT_ID, ROOT_NAME);
  audit_('ROOT_LOGIN', ROOT_STUDENT_ID, {});
  return studentResponse_(ROOT_STUDENT_ID, ROOT_NAME, save, Number(values[STUDENT_HEADERS.indexOf("revision")]) || 1, issueToken_(ROOT_STUDENT_ID, 'root'));
}

function loadStudent_(request) {
  const auth = verifyToken_(request.token);
  const sheet = studentsSheet_();
  const row = findStudentRow_(sheet, auth.studentId);
  if (!row) throw apiError_('ACCOUNT_NOT_FOUND', '저장된 계정을 찾을 수 없습니다.');
  const values = sheet.getRange(row, 1, 1, STUDENT_HEADERS.length).getValues()[0];
  return studentResponse_(auth.studentId, String(values[1]), parseStoredSave_(values[STUDENT_HEADERS.indexOf("saveJson")], auth.studentId, String(values[1])), Number(values[STUDENT_HEADERS.indexOf("revision")]) || 1, null);
}

function saveStudent_(request) {
  const auth = verifyToken_(request.token);
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = studentsSheet_();
    const row = findStudentRow_(sheet, auth.studentId);
    if (!row) throw apiError_('ACCOUNT_NOT_FOUND', '저장된 계정을 찾을 수 없습니다.');
    const values = sheet.getRange(row, 1, 1, STUDENT_HEADERS.length).getValues()[0];
    const currentRevision = Number(values[STUDENT_HEADERS.indexOf("revision")]) || 1;
    const baseRevision = Number(request.baseRevision);
    if (!Number.isInteger(baseRevision) || baseRevision !== currentRevision) {
      return {
        ok: false,
        error: {code: 'REVISION_CONFLICT', message: '다른 기기에서 저장 데이터가 변경되었습니다.'},
        student: {
          studentId: auth.studentId,
          name: String(values[1]),
          save: translationPublicSave_(toStoredSave(parseStoredSave_(values[STUDENT_HEADERS.indexOf("saveJson")], auth.studentId, String(values[1])))),
          revision: currentRevision
        },
        ...(request.includeStages === false ? {} : {stages: readStages_()}),
        serverTime: koreaTimestamp_()
      };
    }

    const name = auth.role === 'root' ? ROOT_NAME : requireName_(request.save && request.save.name || values[1]);
    const save = normalizeSave_(request.save, auth.studentId, name);
    const previousSave = parseStoredSave_(values[STUDENT_HEADERS.indexOf('saveJson')], auth.studentId, name);
    save.readBookSources = [...new Set([...bookSources(previousSave), ...bookSources(save)])];
    const translation = previousSave.translation_progress;
    if (translation) save.translation_progress = translation; else delete save.translation_progress;
    const revision = currentRevision + 1;
    const now = koreaTimestamp_();
    writeStudentProgress_(sheet, row, auth.studentId, name, save, revision, now, values[STUDENT_HEADERS.indexOf("createdAt")], values[STUDENT_HEADERS.indexOf("pinSalt")], values[STUDENT_HEADERS.indexOf("pinHash")]);
    audit_('SAVE', auth.studentId, {revision: revision});
    return studentResponse_(auth.studentId, name, save, revision, null, request.includeStages !== false);
  } finally {
    lock.releaseLock();
  }
}

function setStage_(request) {
  const auth = verifyToken_(request.token);
  if (auth.role !== 'root') throw apiError_('FORBIDDEN', 'root 계정만 스테이지 상태를 변경할 수 있습니다.');
  const index = Number(request.index);
  if (!Number.isInteger(index) || index < 0 || index >= 12 || typeof request.released !== 'boolean') {
    throw apiError_('INVALID_STAGE', '스테이지 번호 또는 상태가 올바르지 않습니다.');
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = stagesSheet_();
    const table=stageTable_(sheet);
    const offset=table.rows.findIndex(row=>Number(row[table.columns[0]])===index+1);
    const row=offset<0?sheet.getLastRow()+1:offset+2;
    const values=[index+1,request.released,koreaTimestamp_(),ROOT_STUDENT_ID];
    table.columns.forEach((column,i)=>sheet.getRange(row,column+1).setValue(values[i]));
    audit_(request.released ? 'STAGE_RELEASE' : 'STAGE_RELOCK', ROOT_STUDENT_ID, {stage: index + 1});
    SpreadsheetApp.flush();
    return {ok: true, stages: readStages_(), serverTime: koreaTimestamp_()};
  } finally {
    lock.releaseLock();
  }
}

function studentResponse_(studentId, name, save, revision, token, includeStages) {
  const result = {
    ok: true,
    student: {studentId: studentId, name: name, save: translationPublicSave_(toStoredSave(save)), revision: revision},
    serverTime: koreaTimestamp_()
  };
  if (includeStages !== false) result.stages = readStages_();
  if (token) result.token = token;
  return result;
}

function normalizeSave_(input, studentId, name) {
  const source = normalizeItemSave(fromStoredSave(input && typeof input === 'object' ? input : {}));
  const save = {
    version: 3,
    item_schema: 3,
    stage_layout: 3,
    studentId: studentId,
    name: name,
    character: source.character && typeof source.character === 'object' ? jsonClone_(source.character) : null,
    completed: intList_(source.completed, 0, 14, 15),
    readBooks: intList_(source.readBooks, 0, 11, 12),
    readBookSources: bookSources(source),
    puzzle_completed: puzzleIds(source),
    doping: finiteNumber_(source.doping, 1e13, 1e21, 1e13),
    type: source.type === 'p' ? 'p' : 'n',
    coins: Math.floor(finiteNumber_(source.coins, 0, 1000000000, 0)),
    quantities: normalizeQuantities_(source.quantities),
    purchased: stringList_(source.purchased, 200, 80),
    ...(source.translation_progress ? {translation_progress: jsonClone_(source.translation_progress)} : {}),
    area: validArea_(source.area)
  };
  const serialized = JSON.stringify(save);
  if (serialized.length > MAX_SAVE_BYTES) throw apiError_('SAVE_TOO_LARGE', '저장 데이터가 허용 크기를 초과했습니다.');
  return save;
}

function normalizeQuantities_(value) {
  const output = {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) return output;
  Object.keys(value).slice(0, 100).forEach(function (key) {
    if (/^[a-z0-9-]{1,80}$/i.test(key)) output[key] = Math.floor(finiteNumber_(value[key], 0, 9999, 0));
  });
  return output;
}

function validArea_(value) {
  return value === 'village' || value === 'adventure' || /^stage-(?:[0-9]|1[0-4])$/.test(String(value)) ? String(value) : 'village';
}

function appendStudent_(sheet, studentId, name, save, revision, updatedAt, createdAt, pinSalt, pinHash) {
  const row = Math.max(2, sheet.getLastRow() + 1);
  writeStudentId_(sheet, row, studentId);
  sheet.getRange(row, 2, 1, STUDENT_HEADERS.length - 1).setValues([studentRow_(studentId, name, save, revision, updatedAt, createdAt, pinSalt, pinHash).slice(1)]);
}

function writeStudentProgress_(sheet, row, studentId, name, save, revision, updatedAt, createdAt, pinSalt, pinHash) {
  sheet.getRange(row, 1, 1, STUDENT_HEADERS.length).setValues([
    studentRow_(studentId, name, save, revision, updatedAt, createdAt, pinSalt, pinHash)
  ]);
  SpreadsheetApp.flush();
}

function studentRow_(studentId, name, save, revision, updatedAt, createdAt, pinSalt, pinHash) {
  return [
    studentId,
    safeCell_(name),
    save.doping,
    save.type,
    save.coins,
    inventoryIds(save).join(','),
    JSON.stringify(toStoredSave(save)),
    revision,
    seoulCellTime_(updatedAt),
    seoulCellTime_(createdAt),
    pinSalt || '',
    pinHash || ''
  ];
}

function ensureRootRow_(sheet) {
  requireRootConfiguration_();
  const existing = findStudentRow_(sheet, ROOT_STUDENT_ID);
  if (existing) {
    writeStudentId_(sheet, existing, ROOT_STUDENT_ID);
    return existing;
  }
  const now = koreaTimestamp_();
  appendStudent_(sheet, ROOT_STUDENT_ID, ROOT_NAME, normalizeSave_({}, ROOT_STUDENT_ID, ROOT_NAME), 1, now, now, '', '');
  return sheet.getLastRow();
}

function repairRootAccount() {
  const sheet = studentsSheet_();
  const row = ensureRootRow_(sheet);
  SpreadsheetApp.flush();
  if (row < 2) throw new Error('root 행 복구에 실패했습니다.');
  return 'root 계정 복구 완료: Students!' + sheet.getRange(row, 1).getA1Notation() + ' = ' + sheet.getRange(row, 1).getDisplayValue();
}

function writeStudentId_(sheet, row, studentId) {
  if (!Number.isInteger(row) || row < 2) throw apiError_('INVALID_STUDENT_ROW', '학생 기록 행 번호가 올바르지 않습니다.');
  const cell = sheet.getRange(row, 1);
  cell.setNumberFormat('@');
  SpreadsheetApp.flush();
  cell.setValue("'" + studentId);
  SpreadsheetApp.flush();
}

function parseStoredSave_(value, studentId, name) {
  try {
    return normalizeSave_(JSON.parse(String(value || '{}')), studentId, name);
  } catch (error) {
    if (error && error.code) throw error;
    throw apiError_('CORRUPT_SAVE', '저장 데이터를 읽을 수 없습니다.');
  }
}

function stageTable_(sheet) {
  const width=Math.max(sheet.getLastColumn(),STAGE_HEADERS.length);
  const headers=sheet.getRange(1,1,1,width).getValues()[0].map(v=>String(v).trim());
  const columns=STAGE_HEADERS.map(h=>headers.indexOf(h));
  if(columns.some(i=>i<0)||STAGE_HEADERS.some(h=>headers.filter(v=>v===h).length!==1))throw apiError_('STAGE_SCHEMA','StageReleases의 stageNumber, released, updatedAt, updatedBy 열을 확인하세요.');
  const n=sheet.getLastRow()-1,rows=n>0?sheet.getRange(2,1,n,width).getValues():[];
  const seen=new Set();
  rows.forEach(row=>{
    const number=Number(row[columns[0]]);
    if(!Number.isInteger(number)||number<1||number>12)return;
    if(seen.has(number))throw apiError_('STAGE_SCHEMA','StageReleases에 중복된 스테이지 번호가 있습니다: '+number);
    seen.add(number);
  });
  return {columns,rows};
}
function stageReleasedValue_(value) {
  return value===true||value===1||(typeof value==='string'&&['true','1'].includes(value.trim().toLowerCase()));
}
function readStages_() {
  const table=stageTable_(stagesSheet_()),flags=Array(12).fill(false);
  table.rows.forEach(row=>{
    const number=Number(row[table.columns[0]]);
    if(Number.isInteger(number)&&number>=1&&number<=12)flags[number-1]=stageReleasedValue_(row[table.columns[1]]);
  });
  return flags;
}

function issueToken_(studentId, role) {
  const payload = {
    studentId: studentId,
    role: role,
    exp: Date.now() + TOKEN_LIFETIME_MS,
    nonce: Utilities.getUuid()
  };
  const encoded = Utilities.base64EncodeWebSafe(JSON.stringify(payload)).replace(/=+$/g, '');
  return encoded + '.' + sign_(encoded);
}

function verifyToken_(token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 2 || !constantTimeEqual_(sign_(parts[0]), parts[1])) {
    throw apiError_('UNAUTHORIZED', '로그인이 필요합니다.');
  }
  let payload;
  try {
    payload = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(parts[0])).getDataAsString());
  } catch (error) {
    throw apiError_('UNAUTHORIZED', '로그인 정보가 올바르지 않습니다.');
  }
  if (!payload || payload.exp < Date.now() || !payload.studentId || !['student', 'root'].includes(payload.role)) {
    throw apiError_('TOKEN_EXPIRED', '로그인이 만료되었습니다. 다시 로그인하세요.');
  }
  if (payload.role === 'root' && payload.studentId !== ROOT_STUDENT_ID) {
    throw apiError_('UNAUTHORIZED', '관리자 정보가 올바르지 않습니다.');
  }
  if (payload.role === 'student') assertRosterAllowed_(payload.studentId);
  return payload;
}

function assertRosterAllowed_(studentId) {
  if (rosterStudent_(studentId) === null) {
    throw apiError_('STUDENT_NOT_ALLOWED', '등록된 수강생 학번이 아닙니다. 담당자에게 문의해 주세요.');
  }
}

function rosterStudent_(studentId) {
  const sheet = rosterSheet_();
  if (sheet.getLastRow() < 2) return null;
  const range = sheet.getRange(2, 1, sheet.getLastRow() - 1, 2);
  const values = range.getValues();
  const displayed = range.getDisplayValues();
  for (let index = 0; index < values.length; index += 1) {
    const rawId = values[index][0];
    const id = typeof rawId === 'number' && Number.isSafeInteger(rawId) ? rawId : displayed[index][0];
    if (canonicalStudentId_(id) === studentId) return {row: index + 2, name: String(values[index][1] || '')};
  }
  return null;
}

function sign_(text) {
  const secret = PropertiesService.getScriptProperties().getProperty('AUTH_SECRET');
  if (!secret) throw apiError_('NOT_CONFIGURED', 'setupDopingHeroes를 먼저 실행하세요.');
  return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(text, secret)).replace(/=+$/g, '');
}

function hashPin_(studentId, pin, salt) {
  const secret = PropertiesService.getScriptProperties().getProperty('AUTH_SECRET');
  if (!secret) throw new Error('AUTH_SECRET이 없습니다. setupDopingHeroes를 다시 실행하세요.');
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, [secret, studentId, salt, pin].join(':'));
  return bytes.map(function (byte) { return ('0' + ((byte + 256) % 256).toString(16)).slice(-2); }).join('');
}

function enforceLoginLimit_(key) {
  const count = Number(CacheService.getScriptCache().get(loginFailureKey_(key)) || 0);
  if (count >= 5) throw apiError_('TOO_MANY_ATTEMPTS', '로그인 시도가 많습니다. 10분 후 다시 시도하세요.');
}

function recordLoginFailure_(key) {
  const cache = CacheService.getScriptCache();
  const cacheKey = loginFailureKey_(key);
  const count = Number(cache.get(cacheKey) || 0) + 1;
  cache.put(cacheKey, String(count), 600);
}

function clearLoginFailures_(key) {
  CacheService.getScriptCache().remove(loginFailureKey_(key));
}

function loginFailureKey_(key) {
  return 'login-fail-' + String(key).replace(/[^a-z0-9]/gi, '');
}

function requireStudentId_(value) {
  const studentId = String(value || '').trim().toUpperCase();
  if (!/^[A-Z0-9_-]{1,20}$/.test(studentId)) {
    throw apiError_('INVALID_STUDENT_ID', '학번 또는 수강생 ID는 영문·숫자·-·_ 1~20자여야 합니다.');
  }
  return studentId;
}

function requireName_(value) {
  const name = String(value || '').trim();
  if (!name || name.length > 20) throw apiError_('INVALID_NAME', '이름은 1~20자로 입력하세요.');
  return name;
}

function requireStudentPin_(value) {
  const pin = String(value || '');
  if (!/^\d{4,8}$/.test(pin)) throw apiError_('INVALID_PIN', 'PIN은 숫자 4~8자리여야 합니다.');
  return pin;
}

function intList_(value, min, max, limit) {
  if (!Array.isArray(value)) return [];
  const unique = {};
  value.forEach(function (item) {
    if (Number.isInteger(item) && item >= min && item <= max) unique[item] = true;
  });
  return Object.keys(unique).map(Number).sort(function (a, b) { return a - b; }).slice(0, limit);
}

function stringList_(value, limit, maxLength) {
  if (!Array.isArray(value)) return [];
  const seen = {};
  const output = [];
  value.forEach(function (item) {
    const text = String(item || '');
    if (text && text.length <= maxLength && !seen[text] && output.length < limit) {
      seen[text] = true;
      output.push(text);
    }
  });
  return output;
}

function finiteNumber_(value, min, max, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : fallback;
}

function parseRequest_(e) {
  if (!e || !e.postData || !e.postData.contents) throw apiError_('EMPTY_REQUEST', '요청 내용이 없습니다.');
  try {
    const value = JSON.parse(e.postData.contents);
    if (!value || typeof value !== 'object') throw new Error('invalid');
    return value;
  } catch (error) {
    throw apiError_('INVALID_JSON', 'JSON 요청 형식이 올바르지 않습니다.');
  }
}

function studentsSheet_() {
  const sheet = requiredSheet_(STUDENTS_SHEET);
  const actual = sheet.getRange(1, 1, 1, STUDENT_HEADERS.length).getValues()[0];
  if (JSON.stringify(actual) !== JSON.stringify(STUDENT_HEADERS)) {
    throw apiError_('SCHEMA_UPGRADE_REQUIRED', 'v6 setupDopingHeroes를 먼저 실행하세요. 게임을 닫고 시트 구조를 갱신해야 합니다.');
  }
  return sheet;
}

function rosterSheet_() {
  return requiredSheet_(ROSTER_SHEET);
}

function stagesSheet_() {
  return requiredSheet_(STAGES_SHEET);
}

function requiredSheet_(name) {
  const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!id) throw apiError_('NOT_CONFIGURED', 'setupDopingHeroes를 먼저 실행하세요.');
  const sheet = SpreadsheetApp.openById(id).getSheetByName(name);
  if (!sheet) throw apiError_('NOT_CONFIGURED', name + ' 시트가 없습니다. setupDopingHeroes를 다시 실행하세요.');
  return sheet;
}

function ensureSheet_(spreadsheet, name, headers) {
  const sheet = spreadsheet.getSheetByName(name) || spreadsheet.insertSheet(name);
  if (name === STUDENTS_SHEET && sheet.getLastRow() > 0) {
    const oldHeaders = STUDENT_HEADERS.slice();
    oldHeaders.splice(2, 0, 'completedStages');
    const actual = sheet.getRange(1, 1, 1, oldHeaders.length).getValues()[0];
    if (JSON.stringify(actual) === JSON.stringify(oldHeaders)) {
      // Keep an exact recoverable copy before removing the obsolete summary.
      sheet.copyTo(spreadsheet).setName('Students_backup_v6_' + Date.now());
      sheet.deleteColumn(3);
    }
  }
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  } else {
    const actual = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
    if (JSON.stringify(actual) !== JSON.stringify(headers)) {
      throw new Error(name + ' 시트의 첫 행 열 구성이 예상과 다릅니다. 빈 시트에서 다시 설정하세요.');
    }
  }
  return sheet;
}

function findStudentRow_(sheet, studentId) {
  if (sheet.getLastRow() < 2) return 0;
  const range = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1);
  const values = range.getValues();
  const displayed = range.getDisplayValues();
  for (let index = 0; index < values.length; index += 1) {
    const rawId = values[index][0];
    const id = typeof rawId === 'number' && Number.isSafeInteger(rawId) ? rawId : displayed[index][0];
    if (canonicalStudentId_(id) === studentId) return index + 2;
  }
  return 0;
}

function canonicalStudentId_(value) {
  const text = String(value || '').trim().replace(/^'/, '');
  if (text === ROOT_STUDENT_ID || text === String(Number(ROOT_STUDENT_ID))) return ROOT_STUDENT_ID;
  return text.toUpperCase();
}

function safeCell_(value) {
  const text = String(value || '');
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function jsonClone_(value) {
  try { return JSON.parse(JSON.stringify(value)); }
  catch (error) { throw apiError_('INVALID_SAVE', '캐릭터 데이터가 올바르지 않습니다.'); }
}

function randomSecret_() {
  return [Utilities.getUuid(), Utilities.getUuid(), Utilities.getUuid()].join('');
}

function koreaTimestamp_() {
  return Utilities.formatDate(new Date(), 'Asia/Seoul', "yyyy-MM-dd'T'HH:mm:ss") + '+09:00';
}

function seoulCellTime_(value) {
  if (!value) return value;
  // Only convert unambiguous instants. Never guess the zone of old plain text.
  if (!(value instanceof Date) && !/(?:Z|[+-]\d{2}:\d{2})$/.test(String(value))) return value;
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return Utilities.formatDate(date, 'Asia/Seoul', "yyyy-MM-dd'T'HH:mm:ss") + '+09:00';
}

function migrateCompletionFields() {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sheet = studentsSheet_();
    let changed = 0;
    for (let row = 2; row <= sheet.getLastRow(); row++) {
      const values = sheet.getRange(row, STUDENT_HEADERS.indexOf("saveJson") + 1, 1, 2).getValues()[0];
      if (!values[0]) continue;
      let save;
      try { save = JSON.parse(String(values[0])); } catch (_) { continue; }
      if (!save || typeof save !== 'object' || Array.isArray(save)) continue;
      const serialized = JSON.stringify(toStoredSave(save));
      if (serialized === String(values[0])) continue;
      sheet.getRange(row, STUDENT_HEADERS.indexOf("saveJson") + 1, 1, 2).setValues([[serialized, (Number(values[1]) || 1) + 1]]);
      changed++;
    }
    SpreadsheetApp.flush();
    return changed + '개 계정 완료 기록 분리 완료';
  } finally { lock.releaseLock(); }
}

// Run once after updating the existing web-app deployment. Safe to repeat.
function migrateItemCatalog() {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sheet = studentsSheet_();
    let changed = 0;
    for (let row = 2; row <= sheet.getLastRow(); row++) {
      const values = sheet.getRange(row, 1, 1, STUDENT_HEADERS.length).getValues()[0];
      const jsonIndex = STUDENT_HEADERS.indexOf('saveJson');
      if (!values[jsonIndex]) continue;
      let original;
      try { original = JSON.parse(String(values[jsonIndex])); } catch (_) { continue; }
      const save = normalizeItemSave(fromStoredSave(original));
      save.studentId = canonicalStudentId_(values[0]);
      save.name = String(values[1]);
      const serialized = JSON.stringify(toStoredSave(save));
      if (serialized !== String(values[jsonIndex])) {
        sheet.getRange(row, jsonIndex + 1).setValue(serialized);
        const revisionIndex = STUDENT_HEADERS.indexOf('revision');
        sheet.getRange(row, revisionIndex + 1).setValue((Number(values[revisionIndex]) || 1) + 1);
        changed++;
      }
      sheet.getRange(row, STUDENT_HEADERS.indexOf('items') + 1).setValue(inventoryIds(save).join(','));
    }
    SpreadsheetApp.flush();
    return changed + '개 계정 아이템 ID 변환 완료';
  } finally { lock.releaseLock(); }
}

function repairInventoryAndSeoulTime() {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    const ss = SpreadsheetApp.openById(id);
    ss.setSpreadsheetTimeZone('Asia/Seoul');
    const students = ss.getSheetByName(STUDENTS_SHEET);
    let repaired = 0;
    for (let row = 2; row <= students.getLastRow(); row++) {
      const values = students.getRange(row, 1, 1, STUDENT_HEADERS.length).getValues()[0];
      if (!values[0]) continue;
      let save;
      try { save = normalizeItemSave(fromStoredSave(JSON.parse(String(values[STUDENT_HEADERS.indexOf("saveJson")] || '{}')))); } catch (_) { continue; }
      // Use the authoritative row identity for root, not client-supplied save identity.
      save.studentId = canonicalStudentId_(values[0]);
      save.name = String(values[1]);
      students.getRange(row, STUDENT_HEADERS.indexOf("items") + 1).setValue(inventoryIds(save).join(','));
      repaired++;
    }
    [[students, [STUDENT_HEADERS.indexOf("updatedAt") + 1, STUDENT_HEADERS.indexOf("createdAt") + 1]], [ss.getSheetByName(STAGES_SHEET), [3]], [ss.getSheetByName(AUDIT_SHEET), [1]]].forEach(function (entry) {
      const sheet = entry[0];
      if (!sheet || sheet.getLastRow() < 2) return;
      entry[1].forEach(function (col) {
        const range = sheet.getRange(2, col, sheet.getLastRow() - 1, 1);
        const values = range.getValues().map(function (row) { return [seoulCellTime_(row[0])]; });
        range.setNumberFormat('@').setValues(values);
      });
    });
    SpreadsheetApp.flush();
    return repaired + '개 계정 items 갱신 및 서울 시간 변환 완료';
  } finally { lock.releaseLock(); }
}

function constantTimeEqual_(left, right) {
  left = String(left || '');
  right = String(right || '');
  let difference = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    difference |= (left.charCodeAt(index % Math.max(left.length, 1)) || 0) ^
      (right.charCodeAt(index % Math.max(right.length, 1)) || 0);
  }
  return difference === 0;
}

function apiError_(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function errorOutput_(error) {
  return jsonOutput_({
    ok: false,
    error: {
      code: error && error.code ? error.code : 'SERVER_ERROR',
      message: error && error.message ? error.message : '서버 오류가 발생했습니다.'
    },
    serverTime: koreaTimestamp_()
  });
}

function jsonOutput_(value) {
  return ContentService.createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}

// BEGIN GENERATED ITEM RULES
// Generated from src/catalog.mjs. Run node scripts/sync-apps-script-items.mjs.
const catalog = [{"id":"C01","legacyId":"tshirt","quest":-1},{"id":"C02","legacyId":"longsleeve","quest":-1},{"id":"C03","legacyId":"cardigan","quest":-1},{"id":"C04","legacyId":"aurora-shirt","quest":-2},{"id":"C05","legacyId":"forest-shirt","quest":-2},{"id":"C06","legacyId":"ember-cardigan","quest":-2},{"id":"C07","legacyId":"gold-tshirt","quest":-2},{"id":"C08","legacyId":"lab-coat","quest":-2},{"id":"C09","legacyId":"cleanroom-suit","quest":-2},{"id":"C10","legacyId":"crystal-armor","quest":-2},{"id":"F01","legacyId":"basic","quest":-1},{"id":"F02","legacyId":"sandals","quest":-2},{"id":"F03","legacyId":"moss-boots","quest":-2},{"id":"F04","legacyId":"boots","quest":0},{"id":"F05","legacyId":"snowboots","quest":-2},{"id":"F06","legacyId":"violet-boots","quest":-2},{"id":"F07","legacyId":"crystal-boots","quest":-2},{"id":"F08","legacyId":"lab-shoes","quest":-2},{"id":"F09","legacyId":"cleanroom-shoes","quest":-2},{"id":"F10","legacyId":"electron-boots","quest":-2},{"id":"H01","legacyId":"cap","quest":1},{"id":"H02","legacyId":"trailcap","quest":-2},{"id":"H03","legacyId":"sun-cap","quest":-2},{"id":"H04","legacyId":"miner-helmet","quest":-2},{"id":"H05","legacyId":"forest-cap","quest":-2},{"id":"H06","legacyId":"moon-cap","quest":-2},{"id":"H07","legacyId":"crystal-cap","quest":-2},{"id":"H08","legacyId":"process-hat","quest":-2},{"id":"H09","legacyId":"cleanroom-hood","quest":-2},{"id":"H10","legacyId":"silicon-crown","quest":-2},{"id":"W01","legacyId":"sword","quest":2},{"id":"W02","legacyId":"crystal-sword","quest":-2},{"id":"W03","legacyId":"sun-sword","quest":-2},{"id":"W04","legacyId":"ember-sword","quest":-2},{"id":"W05","legacyId":"lattice-hammer","quest":-2},{"id":"W06","legacyId":"donor-staff","quest":-2},{"id":"W07","legacyId":"acceptor-staff","quest":-2},{"id":"W08","legacyId":"semiconductor-pen","quest":-2},{"id":"W09","legacyId":"wafer-shield","quest":-2},{"id":"W10","legacyId":"photon-bow","quest":-2},{"id":"A01","legacyId":"glasses","quest":-1},{"id":"A02","legacyId":"headband","quest":-1},{"id":"A03","legacyId":"grounding-bracelet","quest":-2},{"id":"A04","legacyId":"goggles","quest":-2},{"id":"A05","legacyId":"germanium-bracelet","quest":-2},{"id":"A06","legacyId":"chip-ring","quest":-2},{"id":"A07","legacyId":"doping-backpack","quest":-2},{"id":"A08","legacyId":"research-badge","quest":-2},{"id":"A09","legacyId":"wafer-necklace","quest":-2},{"id":"A10","legacyId":"crystal-earrings","quest":-2},{"id":"T01","legacyId":"gate-key","quest":2},{"id":"T02","legacyId":"lecture-notes","quest":-3},{"id":"T03","legacyId":"dopant","quest":-2},{"id":"T04","legacyId":"donor-ampoule","quest":-2},{"id":"T05","legacyId":"acceptor-ampoule","quest":-2},{"id":"T06","legacyId":"wafer-fragment","quest":-2},{"id":"T07","legacyId":"silicon-crystal","quest":-2},{"id":"T08","legacyId":"repair-kit","quest":-2},{"id":"T09","legacyId":"gold-tweezers","quest":-2},{"id":"T10","legacyId":"process-blueprint","quest":-2}];
const catalogItem = id=>catalog.find(item=>item.id===id||item.legacyId===id);
const migrateItemId = id=>catalogItem({'ember-boots':'lab-shoes','moon-sword':'semiconductor-pen'}[id]??id)?.id??id;
const isRootAccount = account => !!ROOT_STUDENT_ID && account?.studentId === ROOT_STUDENT_ID;
const ITEM_SCHEMA = 3;
const oldCodes = {"F02":"F04","F03":"F02","F04":"F05","F05":"F03","H03":"H05","H04":"H03","H05":"H04"};
const swappedHats = {"H06":"H07","H07":"H06"};
function normalizeItemSave(save){
 if(!save||typeof save!=='object')return save;
 const convert=id=>{
  const v2=Number(save.item_schema)>=2?id:(oldCodes[id]??id);
  return migrateItemId(Number(save.item_schema)>=3?v2:(swappedHats[v2]??v2));
 };
 const character={...save.character};
 for(const slot of ['outfit','shoes','hat','weapon','accessory']){
  if(character[slot])character[slot]=convert(character[slot]);
 }
 const quantities={};
 for(const [key,value] of Object.entries(save.quantities??{})){
  const id=convert(key);
  if(catalogItem(id))quantities[id]=Math.max(quantities[id]??0,Number.isInteger(value)?Math.max(0,Math.min(9999,value)):0);
 }
 return {...save,item_schema:ITEM_SCHEMA,character,purchased:[...new Set((save.purchased??[]).map(convert).filter(id=>catalogItem(id)))],quantities};
}
function inventoryIds(s){
 const base=(s.purchased??[]).map(migrateItemId).filter(id=>catalogItem(id));
 if(isRootAccount(s))return catalog.map(i=>i.id);
 if((s.readBooks??[]).length)base.push('T02');
 for(const [id,count] of Object.entries(s.quantities??{}))if(count>0)base.push(migrateItemId(id));
 return catalog.filter(item=>item.quest===-1||(s.completed??[]).includes(item.quest)||base.includes(item.id)).map(item=>item.id);
}
const stageQuestIds = [3,4,5,7,8,13,10,11,6,9,14,12];
function stageList(values){return [...new Set((Array.isArray(values)?values:[]).filter(n=>Number.isInteger(n)&&n>=0&&n<12))].sort((a,b)=>a-b);}
function completionIds(save){
 const list=(value,max)=>[...new Set((Array.isArray(value)?value:[]).filter(n=>Number.isInteger(n)&&n>=0&&n<=max))].sort((a,b)=>a-b);
 const runtime=list(save?.completed,14);
 const tutorial=list(save?.tutorial_completed??runtime.filter(n=>n<3),2);
 const stages=Array.isArray(save?.stage_completed)?stageList(save.stage_completed).map(n=>stageQuestIds[n]):runtime.filter(n=>n>=3);
 return [...tutorial,...stages].sort((a,b)=>a-b);
}
function puzzleIds(save){return stageList(save?.puzzle_completed);}
function fromStoredSave(save){
 if(!save||typeof save!=='object')return save;
 const {tutorial_completed,stage_completed,fetPuzzleCompleted,completion_schema,...rest}=save;
 return {...rest,stage_layout:3,readBooks:stageList(save.readBooks),readBookSources:bookSources(save),completed:completionIds(save),puzzle_completed:puzzleIds(save)};
}
function toStoredSave(save){
 if(!save||typeof save!=='object')return save;
 const normalized=fromStoredSave(save),{completed,...rest}=normalized;
 return {...rest,completion_schema:3,tutorial_completed:completed.filter(n=>n<3),stage_completed:stageQuestIds.map((id,i)=>completed.includes(id)?i:-1).filter(i=>i>=0)};
}
// END GENERATED ITEM RULES

// Run manually in the Apps Script editor. Not exposed through doPost.
// Clears learning records for every Students row, including root.
function resetAllLearningProgress() {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sheet = studentsSheet_();
    const count = sheet.getLastRow() - 1;
    if (count < 1) return '초기화할 계정이 없습니다.';
    const rows = sheet.getRange(2, 1, count, STUDENT_HEADERS.length).getValues();
    const at = name => STUDENT_HEADERS.indexOf(name);
    const now = koreaTimestamp_();
    // Validate all JSON before modifying any row; malformed saves are not silently skipped.
    const patches = rows.map(function (row, index) {
      if (!row[at('studentId')]) return null;
      let save;
      try { save = JSON.parse(String(row[at('saveJson')] || '{}')); }
      catch (_) { throw new Error('Students ' + (index + 2) + '행 saveJson 오류: 초기화를 중단했습니다.'); }
      if (!save || typeof save !== 'object' || Array.isArray(save)) throw new Error('Students ' + (index + 2) + '행 saveJson이 객체가 아닙니다.');
      // Retain items already granted by quests/books even after their records are cleared.
      const owned = String(row[at('items')] || '').split(',').map(id => id.trim()).filter(Boolean);
      save = normalizeItemSave(save);
      save.purchased = [...new Set([...(save.purchased || []), ...owned].map(migrateItemId).filter(id => catalogItem(id)))];
      delete save.completed;
      delete save.fetPuzzleCompleted;
      delete save.completedStages;
      delete save.complated;
      delete save.stage_complted;
      save.tutorial_completed = [];
      save.stage_completed = [];
      save.readBooks = [];
      save.readBookSources = [];
      save.puzzle_completed = [];
      save.area = 'village';
      save.completion_schema = 3;
      save.stage_layout = 3;
      const inventorySave = {...save, studentId: canonicalStudentId_(row[at('studentId')]), name: String(row[at('name')])};
      return [inventoryIds(inventorySave).join(','), JSON.stringify(save), (Number(row[at('revision')]) || 1) + 1, now];
    });
    sheet.copyTo(sheet.getParent()).setName('ProgressBackup_' + Date.now());
    let changed = 0;
    patches.forEach(function (patch, index) {
      if (!patch) return;
      sheet.getRange(index + 2, at('items') + 1, 1, 4).setValues([patch]);
      changed++;
    });
    SpreadsheetApp.flush();
    audit_('RESET_LEARNING_PROGRESS',ROOT_STUDENT_ID,{accounts:changed});
    return changed + '개 계정의 튜토리얼·스테이지 완료, 완독, 퍼즐 기록 초기화 및 세미 마을 이동 완료. 게임을 새로고침해 주세요.';
  } finally { lock.releaseLock(); }
}

/** Stage 1 translation quiz. Included in the downloadable Code_v16.gs. */
const TRANSLATION_HEADERS = ['questionId','stage','kind','english','optionA','optionB','optionC','optionD','correctOption','explanation','sourceId','sourceTitle','sourcePage','active','rewardDose','rewardCoins'];

// Run from the editor after replacing Code.gs. Existing IDs/edits are never overwritten.
function setupTranslationQuiz() {
  translationReadBank_();clearTranslationQuestionCache();
  return '학습 콘텐츠 Translation_01 확인 완료. 기존 문제는 변경하지 않았습니다.';
}
function translationHeaderCheck_(sheet){
  if(JSON.stringify(sheet.getRange(1,1,1,TRANSLATION_HEADERS.length).getValues()[0])!==JSON.stringify(TRANSLATION_HEADERS))throw apiError_('TRANSLATION_SCHEMA','TranslationQuestions의 열 이름과 순서를 확인하세요.');
}
function translationBank_(){
 const key='translation-bank-v16:'+PropertiesService.getScriptProperties().getProperty('CONTENT_SPREADSHEET_ID');
 try{const hit=CacheService.getScriptCache().get(key);if(hit)return JSON.parse(hit);}catch(ignored){}
 const bank=translationReadBank_(),json=JSON.stringify(bank);
 // Cache is optional; eviction or an oversized bank falls back to Sheets.
 try{if(Utilities.newBlob(json).getBytes().length<95000)CacheService.getScriptCache().put(key,json,60);}catch(ignored){}
 return bank;
}
function clearTranslationQuestionCache(){
 CacheService.getScriptCache().remove('translation-bank-v16:'+PropertiesService.getScriptProperties().getProperty('CONTENT_SPREADSHEET_ID'));
}
function translationReadBank_(){
  const rows=learningRows_('Translation_01',TRANSLATION_HEADERS).map(q=>TRANSLATION_HEADERS.map(h=>q[h]));
  const seen=new Set();
  return rows.map((r,i)=>{
    const q=Object.fromEntries(TRANSLATION_HEADERS.map((h,j)=>[h,r[j]]));
    if(Number(q.stage)!==1||!([true,'TRUE','true',1,'1'].includes(q.active)))return null;
    q.questionId=String(q.questionId).trim();q.correctOption=String(q.correctOption).trim().toUpperCase();
    const text=['english','optionA','optionB','optionC','optionD','explanation','sourceId','sourceTitle'];
    if(!/^[A-Za-z0-9_-]{1,80}$/.test(q.questionId)||seen.has(q.questionId)||!['term','sentence'].includes(q.kind)||!['A','B','C','D'].includes(q.correctOption)||text.some(k=>typeof q[k]!=='string'||!q[k].trim())||new Set(['A','B','C','D'].map(k=>q['option'+k].trim())).size!==4||!Number.isInteger(Number(q.sourcePage))||Number(q.sourcePage)<1||!Number.isFinite(Number(q.rewardDose))||Number(q.rewardDose)<=0||!Number.isInteger(Number(q.rewardCoins))||Number(q.rewardCoins)<10||Number(q.rewardCoins)%10!==0)throw apiError_('TRANSLATION_QUESTION','Translation_01 '+(i+2)+'행의 문제 ID·보기·출처·보상을 확인하세요. 코인은 10의 배수여야 합니다.');
    seen.add(q.questionId);q.rewardDose=Number(q.rewardDose);q.rewardCoins=Number(q.rewardCoins);return q;
  }).filter(Boolean);
}
function translationShuffle_(items){
 const out=items.slice();for(let i=out.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;
}
function translationSample_(bank){
 const terms=bank.filter(q=>q.kind==='term'),sentences=bank.filter(q=>q.kind==='sentence');
 if(terms.length<2||sentences.length<4)throw apiError_('TRANSLATION_EMPTY','활성 용어 2개와 문장 4개 이상이 필요합니다. setupTranslationQuiz를 실행하거나 시트를 확인하세요.');
 const n=Math.random()<.5?1:2;
 return translationShuffle_([...translationShuffle_(terms).slice(0,n),...translationShuffle_(sentences).slice(0,5-n)]).map(q=>({...q,options:translationShuffle_(['A','B','C','D'].map(id=>({id,text:q['option'+id]})))}));
}
function translationPublicSave_(save){
 if(!save.translation_progress)return save;
 return {...save,translation_progress:{questions:save.translation_progress.questions||{}}};
}
function translationQuizView_(active){
 return {storageMode:'student-question',id:active.id,questions:active.questions.map(q=>({id:q.questionId,kind:q.kind,english:q.english,options:q.options})),results:active.results||{},expiresAt:active.expiresAt};
}
function translationAction_(request){
 const auth=verifyToken_(request.token);
 if(PropertiesService.getScriptProperties().getProperty('REPORTING_SCHEMA')!=='13')throw apiError_('REPORTING_SETUP','관리자가 Code_v16.gs의 setupReportingV13을 실행해야 합니다.');
 const deferred=PropertiesService.getScriptProperties().getProperty('TRANSLATION_ASYNC_REPORTING')==='14';
 const lock=LockService.getScriptLock();lock.waitLock(10000);
 try{
  const sheet=studentsSheet_(),row=findStudentRow_(sheet,auth.studentId);
  if(!row)throw apiError_('ACCOUNT_NOT_FOUND','계정을 찾지 못했습니다.');
  const v=sheet.getRange(row,1,1,STUDENT_HEADERS.length).getValues()[0],at=h=>STUDENT_HEADERS.indexOf(h);
  const save=parseStoredSave_(v[at('saveJson')],auth.studentId,String(v[1])),revision=Number(v[at('revision')])||1;
  if(save.area!=='stage-1')throw apiError_('TRANSLATION_STAGE','Stage 1 내부에서 번역 퀴즈를 시작하세요.');
  const progress=save.translation_progress||{questions:{}},active=progress.active;
  const respond=()=>({...studentResponse_(auth.studentId,save.name,save,revision,null,false),quiz:translationQuizView_(progress.active)});
  // Retry with the same round ID resumes the same snapshot and never resamples.
  if(request.action==='translationStart'&&active&&active.id===request.roundId&&active.expiresAt>Date.now())return respond();
  if(request.action==='translationAnswer'&&active&&active.id===request.roundId&&active.results[request.questionId]){if(!deferred)translationLog_(auth.studentId,active,request.questionId,progress.questions);return respond();}
  if(Number(request.baseRevision)!==revision)return {...studentResponse_(auth.studentId,save.name,save,revision,null,false),ok:false,error:{code:'REVISION_CONFLICT',message:'저장 기록이 변경됐습니다. 최신 기록을 반영한 후 다시 제출하세요.'}};
  if(request.action==='translationStart'){
   if(!/^[A-Za-z0-9_-]{8,80}$/.test(String(request.roundId)))throw apiError_('TRANSLATION_ROUND','올바르지 않은 회차 ID입니다.');
   if(active&&!deferred)Object.keys(active.results||{}).forEach(id=>translationLog_(auth.studentId,active,id,progress.questions));
   progress.active={id:request.roundId,expiresAt:Date.now()+86400000,questions:translationSample_(translationBank_()),results:{}};
  }else{
   if(!active||active.id!==request.roundId||active.expiresAt<Date.now())throw apiError_('TRANSLATION_EXPIRED','퀴즈가 만료됐거나 다른 회차를 시작했습니다. 새 회차를 시작하세요.');
   const q=active.questions.find(q=>q.questionId===request.questionId);
   if(!q||!['A','B','C','D'].includes(request.optionId))throw apiError_('TRANSLATION_ANSWER','문제와 선택한 보기를 확인하세요.');
   const previous=progress.questions[q.questionId]||{attempts:0,correctCount:0,totalRewardDose:0,totalRewardCoins:0,rewardTotalsComplete:true},correct=request.optionId===q.correctOption;
   const divisor=previous.correctCount>0?10:1,dose=correct?q.rewardDose/divisor:0,coins=correct?q.rewardCoins/divisor:0;
   const actualDose=Math.min(dose,Math.max(0,1e21-save.doping)),actualCoins=Math.min(coins,Math.max(0,1000000000-save.coins)),now=koreaTimestamp_();
   progress.questions[q.questionId]={...previous,attempts:previous.attempts+1,correctCount:previous.correctCount+(correct?1:0),lastAnsweredAt:now,lastSelectedOption:request.optionId,lastCorrect:correct,stage:1,kind:q.kind,sourceId:q.sourceId,sourcePage:q.sourcePage,totalRewardDose:(Number(previous.totalRewardDose)||0)+actualDose,totalRewardCoins:(Number(previous.totalRewardCoins)||0)+actualCoins,...(correct&&!previous.firstCorrectAt?{firstCorrectAt:now}:{})};
   active.results[q.questionId]={correct,selected:request.optionId,correctOption:q.correctOption,correctText:q['option'+q.correctOption],explanation:q.explanation,sourceId:q.sourceId,sourceTitle:q.sourceTitle,sourcePage:q.sourcePage,dose:actualDose,coins:actualCoins,repeat:correct&&divisor===10,answeredAt:now};
   save.doping+=actualDose;save.coins+=actualCoins;
  }
  save.translation_progress=progress;
  // Results and rewards share one Students row write. Retried POSTs see the receipt above.
  if(JSON.stringify(toStoredSave(save)).length>MAX_SAVE_BYTES)throw apiError_('SAVE_TOO_LARGE','번역 풀이 기록의 저장 용량을 초과했습니다.');
  // Durable dirty marker precedes the canonical commit; a failed worker can retry.
  if(deferred&&request.action==='translationAnswer')PropertiesService.getScriptProperties().setProperty('TRANSLATION_REPORT_DIRTY','1');
  writeStudentProgress_(sheet,row,auth.studentId,save.name,save,revision+1,koreaTimestamp_(),v[at('createdAt')],v[at('pinSalt')],v[at('pinHash')]);
  if(request.action==='translationAnswer'&&!deferred)translationLog_(auth.studentId,progress.active,request.questionId,progress.questions);
  return {...studentResponse_(auth.studentId,save.name,save,revision+1,null,false),quiz:translationQuizView_(progress.active)};
 }finally{lock.releaseLock();}
}

const TRANSLATION_ATTEMPT_HEADERS=['recordId','studentId','stage','roundId','questionId','kind','selectedOption','correctOption','correct','repeat','rewardDose','rewardCoins','answeredAt','sourceId','sourcePage'];

// Included in Code_v14.gs. Do not install this file alongside the complete bundle.
const TRANSLATION_PROGRESS_HEADERS=['studentId','questionId','stage','kind','attempts','correctCount','firstCorrectAt','lastAnsweredAt','lastSelectedOption','lastCorrect','totalRewardDose','totalRewardCoins','rewardTotalsComplete','sourceId','sourcePage'];
const IMPORTANT_AUDIT_EVENTS=['ERROR','LOGIN_FAILED','ROOT_LOGIN','STAGE_RELEASE','STAGE_RELOCK','RESET_LEARNING_PROGRESS','REPORTING_MIGRATION'];

function reportTime_(value){
 if(!value)return '';
 const text=String(value);
 const d=value instanceof Date?value:new Date(/^\d{4}-\d{2}-\d{2} \d{2}:/.test(text)?text.replace(' ','T')+'+09:00':text);
 if(!Number.isFinite(d.getTime()))throw new Error('기록 시각을 확인하세요.');
 return new Date(d.getTime()+9*3600000).toISOString().slice(0,23)+'+09:00';
}
function progressRow_(studentId,questionId,p){
 return [studentId,questionId,Number(p.stage)||1,p.kind||'',Number(p.attempts)||0,Number(p.correctCount)||0,
  reportTime_(p.firstCorrectAt),reportTime_(p.lastAnsweredAt),p.lastSelectedOption||'',p.lastCorrect===true,
  Number(p.totalRewardDose)||0,Number(p.totalRewardCoins)||0,p.rewardTotalsComplete===true,p.sourceId||'',p.sourcePage||''];
}
function progressObject_(row){return Object.fromEntries(TRANSLATION_PROGRESS_HEADERS.map((h,i)=>[h,row[i]]));}

// Pure conversion: old receipts are deduplicated, Students counters win over incomplete logs.
// Missing historical reward evidence is explicitly marked; never estimate rewards from answers.
function buildTranslationProgress_(attempts,existing,students){
 const entries=new Map(),seen=new Set();
 const key=(sid,qid)=>JSON.stringify([canonicalStudentId_(sid),String(qid)]);
 const receipts=attempts.slice();
 // A previous API call may have committed Students but failed before logging.
 for(const student of students){const active=student.active;
  if(!active)continue;
  for(const [qid,r] of Object.entries(active.results||{})){const q=(active.questions||[]).find(q=>q.questionId===qid)||{};
   receipts.push([canonicalStudentId_(student.studentId)+':'+active.id+':'+qid,student.studentId,Number(q.stage)||1,active.id,qid,q.kind,r.selected,r.correctOption,r.correct,r.repeat,r.dose,r.coins,r.answeredAt,r.sourceId,r.sourcePage]);
  }
 }
 for(const r of receipts){
  if(!r[0])continue;
  const rid=String(r[0]);if(seen.has(rid))continue;seen.add(rid);
  const sid=canonicalStudentId_(r[1]),qid=String(r[4]);if(!sid||!qid)throw new Error('기존 풀이 기록의 학생·문제 ID가 없습니다.');
  const k=key(sid,qid),p=entries.get(k)||{studentId:sid,questionId:qid,attempts:0,correctCount:0,totalRewardDose:0,totalRewardCoins:0,rewardTotalsComplete:true};
  const time=reportTime_(r[12]),correct=[true,'TRUE','true',1].includes(r[8]);
  p.attempts++;p.correctCount+=correct?1:0;p.totalRewardDose+=Number(r[10])||0;p.totalRewardCoins+=Number(r[11])||0;
  if(correct&&(!p.firstCorrectAt||time<p.firstCorrectAt))p.firstCorrectAt=time;
  if(!p.lastAnsweredAt||time>=p.lastAnsweredAt)Object.assign(p,{stage:Number(r[2])||1,kind:r[5],lastAnsweredAt:time,lastSelectedOption:r[6],lastCorrect:correct,sourceId:r[13],sourcePage:r[14]});
  entries.set(k,p);
 }
 function merge(sid,qid,incoming){
  const k=key(sid,qid),old=entries.get(k),p={...incoming,studentId:canonicalStudentId_(sid),questionId:String(qid)};
  p.attempts=Number(p.attempts)||0;p.correctCount=Number(p.correctCount)||0;
  if(!old){entries.set(k,p);return;}
  const latest=reportTime_(p.lastAnsweredAt)>=reportTime_(old.lastAnsweredAt)?p:old;
  const count=Math.max(old.attempts,p.attempts),correct=Math.max(old.correctCount,p.correctCount);
  const complete=[old,p].find(x=>x.rewardTotalsComplete===true&&x.attempts===count&&x.correctCount===correct);
  const first=[old.firstCorrectAt,p.firstCorrectAt].filter(Boolean).map(reportTime_).sort()[0]||'';
  entries.set(k,{...old,...p,...latest,attempts:count,correctCount:correct,firstCorrectAt:first,
   totalRewardDose:complete?Number(complete.totalRewardDose)||0:Math.max(Number(old.totalRewardDose)||0,Number(p.totalRewardDose)||0),
   totalRewardCoins:complete?Number(complete.totalRewardCoins)||0:Math.max(Number(old.totalRewardCoins)||0,Number(p.totalRewardCoins)||0),rewardTotalsComplete:!!complete});
 }
 for(const r of existing){const p=progressObject_(r);if(p.studentId&&p.questionId)merge(p.studentId,p.questionId,p);}
 for(const student of students)for(const [qid,p] of Object.entries(student.questions||{}))merge(student.studentId,qid,p);
 return [...entries.values()].map(p=>progressRow_(p.studentId,p.questionId,p)).sort((a,b)=>String(b[7]).localeCompare(String(a[7]))||String(a[0]).localeCompare(String(b[0]))||String(a[1]).localeCompare(String(b[1])));
}

function reportingSheetRows_(sheet,headers){
 if(!sheet)return [];
 if(JSON.stringify(sheet.getRange(1,1,1,headers.length).getValues()[0])!==JSON.stringify(headers))throw new Error(sheet.getName()+'의 열 이름을 확인하세요.');
 return sheet.getLastRow()>1?sheet.getRange(2,1,sheet.getLastRow()-1,headers.length).getValues():[];
}

// Editor-only migration. No doPost action exposes this administrative operation.
function setupReportingV13(){
 requireRootConfiguration_();
 const lock=LockService.getScriptLock();lock.waitLock(30000);
 try{
  const students=studentsSheet_(),ss=students.getParent(),old=ss.getSheetByName('TranslationAttempts');
  const sheet=ensureSheet_(ss,'TranslationProgress',TRANSLATION_PROGRESS_HEADERS);
  const values=students.getLastRow()>1?students.getRange(2,1,students.getLastRow()-1,STUDENT_HEADERS.length).getValues():[];
  const saves=values.map(r=>r[0]?JSON.parse(String(r[6]||'{}')):null);
  const rows=buildTranslationProgress_(reportingSheetRows_(old,TRANSLATION_ATTEMPT_HEADERS),reportingSheetRows_(sheet,TRANSLATION_PROGRESS_HEADERS),
   values.map((r,i)=>({studentId:r[0],questions:saves[i]?.translation_progress?.questions||{},active:saves[i]?.translation_progress?.active})));
  const byStudent=new Map();for(const r of rows){if(!byStudent.has(r[0]))byStudent.set(r[0],{});byStudent.get(r[0])[r[1]]=progressObject_(r);}
  // Canonical counters and reward receipts remain in the same Students row as balances.
  values.forEach((r,i)=>{
   const save=saves[i],questions=byStudent.get(canonicalStudentId_(r[0]));if(!save||!questions)return;
   const next={...(save.translation_progress||{}),questions};
   if(JSON.stringify(next)===JSON.stringify(save.translation_progress))return;
   save.translation_progress=next;
   if(JSON.stringify(save).length>MAX_SAVE_BYTES)throw new Error('누적 기록이 저장 용량을 초과합니다.');
   students.getRange(i+2,7,1,3).setValues([[JSON.stringify(save),(Number(r[7])||0)+1,koreaTimestamp_()]]);
  });
  if(sheet.getLastRow()>1)sheet.getRange(2,1,sheet.getLastRow()-1,TRANSLATION_PROGRESS_HEADERS.length).clearContent();
  if(rows.length){sheet.getRange(2,1,rows.length,2).setNumberFormat('@');sheet.getRange(2,7,rows.length,2).setNumberFormat('@');sheet.getRange(2,1,rows.length,TRANSLATION_PROGRESS_HEADERS.length).setValues(rows);}
  SpreadsheetApp.flush();
  if(JSON.stringify(reportingSheetRows_(sheet,TRANSLATION_PROGRESS_HEADERS))!==JSON.stringify(rows))throw new Error('누적 기록 검증 실패. 기존 TranslationAttempts는 유지합니다.');
  // Delete old receipts only after the full aggregate has been written and read back.
  if(old)ss.deleteSheet(old);
  const audit=ensureSheet_(ss,AUDIT_SHEET,AUDIT_HEADERS);
  const important=reportingSheetRows_(audit,AUDIT_HEADERS).filter(r=>IMPORTANT_AUDIT_EVENTS.includes(String(r[1]))).map(r=>[reportTime_(r[0]),...r.slice(1)]).sort((a,b)=>String(b[0]).localeCompare(String(a[0])));
  if(audit.getLastRow()>1)audit.getRange(2,1,audit.getLastRow()-1,4).clearContent();
  if(important.length){audit.getRange(2,1,important.length,1).setNumberFormat('@');audit.getRange(2,1,important.length,4).setValues(important);}
  PropertiesService.getScriptProperties().setProperty('REPORTING_SCHEMA','13');
  audit_('REPORTING_MIGRATION',ROOT_STUDENT_ID,{rows:rows.length});
  return 'TranslationProgress '+rows.length+'행으로 전환 완료. 두 기록 탭은 최신순입니다.';
 }finally{lock.releaseLock();}
}

function translationLog_(studentId,active,questionId,questions){
 try{
  const sheet=requiredSheet_('TranslationProgress');
  if(JSON.stringify(sheet.getRange(1,1,1,TRANSLATION_PROGRESS_HEADERS.length).getValues()[0])!==JSON.stringify(TRANSLATION_PROGRESS_HEADERS))throw new Error('누적 기록 열 확인 필요');
  const p=questions[questionId];if(!p)return;
  const value=progressRow_(studentId,questionId,p),n=sheet.getLastRow()-1;
  const ids=n>0?sheet.getRange(2,1,n,2).getValues():[];
  const index=ids.findIndex(r=>canonicalStudentId_(r[0])===studentId&&String(r[1])===questionId);
  const row=index<0?sheet.getLastRow()+1:index+2;
  sheet.getRange(row,1,1,2).setNumberFormat('@');sheet.getRange(row,7,1,2).setNumberFormat('@');
  // Absolute counters, never increments: retries after a partial write are harmless.
  sheet.getRange(row,1,1,TRANSLATION_PROGRESS_HEADERS.length).setValues([value]);
  if(sheet.getLastRow()>2)sheet.getRange(2,1,sheet.getLastRow()-1,TRANSLATION_PROGRESS_HEADERS.length).sort([{column:8,ascending:false},{column:1,ascending:true},{column:2,ascending:true}]);
  SpreadsheetApp.flush();
 }catch(error){throw apiError_('TRANSLATION_LOG_PENDING','답안과 보상은 저장됐지만 누적 기록 동기화가 지연됐습니다. 같은 답안을 다시 제출해 주세요. 보상은 중복 지급되지 않습니다.');}
}

function audit_(event,studentId,detail){
 if(!IMPORTANT_AUDIT_EVENTS.includes(event))return;
 let lock,owned=false;
 try{
  lock=LockService.getScriptLock();owned=!lock.hasLock();if(owned&&!lock.tryLock(3000))return;
  const sheet=requiredSheet_(AUDIT_SHEET);
  sheet.insertRowBefore(2);sheet.getRange(2,1,1,4).setNumberFormat('@');
  sheet.getRange(2,1,1,4).setValues([[reportTime_(koreaTimestamp_()),event,safeCell_(studentId),JSON.stringify(detail||{})]]);
 }catch(ignored){}finally{if(owned&&lock&&lock.hasLock())lock.releaseLock();}
}

function auditRequestError_(request,error){
 // Never copy request bodies, PINs, tokens, full saves or exception stacks to Sheets.
 const action=String(request?.action||'').slice(0,40),code=String(error?.code||'INTERNAL_ERROR').slice(0,60);
 const login=['login','rootLogin'].includes(action);
 let sid='';if(login&&/^\d{6,8}$/.test(String(request?.studentId||'')))sid=String(request.studentId);
 if(action==='rootLogin')sid=ROOT_STUDENT_ID;
 try{
  const cache=CacheService.getScriptCache(),key='audit-error:'+action+':'+sid+':'+code;
  if(cache.get(key))return;cache.put(key,'1',60);
 }catch(ignored){}
 audit_(login?'LOGIN_FAILED':'ERROR',sid,{action,code});
}

function requireRootConfiguration_(){
 if(!/^\d{6,8}$/.test(ROOT_STUDENT_ID)||!ROOT_NAME.trim())throw new Error('프로젝트 설정의 스크립트 속성에 기존 ROOT_STUDENT_ID와 ROOT_NAME을 설정하세요. 기존 관리자 계정 값을 그대로 사용해야 합니다.');
}


// Run once from the editor. Re-running does not create duplicate triggers.
function setupTranslationPerformanceV14(){
 const props=PropertiesService.getScriptProperties();
 if(props.getProperty('REPORTING_SCHEMA')!=='13')setupReportingV13();
 const triggers=ScriptApp.getProjectTriggers().filter(t=>t.getHandlerFunction()==='syncTranslationProgress');
 if(!triggers.length)ScriptApp.newTrigger('syncTranslationProgress').timeBased().everyMinutes(1).create();
 triggers.slice(1).forEach(t=>ScriptApp.deleteTrigger(t));
 props.setProperty('TRANSLATION_ASYNC_REPORTING','14');
 props.setProperty('TRANSLATION_REPORT_DIRTY','1');
 clearTranslationQuestionCache();
 syncTranslationProgress();
 return 'v14 설정 완료: 판정·보상은 즉시 저장, 누적 집계는 1분 주기로 반영됩니다.';
}
function syncTranslationProgress(){
 const props=PropertiesService.getScriptProperties();
 if(props.getProperty('TRANSLATION_REPORT_DIRTY')!=='1')return;
 const lock=LockService.getScriptLock();if(!lock.tryLock(1000))return;
 try{
  // All writers use this same lock: clearing the marker cannot lose a new answer.
  const students=studentsSheet_(),n=students.getLastRow()-1;
  const values=n>0?students.getRange(2,1,n,STUDENT_HEADERS.length).getValues():[];
  const rows=[];
  values.forEach(v=>{
   if(!v[0])return;
   // Fail closed on corrupt JSON; leave the marker for retry, do not erase reports.
   const save=JSON.parse(v[STUDENT_HEADERS.indexOf('saveJson')]||'{}');
   Object.entries(save.translation_progress?.questions||{}).forEach(([id,p])=>rows.push(progressRow_(canonicalStudentId_(v[0]),id,p)));
  });
  rows.sort((a,b)=>String(b[7]).localeCompare(String(a[7]))||String(a[0]).localeCompare(String(b[0]))||String(a[1]).localeCompare(String(b[1])));
  const sheet=requiredSheet_('TranslationProgress');
  if(JSON.stringify(sheet.getRange(1,1,1,TRANSLATION_PROGRESS_HEADERS.length).getValues()[0])!==JSON.stringify(TRANSLATION_PROGRESS_HEADERS))throw new Error('TranslationProgress 열 확인 필요');
  const oldCount=sheet.getLastRow()-1;
  if(rows.length){
   if(sheet.getMaxRows()<rows.length+1)sheet.insertRowsAfter(sheet.getMaxRows(),rows.length+1-sheet.getMaxRows());
   sheet.getRange(2,1,rows.length,2).setNumberFormat('@');sheet.getRange(2,7,rows.length,2).setNumberFormat('@');
   sheet.getRange(2,1,rows.length,TRANSLATION_PROGRESS_HEADERS.length).setValues(rows);
  }
  if(oldCount>rows.length)sheet.getRange(rows.length+2,1,oldCount-rows.length,TRANSLATION_PROGRESS_HEADERS.length).clearContent();
  SpreadsheetApp.flush();
  props.deleteProperty('TRANSLATION_REPORT_DIRTY');
 }finally{lock.releaseLock();}
}

// Included in Code_v20.gs. Do not install alongside the complete bundle.
const QUIZ_CONTENT_HEADERS=['questionId','question','optionA','optionB','optionC','optionD','correctOption','explanation','source','active','rewardDose','rewardCoins','legacyQuestId','title','dopant'];
const EXPERIMENT_CONTENT_HEADERS=['experimentId','title','type','stepId','stepTitle','detail','hint','correctOrder','active','rewardDose','rewardCoins','source'];
function learningSheet_(name){
 const id=PropertiesService.getScriptProperties().getProperty('CONTENT_SPREADSHEET_ID');
 if(!id)throw apiError_('CONTENT_SETUP','관리자가 Code_v20.gs의 setupLearningContentV16을 실행해주세요.');
 const sheet=SpreadsheetApp.openById(id).getSheetByName(name);
 if(!sheet)throw apiError_('CONTENT_SHEET',name+' 탭이 없습니다.');return sheet;
}
function learningRows_(name,headers){
 const sheet=learningSheet_(name),width=Math.max(headers.length,sheet.getLastColumn());
 const actual=sheet.getRange(1,1,1,width).getValues()[0].map(String),indices=headers.map(h=>actual.indexOf(h));
 if(indices.some(i=>i<0)||headers.some(h=>actual.filter(x=>x===h).length!==1))throw apiError_('CONTENT_SCHEMA',name+' 열 이름을 확인하세요.');
 const n=sheet.getLastRow()-1;return n<1?[]:sheet.getRange(2,1,n,width).getValues().filter(r=>r.some(v=>v!=='')).map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[indices[i]]])));
}
function learningCached_(key,load){
 key='learning-v16:'+PropertiesService.getScriptProperties().getProperty('CONTENT_SPREADSHEET_ID')+':'+key;
 try{const raw=CacheService.getScriptCache().get(key);if(raw)return JSON.parse(raw);}catch(ignored){}
 const value=load(),raw=JSON.stringify(value);try{if(Utilities.newBlob(raw).getBytes().length<95000)CacheService.getScriptCache().put(key,raw,60);}catch(ignored){}return value;
}
function learningQuizBank_(stage){
 return learningCached_('quiz-'+stage,()=>{
 const name=stage===0?'Tutorial':'Quiz_'+String(stage).padStart(2,'0'),seen=new Set();
 return learningRows_(name,QUIZ_CONTENT_HEADERS).filter(q=>stageReleasedValue_(q.active)).map(q=>{
  const options=['A','B','C','D'].filter(k=>String(q['option'+k]||'').trim()).map(id=>({id,text:String(q['option'+id])}));
  const id=String(q.questionId).trim(),correct=String(q.correctOption).trim().toUpperCase();
  if(!id||seen.has(id)||!String(q.question).trim()||options.length<2||!options.some(o=>o.id===correct)||!Number.isFinite(Number(q.rewardDose))||Number(q.rewardDose)<0||!Number.isInteger(Number(q.rewardCoins))||Number(q.rewardCoins)<0)throw apiError_('CONTENT_QUESTION',name+' 문제·보기·정답·보상을 확인하세요.');
  seen.add(id);return {...q,questionId:id,correctOption:correct,options,dose:Number(q.rewardDose),coins:Number(q.rewardCoins)};
 });});
}
function learningExperiment_(stage){
 return learningCached_('experiment-'+stage,()=>{
 const rows=learningRows_('Experiment_'+String(stage).padStart(2,'0'),EXPERIMENT_CONTENT_HEADERS).filter(q=>stageReleasedValue_(q.active));
 if(stage!==7||!rows.length)throw apiError_('CONTENT_EMPTY','아직 준비된 실험 과제가 없습니다.');
 const ids=['substrate','oxide','gate','implant','anneal','contacts'];
 if(rows.length!==6||new Set(rows.map(r=>r.experimentId)).size!==1||rows.some(r=>r.type!=='sequence')||new Set(rows.map(r=>r.stepId)).size!==6||rows.some(r=>!ids.includes(r.stepId))||rows.some(r=>!Number.isInteger(Number(r.correctOrder))||Number(r.correctOrder)<1||Number(r.correctOrder)>6)||new Set(rows.map(r=>Number(r.correctOrder))).size!==6)throw apiError_('CONTENT_EXPERIMENT','Experiment_07은 기존 6개 stepId와 중복 없는 correctOrder 1~6이 필요합니다.');
 return rows.sort((a,b)=>Number(a.correctOrder)-Number(b.correctOrder));
 });
}
function setupLearningContentV16(){
 // Validate access and headers before changing the configured source permanently.
 const props=PropertiesService.getScriptProperties(),old=props.getProperty('CONTENT_SPREADSHEET_ID');
 if(!old)throw apiError_('CONTENT_SETUP','스크립트 속성 CONTENT_SPREADSHEET_ID에 학습 콘텐츠 시트 ID를 설정하세요.');
 try{
  learningRows_('Tutorial',QUIZ_CONTENT_HEADERS);
  for(let n=1;n<=12;n++){
   const suffix=String(n).padStart(2,'0');learningRows_('Quiz_'+suffix,QUIZ_CONTENT_HEADERS);learningRows_('Translation_'+suffix,TRANSLATION_HEADERS);learningRows_('Experiment_'+suffix,EXPERIMENT_CONTENT_HEADERS);
  }
  clearLearningContentCache();
  translationBank_();for(let n=0;n<=12;n++)learningQuizBank_(n);learningExperiment_(7);
 }catch(e){if(old)props.setProperty('CONTENT_SPREADSHEET_ID',old);else props.deleteProperty('CONTENT_SPREADSHEET_ID');throw e;}
 return '학습 콘텐츠 연결 완료. 운영 데이터 연결은 유지했습니다. 기존 웹 앱을 새 버전으로 배포하세요.';
}
function clearLearningContentCache(){
 const id=PropertiesService.getScriptProperties().getProperty('CONTENT_SPREADSHEET_ID'),cache=CacheService.getScriptCache();
 for(let n=0;n<=12;n++){cache.remove('learning-v16:'+id+':quiz-'+n);cache.remove('learning-v16:'+id+':experiment-'+n);}clearTranslationQuestionCache();
}
function learningContentAction_(request){
 const auth=verifyToken_(request.token),cache=CacheService.getScriptCache();
 if(request.action==='learningAnswer'){
  const raw=cache.get('learning-session:'+String(request.sessionId));
  if(!raw)throw apiError_('CONTENT_EXPIRED','문제 준비 시간이 만료됐습니다. 창을 다시 열어주세요.');
  const session=JSON.parse(raw);if(session.studentId!==auth.studentId)throw apiError_('FORBIDDEN','다른 학생의 문제입니다.');
  if(session.kind==='quiz'){
   const q=session.question;if(!q.options.some(o=>o.id===request.optionId))throw apiError_('CONTENT_ANSWER','보기를 선택해주세요.');
   const correct=request.optionId===q.correctOption;
   return {ok:true,content:{correct,explanation:correct?String(q.explanation):'다시 생각해 보세요.',dose:q.dose,coins:q.coins}};
  }
  const rows=session.steps,order=request.order;
  if(!Array.isArray(order)||order.length!==rows.length||new Set(order).size!==rows.length||order.some(id=>!rows.some(r=>r.stepId===id)))throw apiError_('CONTENT_ANSWER','공정 6개를 한 번씩 배치해주세요.');
  const index=rows.findIndex((r,i)=>r.stepId!==order[i]);
  return {ok:true,content:{correct:index<0,index,message:index<0?'공정 순서 완성! MOSFET 동작을 확인해 보세요.':`${index+1}번째 공정을 다시 살펴보세요. ${rows[index].hint}`}};
 }
 const stage=Number(request.stage);if(!Number.isInteger(stage)||stage<0||stage>12)throw apiError_('CONTENT_STAGE','올바른 스테이지 번호가 필요합니다.');
 const sheet=studentsSheet_(),row=findStudentRow_(sheet,auth.studentId);if(!row)throw apiError_('ACCOUNT_NOT_FOUND','계정을 찾지 못했습니다.');
 const v=sheet.getRange(row,1,1,STUDENT_HEADERS.length).getValues()[0],save=parseStoredSave_(v[6],auth.studentId,String(v[1]));
 if(save.area!==(stage===0?'village':'stage-'+stage))throw apiError_('CONTENT_STAGE','해당 스테이지에서 문제를 열어주세요.');
 if(request.kind==='tutorial'){
  if(stage!==0)throw apiError_('CONTENT_STAGE','튜토리얼은 마을에서 열어주세요.');
  const bank=learningQuizBank_(0);
  const selected=[0,1,2].map(questId=>{
   const candidates=bank.filter(q=>Number(q.legacyQuestId)===questId);
   if(!candidates.length)throw apiError_('CONTENT_EMPTY','튜토리얼 '+(questId+1)+'번 활성 문제가 없습니다.');
   return {questId,q:candidates[Math.floor(Math.random()*candidates.length)]};
  });
  const questions=selected.map(({questId,q})=>{
   const sessionId=Utilities.getUuid();
   cache.put('learning-session:'+sessionId,JSON.stringify({studentId:auth.studentId,kind:'quiz',question:q}),1800);
   return {questId,sessionId,questionId:q.questionId,title:String(q.title),question:String(q.question),options:q.options};
  });
  return {ok:true,content:{questions}};
 }
 const sessionId=Utilities.getUuid();let session,content;
 if(request.kind==='experiment'){
  const steps=learningExperiment_(stage);session={studentId:auth.studentId,kind:'experiment',steps};
  content={sessionId,title:String(steps[0].title),steps:translationShuffle_(steps.map(r=>({id:r.stepId,title:String(r.stepTitle),detail:String(r.detail)})))};
 }else{
  const questId=Number(request.questId);
  const bank=learningQuizBank_(stage).filter(q=>stage!==0||Number(q.legacyQuestId)===questId);
  if(!bank.length)throw apiError_('CONTENT_EMPTY','활성 문제가 없습니다. 관리자가 콘텐츠 시트를 확인해야 합니다.');
  const q=bank[Math.floor(Math.random()*bank.length)];session={studentId:auth.studentId,kind:'quiz',question:q};
  content={sessionId,questionId:q.questionId,title:String(q.title),question:String(q.question),options:q.options,dose:q.dose,coins:q.coins};
 }
 cache.put('learning-session:'+sessionId,JSON.stringify(session),1800);return {ok:true,content};
}

// Stable source IDs distinguish rewards for multiple PDFs in one stage.
const firstBookSource=stage=>stage===0?'SE01-CRYSTAL-2026':`STAGE-${stage+1}-BOOK-1`;
function bookSources(save){
 if(Array.isArray(save?.readBookSources))return [...new Set(save.readBookSources.filter(id=>typeof id==='string'&&/^[A-Za-z0-9_-]{1,80}$/.test(id)))].slice(0,200);
 return (Array.isArray(save?.readBooks)?save.readBooks:[]).filter(n=>Number.isInteger(n)&&n>=0&&n<12).map(firstBookSource);
}
const hasReadSource=(save,stage,sourceId=firstBookSource(stage))=>bookSources(save).includes(sourceId);

// Included in the complete Code_v20.gs bundle; do not install twice.
const QUESTION_HEADERS=['questionId','studentId','studentName','stage','subject','question','answer','answeredBy','status','createdAt','answeredAt'];

function setupQuestionsV19(){
 const lock=LockService.getScriptLock();lock.waitLock(10000);
 try{
  const props=PropertiesService.getScriptProperties();let id=props.getProperty('QA_SPREADSHEET_ID');
  if(id&&[props.getProperty('SPREADSHEET_ID'),props.getProperty('CONTENT_SPREADSHEET_ID')].includes(id))throw new Error('질문답변 파일은 운영·학습 콘텐츠 파일과 분리해주세요.');
  const ss=id?SpreadsheetApp.openById(id):SpreadsheetApp.create('도핑 히어로즈_질문답변');
  if(!id){id=ss.getId();props.setProperty('QA_SPREADSHEET_ID',id);}
  ss.setSpreadsheetTimeZone('Asia/Seoul');
  let sheet=ss.getSheetByName('Questions');
  if(!sheet){const empty=ss.getSheets().find(s=>s.getLastRow()===0);sheet=empty?empty.setName('Questions'):ss.insertSheet('Questions');}
  if(sheet.getLastRow()===0)sheet.getRange(1,1,1,QUESTION_HEADERS.length).setValues([QUESTION_HEADERS]);
  questionTable_(sheet); // Validate before editing an existing file.
  sheet.setFrozenRows(1);sheet.setColumnWidths(1,11,110);sheet.setColumnWidth(5,180);sheet.setColumnWidth(6,300);sheet.setColumnWidth(7,300);
  sheet.getRange(1,1,sheet.getMaxRows(),11).setNumberFormat('@');
  sheet.getRange(2,9,Math.max(1,sheet.getMaxRows()-1),1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['답변대기','작성중','답변완료'],true).setAllowInvalid(false).build());
  if(!ss.getSheetByName('사용 안내')){
   const guide=ss.insertSheet('사용 안내');
   const rows=[['항목','사용 방법'],['조교 편집','answer에 답변, answeredBy에 표시할 이름을 작성한 뒤 status를 답변완료로 변경합니다.'],['비공개 초안','답변대기·작성중 상태의 answer는 학생에게 보이지 않습니다.'],['학생 조회','학생은 본인의 질문과 게시된 답변만 게임에서 확인합니다.'],['자동 기록','questionId, studentId, studentName, stage, subject, question, createdAt, answeredAt은 자동 관리합니다.'],['시간','createdAt과 answeredAt은 한국(서울) 시간입니다.'],['공유','이 파일만 조교에게 편집자로 공유하세요. 운영 데이터·학습 콘텐츠·Apps Script 프로젝트는 공유할 필요 없습니다.'],['순서','새 질문은 마지막 행에 추가되고 게임에서는 최신순으로 표시됩니다. 헤더 이름과 questionId는 변경하지 마세요.'],['수정·철회','게시된 답변을 고치면 다시 불러올 때 반영됩니다. status를 작성중으로 바꾸면 답변이 숨겨집니다.']];
   guide.getRange(1,1,rows.length,2).setValues(rows);guide.setColumnWidth(1,110);guide.setColumnWidth(2,650);guide.getRange(1,1,rows.length,2).setWrap(true);
  }
  if(!ScriptApp.getProjectTriggers().some(t=>t.getHandlerFunction()==='questionsEditedV19'&&t.getTriggerSourceId()===id))ScriptApp.newTrigger('questionsEditedV19').forSpreadsheet(id).onEdit().create();
  const url=ss.getUrl();console.log('질문답변 시트: '+url);return url;
 }finally{lock.releaseLock();}
}

function questionsSheet_(){
 const id=PropertiesService.getScriptProperties().getProperty('QA_SPREADSHEET_ID');
 if(!id)throw apiError_('QA_SETUP','질문 기능 준비 중입니다. 관리자가 setupQuestionsV19를 실행해주세요.');
 const sheet=SpreadsheetApp.openById(id).getSheetByName('Questions');
 if(!sheet)throw apiError_('QA_SETUP','질문답변 시트의 Questions 탭을 확인해주세요.');return sheet;
}
function questionTable_(sheet){
 const width=sheet.getLastColumn(),head=width?sheet.getRange(1,1,1,width).getValues()[0].map(String):[];
 if(QUESTION_HEADERS.some(k=>head.filter(h=>h===k).length!==1))throw apiError_('QA_HEADERS','Questions 열 이름을 확인해주세요.');
 const values=sheet.getLastRow()>1?sheet.getRange(2,1,sheet.getLastRow()-1,width).getValues():[];
 return {head,rows:values.map(row=>Object.fromEntries(head.map((key,i)=>[key,row[i]])))};
}
function questionPublic_(q){
 const published=String(q.status).trim()==='답변완료'&&String(q.answer||'').trim().length>0;
 return {id:String(q.questionId),stage:Number(q.stage)||0,subject:String(q.subject||''),question:String(q.question||''),status:published?'답변완료':'답변대기',createdAt:String(q.createdAt||''),answer:published?String(q.answer):'',answeredBy:published?String(q.answeredBy||'교수·조교'):'',answeredAt:published?String(q.answeredAt||''):''};
}
function questionText_(value,max,label){
 if(typeof value!=='string'||!value.trim()||value.trim().length>max)throw apiError_('QA_INPUT',label+'을 확인해주세요. (최대 '+max+'자)');return value.trim();
}
// Prefix text formulas before writing user input to Google Sheets.
function questionCell_(value){return typeof value==='string'&&/^[=+@-]/.test(value)?"'"+value:value;}
function questionsAction_(request){
 const auth=verifyToken_(request.token);
 if(request.action==='qaList'){
  const table=questionTable_(questionsSheet_()),cursor=typeof request.cursor==='string'?request.cursor:'';
  const key=q=>String(q.createdAt||'')+'|'+String(q.questionId);
  const own=table.rows.filter(q=>String(q.studentId)===auth.studentId&&q.questionId).sort((a,b)=>key(b).localeCompare(key(a)));
  const remaining=cursor?own.filter(q=>key(q)<cursor):own,page=remaining.slice(0,30);
  return {ok:true,qa:{questions:page.map(questionPublic_),nextCursor:remaining.length>30?key(page[page.length-1]):''}};
 }
 if(request.action!=='qaCreate')throw apiError_('UNKNOWN_ACTION','지원하지 않는 질문 요청입니다.');
 const id=String(request.requestId||'');
 if(!/^[a-zA-Z0-9_-]{20,80}$/.test(id))throw apiError_('QA_INPUT','질문 요청 번호를 확인해주세요.');
 const subject=questionText_(request.subject,80,'제목'),question=questionText_(request.question,2000,'질문 내용'),stage=Number(request.stage);
 if(!Number.isInteger(stage)||stage<0||stage>12)throw apiError_('QA_INPUT','질문 스테이지를 확인해주세요.');
 const lock=LockService.getScriptLock();lock.waitLock(10000);
 try{
  const sheet=questionsSheet_(),table=questionTable_(sheet),existing=table.rows.find(q=>String(q.questionId)===id);
  if(existing){if(String(existing.studentId)!==auth.studentId)throw apiError_('QA_REQUEST','질문 요청 번호를 다시 생성해주세요.');return {ok:true,qa:{questions:[questionPublic_(existing)],nextCursor:''}};}
  const students=studentsSheet_(),row=findStudentRow_(students,auth.studentId);
  if(!row)throw apiError_('ACCOUNT_NOT_FOUND','등록된 계정을 확인해주세요.');
  const name=String(students.getRange(row,STUDENT_HEADERS.indexOf('name')+1).getValue());
  const q={questionId:id,studentId:auth.studentId,studentName:name,stage,subject,question,answer:'',answeredBy:'',status:'답변대기',createdAt:koreaTimestamp_(),answeredAt:''};
  // Append without shifting a row that a teaching assistant may be editing.
  const next=sheet.getLastRow()+1;if(next>sheet.getMaxRows())sheet.insertRowsAfter(sheet.getMaxRows(),1);
  sheet.getRange(next,1,1,table.head.length).setNumberFormat('@').setValues([table.head.map(k=>questionCell_(q[k]??''))]);
  return {ok:true,qa:{questions:[questionPublic_(q)],nextCursor:''}};
 }finally{lock.releaseLock();}
}
function questionsEditedV19(e){
 if(!e||!e.range)return;
 const id=PropertiesService.getScriptProperties().getProperty('QA_SPREADSHEET_ID'),sheet=e.range.getSheet();
 if(sheet.getParent().getId()!==id||sheet.getName()!=='Questions')return;
 const lock=LockService.getScriptLock();lock.waitLock(10000);
 try{
  const table=questionTable_(sheet),startCol=e.range.getColumn(),endCol=e.range.getLastColumn();
  if(!['answer','answeredBy','status'].some(k=>{const c=table.head.indexOf(k)+1;return c>=startCol&&c<=endCol;}))return;
  const start=Math.max(2,e.range.getRow()),end=Math.min(e.range.getLastRow(),sheet.getLastRow());
  for(let row=start;row<=end;row++){
   const q=table.rows[row-2];if(!q?.questionId)continue;
   const timestamp=String(q.status).trim()==='답변완료'&&String(q.answer||'').trim()?koreaTimestamp_():'';
   sheet.getRange(row,table.head.indexOf('answeredAt')+1).setNumberFormat('@').setValue(timestamp);
  }
 }finally{lock.releaseLock();}
}
