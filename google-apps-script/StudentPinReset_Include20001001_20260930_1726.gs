/**
 * In the current v25-pin-pilot-20260930 Apps Script project, replace the PREVIOUS
 * StudentPinReset_Prepare helper file with this file. Do NOT add both copies.
 * Keep the main Code.gs unchanged. Run resetAllStudentPinsToStudentId() once.
 * Includes 20001001 even when rankExcluded=TRUE. Other exclusions remain.
 * If bulk reset already ran, run resetOnly20001001Again() instead.
 * Replace the previous helper file; never keep both versions in the project.
 * No review sheet or approval cell is needed. Existing students only.
 */
const STUDENT_PIN_RESET_KEY_ = 'STUDENT_PIN_RESET_20260930';
const STUDENT_PIN_RESET_EXTRA_EXCLUDED_ = ['20001002'];

function studentPinResetSnapshot_() {
 const sheet=studentsSheet_(),width=sheet.getLastColumn();
 const headers=sheet.getRange(1,1,1,width).getValues()[0].map(String);
 ['studentId','pinSalt','pinHash','rankExcluded'].forEach(h=>{
  if(headers.filter(v=>v===h).length!==1)throw new Error('Students 열을 확인하세요: '+h);
 });
 const at=h=>headers.indexOf(h),seen=new Set();
 const rows=sheet.getLastRow()>1?sheet.getRange(2,1,sheet.getLastRow()-1,width).getValues():[];
 const entries=[];
 rows.forEach((values,i)=>{
  const id=canonicalStudentId_(values[at('studentId')]);if(!id)return;
  if(seen.has(id))throw new Error('중복 학번이 있어 중단했습니다: '+id);seen.add(id);
  const flag=values[at('rankExcluded')];
  let reason='';
  if(id===ROOT_STUDENT_ID)reason='관리자 root';
  else if(STUDENT_PIN_RESET_EXTRA_EXCLUDED_.includes(id))reason='테스트 계정';
  else if(id!=='20001001'&&(flag===true||flag===1||String(flag).trim().toUpperCase()==='TRUE'))reason='rankExcluded=TRUE';
  else if(!/^\d{8}$/.test(id))reason='8자리 학생 학번이 아님';
  else if(!rosterStudent_(id))reason='Roster에 없는 계정';
  else if(!values[at('pinHash')]&&!values[at('pinSalt')])reason='등록된 PIN 없음';
  else if(!values[at('pinHash')]||!values[at('pinSalt')])throw new Error('인증 정보가 불완전합니다: '+id);
  entries.push({id,row:i+2,reason,values,state:PropertiesService.getScriptProperties().getProperty('PIN_STATE_'+id)||''});
 });
 // Bind approval to membership, credentials and auth state, not changing game progress.
 const fingerprint=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,JSON.stringify(entries.map(e=>[
  e.id,e.reason,String(e.values[at('pinSalt')]),String(e.values[at('pinHash')]),e.state
 ]))).map(b=>('0'+((b+256)%256).toString(16)).slice(-2)).join('');
 return {sheet,width,headers,entries,fingerprint};
}

function resetAllStudentPinsToStudentId() {
 return runStudentPinResetIncludingPilot_(false);
}
// Use this when the other students have already been reset. One-time operation.
function resetOnly20001001Again() {
 return runStudentPinResetIncludingPilot_(true);
}
function runStudentPinResetIncludingPilot_(onlyPilot) {
 const lock=LockService.getScriptLock();lock.waitLock(10000);
 try {
  const props=PropertiesService.getScriptProperties(),batchKey=onlyPilot?'STUDENT_PIN_RESET_20001001_20260930_1726':STUDENT_PIN_RESET_KEY_,plan=JSON.parse(props.getProperty(batchKey)||'{}');
  if(plan.status&&plan.status!=='prepared')throw new Error('이미 실행한 작업입니다. 중복 초기화를 막았습니다. 상태: '+plan.status);
  const snapshot=studentPinResetSnapshot_(),ss=snapshot.sheet.getParent();
  const targets=snapshot.entries.filter(e=>!e.reason&&(!onlyPilot||e.id==='20001001')&&!(e.id==='20001001'&&pinState_(e.id).resetIncluded1726));
  if(!targets.length)throw new Error('초기화 대상이 없습니다.');
  const backup=ss.insertSheet('PinResetBackup_'+Date.now());
  // Snapshot target rows and their account auth properties. AUTH_SECRET is never copied.
  const backupRows=[['studentId','originalRowJSON','previousPinState'],
   ['HEADERS',JSON.stringify(snapshot.headers),''],
   ...targets.map(e=>[e.id,JSON.stringify(e.values),e.state])];
  backup.getRange(1,1,backupRows.length,3).setNumberFormat('@').setValues(backupRows);
  SpreadsheetApp.flush();
  const backed=backup.getRange(1,1,backupRows.length,3).getValues();
  if(JSON.stringify(backed)!==JSON.stringify(backupRows))throw new Error('백업 검증 실패. PIN 변경 없이 중단했습니다.');
  const salts=targets.map(e=>{const salt=Utilities.getUuid();return {id:e.id,salt,hash:hashPin_(e.id,e.id,salt),epoch:Utilities.getUuid()};});
  const journal={status:'running',backup:backup.getName(),completed:[],startedAt:koreaTimestamp_()};
  props.setProperty(batchKey,JSON.stringify(journal));
  try {
   targets.forEach((e,i)=>{
    const cred=salts[i],prior=e.state?JSON.parse(e.state):{};
    props.setProperty('PIN_STATE_'+e.id,JSON.stringify({...prior,epoch:cred.epoch,pending:true,bulkResetBatch:batchKey,...(e.id==='20001001'?{resetIncluded1726:true}:{})}));
    snapshot.sheet.getRange(e.row,snapshot.headers.indexOf('pinSalt')+1).setNumberFormat('@').setValue(cred.salt);
    snapshot.sheet.getRange(e.row,snapshot.headers.indexOf('pinHash')+1).setNumberFormat('@').setValue(cred.hash);
    SpreadsheetApp.flush();
    const actual=snapshot.sheet.getRange(e.row,1,1,snapshot.width).getValues()[0];
    if(!constantTimeEqual_(hashPin_(e.id,e.id,String(actual[snapshot.headers.indexOf('pinSalt')])),String(actual[snapshot.headers.indexOf('pinHash')])))throw new Error('PIN 저장 검증 실패: '+e.id);
    clearLoginFailures_(e.id);journal.completed.push(e.id);
    props.setProperty(batchKey,JSON.stringify(journal));
   });
   journal.status='completed';journal.finishedAt=koreaTimestamp_();
   props.setProperty(batchKey,JSON.stringify(journal));
   const result=targets.length+'명 PIN 초기화 완료. 임시 PIN=학번. 백업: '+backup.getName();console.log(result);return result;
  }catch(error){
   journal.status='failed';props.setProperty(batchKey,JSON.stringify(journal));
   throw new Error('일부 처리 후 중단했습니다. 재실행하지 마세요. 완료 '+journal.completed.length+'명 / 백업 '+backup.getName()+' / '+String(error.message||error));
  }
 }finally{lock.releaseLock();}
}
