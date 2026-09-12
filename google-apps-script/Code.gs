/**
 * Doping Heroes cloud save API
 *
 * Bound this script to a private Google Sheet, add a temporary Script Property
 * named ROOT_PIN, and run setupDopingHeroes() once before deploying as a web app.
 */

const API_VERSION = 6;
const RELEASE_LABEL = 'puzzle-stage-6';
const ROOT_STUDENT_ID = '099746';
const ROOT_NAME = '공수교대';
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
      stages: readStages_(),
      serverTime: koreaTimestamp_()
    });
  } catch (error) {
    return errorOutput_(error);
  }
}

function doPost(e) {
  try {
    const request = parseRequest_(e);
    switch (request.action) {
      case 'checkStudent': return jsonOutput_(checkStudent_(request));
      case 'register': return jsonOutput_(registerStudent_(request));
      case 'login': return jsonOutput_(loginStudent_(request));
      case 'rootLogin': return jsonOutput_(loginRoot_(request));
      case 'load': return jsonOutput_(loadStudent_(request));
      case 'save': return jsonOutput_(saveStudent_(request));
      case 'stageState': return jsonOutput_({ok: true, stages: readStages_(), serverTime: koreaTimestamp_()});
      case 'setStage': return jsonOutput_(setStage_(request));
      default: throw apiError_('UNKNOWN_ACTION', '지원하지 않는 요청입니다.');
    }
  } catch (error) {
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
          save: toStoredSave(parseStoredSave_(values[STUDENT_HEADERS.indexOf("saveJson")], auth.studentId, String(values[1]))),
          revision: currentRevision
        },
        stages: readStages_(),
        serverTime: koreaTimestamp_()
      };
    }

    const name = auth.role === 'root' ? ROOT_NAME : requireName_(request.save && request.save.name || values[1]);
    const save = normalizeSave_(request.save, auth.studentId, name);
    const revision = currentRevision + 1;
    const now = koreaTimestamp_();
    writeStudentProgress_(sheet, row, auth.studentId, name, save, revision, now, values[STUDENT_HEADERS.indexOf("createdAt")], values[STUDENT_HEADERS.indexOf("pinSalt")], values[STUDENT_HEADERS.indexOf("pinHash")]);
    audit_('SAVE', auth.studentId, {revision: revision});
    return studentResponse_(auth.studentId, name, save, revision, null);
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
    const row = index + 2;
    sheet.getRange(row, 1, 1, 4).setValues([[
      index + 1,
      request.released,
      koreaTimestamp_(),
      ROOT_STUDENT_ID
    ]]);
    audit_(request.released ? 'STAGE_RELEASE' : 'STAGE_RELOCK', ROOT_STUDENT_ID, {stage: index + 1});
    SpreadsheetApp.flush();
    return {ok: true, stages: readStages_(), serverTime: koreaTimestamp_()};
  } finally {
    lock.releaseLock();
  }
}

function studentResponse_(studentId, name, save, revision, token) {
  const result = {
    ok: true,
    student: {studentId: studentId, name: name, save: toStoredSave(save), revision: revision},
    stages: readStages_(),
    serverTime: koreaTimestamp_()
  };
  if (token) result.token = token;
  return result;
}

function normalizeSave_(input, studentId, name) {
  const source = normalizeItemSave(fromStoredSave(input && typeof input === 'object' ? input : {}));
  const save = {
    version: 3,
    item_schema: 2,
    studentId: studentId,
    name: name,
    character: source.character && typeof source.character === 'object' ? jsonClone_(source.character) : null,
    completed: intList_(source.completed, 0, 14, 15),
    readBooks: intList_(source.readBooks, 0, 11, 12),
    puzzle_completed: puzzleIds(source),
    doping: finiteNumber_(source.doping, 1e13, 1e21, 1e13),
    type: source.type === 'p' ? 'p' : 'n',
    coins: Math.floor(finiteNumber_(source.coins, 0, 1000000000, 0)),
    quantities: normalizeQuantities_(source.quantities),
    purchased: stringList_(source.purchased, 200, 80),
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

function readStages_() {
  const values = stagesSheet_().getRange(2, 1, 12, 2).getValues();
  return values.map(function (row, index) {
    return Number(row[0]) === index + 1 && row[1] === true;
  });
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
  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getDisplayValues();
  for (let index = 0; index < values.length; index += 1) {
    if (canonicalStudentId_(values[index][0]) === studentId) return {row: index + 2, name: String(values[index][1] || '')};
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
  const studentId = String(value || '').trim();
  if (!/^\d{8}$/.test(studentId) && studentId !== ROOT_STUDENT_ID) {
    throw apiError_('INVALID_STUDENT_ID', '학번은 숫자 8자리여야 합니다.');
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
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#d9ead3');
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
  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getDisplayValues();
  for (let index = 0; index < values.length; index += 1) {
    if (canonicalStudentId_(values[index][0]) === studentId) return index + 2;
  }
  return 0;
}

function canonicalStudentId_(value) {
  const text = String(value || '').trim().replace(/^'/, '');
  if (text === ROOT_STUDENT_ID || text === String(Number(ROOT_STUDENT_ID))) return ROOT_STUDENT_ID;
  return /^\d{1,8}$/.test(text) ? text.padStart(8, '0') : text;
}

function audit_(event, studentId, detail) {
  try {
    requiredSheet_(AUDIT_SHEET).appendRow([
      koreaTimestamp_(), event, studentId, JSON.stringify(detail || {})
    ]);
  } catch (ignored) {}
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
const catalog = [{"id":"C01","legacyId":"tshirt","quest":-1},{"id":"C02","legacyId":"longsleeve","quest":-1},{"id":"C03","legacyId":"cardigan","quest":-1},{"id":"C04","legacyId":"aurora-shirt","quest":-2},{"id":"C05","legacyId":"forest-shirt","quest":-2},{"id":"C06","legacyId":"ember-cardigan","quest":-2},{"id":"C07","legacyId":"gold-tshirt","quest":-2},{"id":"C08","legacyId":"lab-coat","quest":-2},{"id":"C09","legacyId":"cleanroom-suit","quest":-2},{"id":"C10","legacyId":"crystal-armor","quest":-2},{"id":"F01","legacyId":"basic","quest":-1},{"id":"F02","legacyId":"sandals","quest":-2},{"id":"F03","legacyId":"moss-boots","quest":-2},{"id":"F04","legacyId":"boots","quest":0},{"id":"F05","legacyId":"snowboots","quest":-2},{"id":"F06","legacyId":"violet-boots","quest":-2},{"id":"F07","legacyId":"crystal-boots","quest":-2},{"id":"F08","legacyId":"lab-shoes","quest":-2},{"id":"F09","legacyId":"cleanroom-shoes","quest":-2},{"id":"F10","legacyId":"electron-boots","quest":-2},{"id":"H01","legacyId":"cap","quest":1},{"id":"H02","legacyId":"trailcap","quest":-2},{"id":"H03","legacyId":"sun-cap","quest":-2},{"id":"H04","legacyId":"miner-helmet","quest":-2},{"id":"H05","legacyId":"forest-cap","quest":-2},{"id":"H06","legacyId":"crystal-cap","quest":-2},{"id":"H07","legacyId":"moon-cap","quest":-2},{"id":"H08","legacyId":"process-hat","quest":-2},{"id":"H09","legacyId":"cleanroom-hood","quest":-2},{"id":"H10","legacyId":"silicon-crown","quest":-2},{"id":"W01","legacyId":"sword","quest":2},{"id":"W02","legacyId":"crystal-sword","quest":-2},{"id":"W03","legacyId":"sun-sword","quest":-2},{"id":"W04","legacyId":"ember-sword","quest":-2},{"id":"W05","legacyId":"lattice-hammer","quest":-2},{"id":"W06","legacyId":"donor-staff","quest":-2},{"id":"W07","legacyId":"acceptor-staff","quest":-2},{"id":"W08","legacyId":"semiconductor-pen","quest":-2},{"id":"W09","legacyId":"wafer-shield","quest":-2},{"id":"W10","legacyId":"photon-bow","quest":-2},{"id":"A01","legacyId":"glasses","quest":-1},{"id":"A02","legacyId":"headband","quest":-1},{"id":"A03","legacyId":"grounding-bracelet","quest":-2},{"id":"A04","legacyId":"goggles","quest":-2},{"id":"A05","legacyId":"germanium-bracelet","quest":-2},{"id":"A06","legacyId":"chip-ring","quest":-2},{"id":"A07","legacyId":"doping-backpack","quest":-2},{"id":"A08","legacyId":"research-badge","quest":-2},{"id":"A09","legacyId":"wafer-necklace","quest":-2},{"id":"A10","legacyId":"crystal-earrings","quest":-2},{"id":"T01","legacyId":"gate-key","quest":2},{"id":"T02","legacyId":"lecture-notes","quest":-3},{"id":"T03","legacyId":"dopant","quest":-2},{"id":"T04","legacyId":"donor-ampoule","quest":-2},{"id":"T05","legacyId":"acceptor-ampoule","quest":-2},{"id":"T06","legacyId":"wafer-fragment","quest":-2},{"id":"T07","legacyId":"silicon-crystal","quest":-2},{"id":"T08","legacyId":"repair-kit","quest":-2},{"id":"T09","legacyId":"gold-tweezers","quest":-2},{"id":"T10","legacyId":"process-blueprint","quest":-2}];
const catalogItem = id=>catalog.find(item=>item.id===id||item.legacyId===id);
const migrateItemId = id=>catalogItem({'ember-boots':'lab-shoes','moon-sword':'semiconductor-pen'}[id]??id)?.id??id;
const isRootAccount = account => account?.name?.trim() === '공수교대' && account?.studentId === '099746';
const ITEM_SCHEMA = 2;
const oldCodes = {"F02":"F04","F03":"F02","F04":"F05","F05":"F03","H03":"H05","H04":"H03","H05":"H04"};
function normalizeItemSave(save){
 if(!save||typeof save!=='object')return save;
 const convert=id=>migrateItemId(save.item_schema===ITEM_SCHEMA?id:(oldCodes[id]??id));
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
const stageQuestIds = [3,11,4,5,6,7,8,9,12,13,10,14];
function completionIds(save){
 const list=(value,max)=>[...new Set((Array.isArray(value)?value:[]).filter(n=>Number.isInteger(n)&&n>=0&&n<=max))].sort((a,b)=>a-b);
 const legacy=list(save?.completed,14);
 const tutorial=list(save?.tutorial_completed??legacy.filter(n=>n<3),2);
 const stages=list(save?.stage_completed??legacy.filter(n=>n>=3).map(n=>n-3),11);
 return [...tutorial,...stages.map(n=>save?.completion_schema===2?stageQuestIds[n]:n+3)].sort((a,b)=>a-b);
}
function puzzleIds(save){
 const values=Array.isArray(save?.puzzle_completed)?save.puzzle_completed:save?.fetPuzzleCompleted===true?[10]:[];
 return [...new Set(values.filter(n=>Number.isInteger(n)&&n>=0&&n<12))].sort((a,b)=>a-b);
}
function fromStoredSave(save){
 if(!save||typeof save!=='object')return save;
 const {tutorial_completed,stage_completed,fetPuzzleCompleted,completion_schema,...rest}=save;
 return {...rest,completed:completionIds(save),puzzle_completed:puzzleIds(save)};
}
function toStoredSave(save){
 if(!save||typeof save!=='object')return save;
 const ids=completionIds(save);
 const {completed,tutorial_completed,stage_completed,fetPuzzleCompleted,completion_schema,...rest}=save;
 return {...rest,completion_schema:2,tutorial_completed:ids.filter(n=>n<3),stage_completed:stageQuestIds.map((id,i)=>ids.includes(id)?i:-1).filter(i=>i>=0),puzzle_completed:puzzleIds(save)};
}
// END GENERATED ITEM RULES
