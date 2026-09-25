import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('google-apps-script/Code_v19.gs','utf8');
function fixture(code=source){
 const c=vm.createContext({});vm.runInContext(code,c);const props=new Map([['SPREADSHEET_ID','operations'],['CONTENT_SPREADSHEET_ID','content']]),cache=new Map(),sheets=new Map();let area='stage-1',sid='22221111',serial=0;
 c.PropertiesService={getScriptProperties:()=>({getProperty:k=>props.get(k),setProperty:(k,v)=>props.set(k,v),deleteProperty:k=>props.delete(k)})};
 c.CacheService={getScriptCache:()=>({get:k=>cache.get(k),put:(k,v)=>cache.set(k,v),remove:k=>cache.delete(k)})};
 c.Utilities={getUuid:()=> 'round-'+(++serial),newBlob:s=>({getBytes:()=>Buffer.from(s)})};
 c.SpreadsheetApp={openById:id=>{assert.notEqual(id,'operations');return {getSheetByName:name=>sheets.get(name)};}};
 c.verifyToken_=()=>({studentId:sid});c.studentsSheet_=()=>({getRange:()=>({getValues:()=>[['22221111','student','','','','',JSON.stringify({area})]]})});c.findStudentRow_=()=>2;c.parseStoredSave_=s=>JSON.parse(s);
 function add(name,headers,objects){const rows=[headers,...objects.map(q=>headers.map(h=>q[h]??''))];sheets.set(name,{getLastRow:()=>rows.length,getLastColumn:()=>headers.length,getRange:(r,col,n,m)=>({getValues:()=>rows.slice(r-1,r-1+n).map(row=>row.slice(col-1,col-1+m))})});return rows;}
 const q={questionId:'q1',question:'Synthetic prompt',optionA:'a',optionB:'b',optionC:'c',optionD:'',correctOption:'B',explanation:'explanation',active:'TRUE',rewardDose:1e12,rewardCoins:30,legacyQuestId:3,title:'Title'};
 add('Quiz_01',Array.from(vm.runInContext('QUIZ_CONTENT_HEADERS',c)).reverse(),[q]);
 return {c,props,cache,sheets,add,q,setArea:v=>area=v,setSid:v=>sid=v};
}
test('quiz uses separate content workbook and reordered headers, never sends unsubmitted answer',()=>{
 const f=fixture(),r=f.c.learningContentAction_({action:'learningStart',stage:1,questId:3});assert.equal(r.content.options.length,3);assert.equal(r.content.question,'Synthetic prompt');
 assert.ok(!JSON.stringify(r).includes('correctOption'));assert.ok(!JSON.stringify(r).includes('explanation'));
 const answer=f.c.learningContentAction_({action:'learningAnswer',sessionId:r.content.sessionId,optionId:'B'});assert.equal(answer.content.correct,true);assert.equal(answer.content.coins,30);
 const wrong=f.c.learningContentAction_({action:'learningAnswer',sessionId:r.content.sessionId,optionId:'A'});assert.equal(wrong.content.correct,false);assert.ok(!wrong.content.explanation.includes('explanation'));
});
test('session binds student and snapshot; expired or wrong-area requests fail',()=>{
 const f=fixture(),r=f.c.learningContentAction_({action:'learningStart',stage:1});f.setSid('22222222');assert.throws(()=>f.c.learningContentAction_({action:'learningAnswer',sessionId:r.content.sessionId,optionId:'B'}),/다른 학생/);
 f.setSid('22221111');f.cache.clear();assert.throws(()=>f.c.learningContentAction_({action:'learningAnswer',sessionId:r.content.sessionId,optionId:'B'}),/만료/);f.setArea('village');assert.throws(()=>f.c.learningContentAction_({action:'learningStart',stage:1}),/해당 스테이지/);
});
test('teacher edits apply after cache clear, inactive and duplicate questions are handled',()=>{
 const f=fixture();assert.equal(f.c.learningQuizBank_(1)[0].question,'Synthetic prompt');const h=Array.from(vm.runInContext('QUIZ_CONTENT_HEADERS',f.c));f.add('Quiz_01',h,[{...f.q,question:'Edited'},{...f.q,questionId:'disabled',active:false}]);
 assert.equal(f.c.learningQuizBank_(1)[0].question,'Synthetic prompt');f.c.clearLearningContentCache();assert.equal(f.c.learningQuizBank_(1)[0].question,'Edited');assert.equal(f.c.learningQuizBank_(1).length,1);
 f.add('Quiz_01',h,[f.q,f.q]);f.c.clearLearningContentCache();assert.throws(()=>f.c.learningQuizBank_(1),/확인/);
});
test('experiment keeps order server-side and validates sequence and supported diagrams',()=>{
 const f=fixture();f.setArea('stage-7');const ids=['substrate','oxide','gate','implant','anneal','contacts'];const rows=ids.map((id,i)=>({experimentId:'experiment',title:'Test',type:'sequence',stepId:id,stepTitle:id,detail:'detail',hint:'hint',correctOrder:i+1,active:true}));
 f.add('Experiment_07',Array.from(vm.runInContext('EXPERIMENT_CONTENT_HEADERS',f.c)),rows);
 const r=f.c.learningContentAction_({action:'learningStart',stage:7,kind:'experiment'});assert.equal(r.content.steps.length,6);assert.ok(!JSON.stringify(r).includes('correctOrder'));
 assert.equal(f.c.learningContentAction_({action:'learningAnswer',sessionId:r.content.sessionId,order:ids}).content.correct,true);
 assert.equal(f.c.learningContentAction_({action:'learningAnswer',sessionId:r.content.sessionId,order:[...ids].reverse()}).content.correct,false);
 assert.throws(()=>f.c.learningContentAction_({action:'learningAnswer',sessionId:r.content.sessionId,order:ids.slice(1)}),/6개/);
});
test('translation reads Translation_01, setup never overwrites private teacher data',()=>{
 const f=fixture();const h=Array.from(vm.runInContext('TRANSLATION_HEADERS',f.c)),q={questionId:'tr1',stage:1,kind:'term',english:'term',optionA:'a',optionB:'b',optionC:'c',optionD:'d',correctOption:'A',explanation:'test',sourceId:'src',sourceTitle:'Source',sourcePage:1,active:true,rewardDose:1e12,rewardCoins:10};
 f.add('Translation_01',h,[q]);assert.equal(f.c.translationBank_()[0].questionId,'tr1');assert.match(f.c.setupTranslationQuiz(),/확인 완료/);assert.equal(f.props.get('SPREADSHEET_ID'),'operations');
});
test('failed setup restores content configuration without changing operational sheet',()=>{
 const f=fixture();assert.throws(()=>f.c.setupLearningContentV16(),/탭이 없습니다/);assert.equal(f.props.get('CONTENT_SPREADSHEET_ID'),'content');assert.equal(f.props.get('SPREADSHEET_ID'),'operations');
});

test('tutorial batch loads all three once and keeps answer keys in private sessions',()=>{
 const f=fixture();f.setArea('village');
 f.add('Tutorial',Array.from(vm.runInContext('QUIZ_CONTENT_HEADERS',f.c)),[0,1,2].map(i=>({...f.q,questionId:'t'+i,legacyQuestId:i,explanation:'private-explanation'})));
 let reads=0;const load=f.c.learningQuizBank_;f.c.learningQuizBank_=(stage)=>{reads++;return load(stage);};
 const r=f.c.learningContentAction_({action:'learningStart',stage:0,kind:'tutorial'});
 assert.equal(reads,1);assert.deepEqual(Array.from(r.content.questions,q=>q.questId),[0,1,2]);
 assert.ok(!JSON.stringify(r).includes('correctOption'));assert.ok(!JSON.stringify(r).includes('private-explanation'));
 for(const q of r.content.questions)assert.equal(f.c.learningContentAction_({action:'learningAnswer',sessionId:q.sessionId,optionId:'B'}).content.correct,true);
 assert.equal(reads,1);
 const again=f.c.learningContentAction_({action:'learningStart',stage:0,kind:'tutorial'});assert.notEqual(again.content.questions[0].sessionId,r.content.questions[0].sessionId);
});
test('tutorial batch rejects missing slots and non-village use',()=>{
 const f=fixture();assert.throws(()=>f.c.learningContentAction_({action:'learningStart',stage:1,kind:'tutorial'}),/마을/);
 f.setArea('village');f.add('Tutorial',Array.from(vm.runInContext('QUIZ_CONTENT_HEADERS',f.c)),[{...f.q,legacyQuestId:0}]);assert.throws(()=>f.c.learningContentAction_({action:'learningStart',stage:0,kind:'tutorial'}),/2번/);assert.equal(f.cache.has('learning-session:round-1'),false);
});
test('v21 stage batch loads every active question once and completes only after all are correct',()=>{
 const f=fixture(fs.readFileSync('google-apps-script/Code_v21.gs','utf8'));
 const headers=Array.from(vm.runInContext('QUIZ_CONTENT_HEADERS',f.c));
 f.add('Quiz_01',headers,Array.from({length:5},(_,i)=>({...f.q,questionId:'q'+(i+1),question:'Question '+(i+1),rewardDose:1e12,rewardCoins:30})));
 const batch=f.c.learningContentAction_({action:'learningStart',kind:'stageQuiz',stage:1});
 assert.equal(batch.content.questions.length,5);
 assert.ok(!JSON.stringify(batch).includes('correctOption'));
 assert.ok(!JSON.stringify(batch).includes('explanation'));
 const [first,...rest]=batch.content.questions;
 const wrong=f.c.learningContentAction_({action:'learningAnswer',sessionId:first.sessionId,optionId:'A'});
 assert.equal(wrong.content.correct,false);assert.equal(wrong.content.stageComplete,false);
 const correct=f.c.learningContentAction_({action:'learningAnswer',sessionId:first.sessionId,optionId:'B'});
 assert.equal(correct.content.solved,1);assert.equal(correct.content.stageComplete,false);
 assert.equal(f.c.learningContentAction_({action:'learningAnswer',sessionId:first.sessionId,optionId:'B'}).content.solved,1);
 for(const [i,q] of rest.entries()){
  const result=f.c.learningContentAction_({action:'learningAnswer',sessionId:q.sessionId,optionId:'B'});
  assert.equal(result.content.stageComplete,i===rest.length-1);
  assert.equal(result.content.solved,i+2);
  if(i===rest.length-1){assert.equal(result.content.dose,1e12);assert.equal(result.content.coins,30);}
 }
 f.setSid('another-student');assert.throws(()=>f.c.learningContentAction_({action:'learningAnswer',sessionId:first.sessionId,optionId:'B'}),/다른 학생/);
});
test('v21 a single active stage question completes after one correct answer',()=>{
 const f=fixture(fs.readFileSync('google-apps-script/Code_v21.gs','utf8'));
 const batch=f.c.learningContentAction_({action:'learningStart',kind:'stageQuiz',stage:1});
 assert.equal(batch.content.questions.length,1);
 const result=f.c.learningContentAction_({action:'learningAnswer',sessionId:batch.content.questions[0].sessionId,optionId:'B'});
 assert.equal(result.content.stageComplete,true);
});
