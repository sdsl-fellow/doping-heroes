// Included in Code_v17.gs. Do not install alongside the complete bundle.
const QUIZ_CONTENT_HEADERS=['questionId','question','optionA','optionB','optionC','optionD','correctOption','explanation','source','active','rewardDose','rewardCoins','legacyQuestId','title','dopant'];
const EXPERIMENT_CONTENT_HEADERS=['experimentId','title','type','stepId','stepTitle','detail','hint','correctOrder','active','rewardDose','rewardCoins','source'];
function learningSheet_(name){
 const id=PropertiesService.getScriptProperties().getProperty('CONTENT_SPREADSHEET_ID');
 if(!id)throw apiError_('CONTENT_SETUP','관리자가 Code_v17.gs의 setupLearningContentV16을 실행해주세요.');
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
