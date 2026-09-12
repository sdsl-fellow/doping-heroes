/**
 * Doping Heroes cloud save API
 *
 * Bound this script to a private Google Sheet, add a temporary Script Property
 * named ROOT_PIN, and run setupDopingHeroes() once before deploying as a web app.
 */

const API_VERSION = 2;
const RELEASE_LABEL = 'roster-rootfix-2';
const ROOT_STUDENT_ID = '099746';
const ROOT_NAME = '공수교대';
const ROSTER_SHEET = 'Roster';
const STUDENTS_SHEET = 'Students';
const STAGES_SHEET = 'StageReleases';
const AUDIT_SHEET = 'AuditLog';
const TOKEN_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_SAVE_BYTES = 100000;

const STUDENT_HEADERS = [
  'studentId', 'name', 'completedStages', 'doping', 'type', 'coins',
  'items', 'saveJson', 'revision', 'updatedAt', 'createdAt', 'pinSalt', 'pinHash'
];
const ROSTER_HEADERS = ['studentId', 'name'];
const STAGE_HEADERS = ['stageNumber', 'released', 'updatedAt', 'updatedBy'];
const AUDIT_HEADERS = ['timestamp', 'event', 'studentId', 'detail'];

function setupDopingHeroes() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) throw new Error('Google Sheet에서 확장 프로그램 → Apps Script로 연 뒤 실행하세요.');

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
    const now = new Date().toISOString();
    const rows = Array.from({length: 12}, function (_, index) {
      return [index + 1, false, now, 'setup'];
    });
    stages.getRange(2, 1, rows.length, STAGE_HEADERS.length).setValues(rows);
  }

  ensureSheet_(spreadsheet, AUDIT_SHEET, AUDIT_HEADERS);
  ensureRootRow_(students);
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
      serverTime: new Date().toISOString()
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
      case 'stageState': return jsonOutput_({ok: true, stages: readStages_(), serverTime: new Date().toISOString()});
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
  const registered = row ? Boolean(studentsSheet_().getRange(row, 13).getValue()) : false;
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
    const now = new Date().toISOString();
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
  if (!constantTimeEqual_(hashPin_(studentId, pin, String(values[11])), String(values[12]))) {
    recordLoginFailure_(studentId);
    throw apiError_('INVALID_CREDENTIALS', '학번 또는 PIN을 확인하세요.');
  }
  clearLoginFailures_(studentId);
  const save = parseStoredSave_(values[7], studentId, String(values[1]));
  audit_('LOGIN', studentId, {});
  return studentResponse_(studentId, String(values[1]), save, Number(values[8]) || 1, issueToken_(studentId, 'student'));
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
  const save = parseStoredSave_(values[7], ROOT_STUDENT_ID, ROOT_NAME);
  audit_('ROOT_LOGIN', ROOT_STUDENT_ID, {});
  return studentResponse_(ROOT_STUDENT_ID, ROOT_NAME, save, Number(values[8]) || 1, issueToken_(ROOT_STUDENT_ID, 'root'));
}

function loadStudent_(request) {
  const auth = verifyToken_(request.token);
  const sheet = studentsSheet_();
  const row = findStudentRow_(sheet, auth.studentId);
  if (!row) throw apiError_('ACCOUNT_NOT_FOUND', '저장된 계정을 찾을 수 없습니다.');
  const values = sheet.getRange(row, 1, 1, STUDENT_HEADERS.length).getValues()[0];
  return studentResponse_(auth.studentId, String(values[1]), parseStoredSave_(values[7], auth.studentId, String(values[1])), Number(values[8]) || 1, null);
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
    const currentRevision = Number(values[8]) || 1;
    const baseRevision = Number(request.baseRevision);
    if (!Number.isInteger(baseRevision) || baseRevision !== currentRevision) {
      return {
        ok: false,
        error: {code: 'REVISION_CONFLICT', message: '다른 기기에서 저장 데이터가 변경되었습니다.'},
        student: {
          studentId: auth.studentId,
          name: String(values[1]),
          save: parseStoredSave_(values[7], auth.studentId, String(values[1])),
          revision: currentRevision
        },
        stages: readStages_(),
        serverTime: new Date().toISOString()
      };
    }

    const name = auth.role === 'root' ? ROOT_NAME : requireName_(request.save && request.save.name || values[1]);
    const save = normalizeSave_(request.save, auth.studentId, name);
    const revision = currentRevision + 1;
    const now = new Date().toISOString();
    writeStudentProgress_(sheet, row, auth.studentId, name, save, revision, now, values[10], values[11], values[12]);
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
      new Date().toISOString(),
      ROOT_STUDENT_ID
    ]]);
    audit_(request.released ? 'STAGE_RELEASE' : 'STAGE_RELOCK', ROOT_STUDENT_ID, {stage: index + 1});
    SpreadsheetApp.flush();
    return {ok: true, stages: readStages_(), serverTime: new Date().toISOString()};
  } finally {
    lock.releaseLock();
  }
}

function studentResponse_(studentId, name, save, revision, token) {
  const result = {
    ok: true,
    student: {studentId: studentId, name: name, save: save, revision: revision},
    stages: readStages_(),
    serverTime: new Date().toISOString()
  };
  if (token) result.token = token;
  return result;
}

function normalizeSave_(input, studentId, name) {
  const source = input && typeof input === 'object' ? input : {};
  const save = {
    version: 3,
    studentId: studentId,
    name: name,
    character: source.character && typeof source.character === 'object' ? jsonClone_(source.character) : null,
    completed: intList_(source.completed, 0, 14, 15),
    readBooks: intList_(source.readBooks, 0, 11, 12),
    fetPuzzleCompleted: source.fetPuzzleCompleted === true,
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
    save.completed.join(','),
    save.doping,
    save.type,
    save.coins,
    save.purchased.join(','),
    JSON.stringify(save),
    revision,
    updatedAt,
    createdAt,
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
  const now = new Date().toISOString();
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
  return requiredSheet_(STUDENTS_SHEET);
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
      new Date().toISOString(), event, studentId, JSON.stringify(detail || {})
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
    serverTime: new Date().toISOString()
  });
}

function jsonOutput_(value) {
  return ContentService.createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}
