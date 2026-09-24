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
