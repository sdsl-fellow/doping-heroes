/** Stage 1 translation quiz. Included in the downloadable Code_v14.gs. */
const TRANSLATION_HEADERS = ['questionId','stage','kind','english','optionA','optionB','optionC','optionD','correctOption','explanation','sourceId','sourceTitle','sourcePage','active','rewardDose','rewardCoins'];

// Run from the editor after replacing Code.gs. Existing IDs/edits are never overwritten.
function setupTranslationQuiz() {
  const lock=LockService.getScriptLock();lock.waitLock(30000);
  try {
    const id=PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if(!id)throw new Error('기존 게임의 setupDopingHeroes 설정이 필요합니다.');
    const ss=SpreadsheetApp.openById(id);
    const sheet=ss.getSheetByName('TranslationQuestions')||ss.insertSheet('TranslationQuestions');
    if(sheet.getLastRow()===0)sheet.getRange(1,1,1,TRANSLATION_HEADERS.length).setValues([TRANSLATION_HEADERS]);
    translationHeaderCheck_(sheet);
    // Questions are maintained only in the private spreadsheet; no embedded seed.
    ensureSheet_(ss,'TranslationProgress',TRANSLATION_PROGRESS_HEADERS);
    sheet.setFrozenRows(1);SpreadsheetApp.flush();
    return '번역 문제 시트 확인 완료. 기존 문제의 직접 수정 내용은 유지했습니다. setupReportingV13을 실행하세요.';
  }finally{lock.releaseLock();}
}
function translationHeaderCheck_(sheet){
  if(JSON.stringify(sheet.getRange(1,1,1,TRANSLATION_HEADERS.length).getValues()[0])!==JSON.stringify(TRANSLATION_HEADERS))throw apiError_('TRANSLATION_SCHEMA','TranslationQuestions의 열 이름과 순서를 확인하세요.');
}
function translationBank_(){
 const key='translation-bank-v14:'+PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
 try{const hit=CacheService.getScriptCache().get(key);if(hit)return JSON.parse(hit);}catch(ignored){}
 const bank=translationReadBank_(),json=JSON.stringify(bank);
 // Cache is optional; eviction or an oversized bank falls back to Sheets.
 try{if(Utilities.newBlob(json).getBytes().length<95000)CacheService.getScriptCache().put(key,json,60);}catch(ignored){}
 return bank;
}
function clearTranslationQuestionCache(){
 CacheService.getScriptCache().remove('translation-bank-v14:'+PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID'));
}
function translationReadBank_(){
  const sheet=requiredSheet_('TranslationQuestions');translationHeaderCheck_(sheet);
  const rows=sheet.getLastRow()>1?sheet.getRange(2,1,sheet.getLastRow()-1,TRANSLATION_HEADERS.length).getValues():[];
  const seen=new Set();
  return rows.map((r,i)=>{
    const q=Object.fromEntries(TRANSLATION_HEADERS.map((h,j)=>[h,r[j]]));
    if(Number(q.stage)!==1||!([true,'TRUE','true',1,'1'].includes(q.active)))return null;
    q.questionId=String(q.questionId).trim();q.correctOption=String(q.correctOption).trim().toUpperCase();
    const text=['english','optionA','optionB','optionC','optionD','explanation','sourceId','sourceTitle'];
    if(!/^[A-Za-z0-9_-]{1,80}$/.test(q.questionId)||seen.has(q.questionId)||!['term','sentence'].includes(q.kind)||!['A','B','C','D'].includes(q.correctOption)||text.some(k=>typeof q[k]!=='string'||!q[k].trim())||new Set(['A','B','C','D'].map(k=>q['option'+k].trim())).size!==4||!Number.isInteger(Number(q.sourcePage))||Number(q.sourcePage)<1||!Number.isFinite(Number(q.rewardDose))||Number(q.rewardDose)<=0||!Number.isInteger(Number(q.rewardCoins))||Number(q.rewardCoins)<10||Number(q.rewardCoins)%10!==0)throw apiError_('TRANSLATION_QUESTION','TranslationQuestions '+(i+2)+'행의 문제 ID·보기·출처·보상을 확인하세요. 코인은 10의 배수여야 합니다.');
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
 if(PropertiesService.getScriptProperties().getProperty('REPORTING_SCHEMA')!=='13')throw apiError_('REPORTING_SETUP','관리자가 Code_v14.gs의 setupReportingV13을 실행해야 합니다.');
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
