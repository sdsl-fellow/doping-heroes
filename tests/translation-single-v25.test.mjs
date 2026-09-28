import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {bank} from './fixtures/translation-bank.mjs';

const source=fs.readFileSync(new URL('../google-apps-script/Code_v25.gs',import.meta.url),'utf8');
const plain=value=>JSON.parse(JSON.stringify(value));

test('v25 reads translation questions from the private learning-content tab',()=>{
 const c=vm.createContext({});vm.runInContext(source,c);
 let requested;
 c.learningRows_=(tab,headers)=>{requested={tab,headers:plain(headers)};return bank;};
 assert.deepEqual(plain(c.translationReadBank_()).map(q=>q.questionId),bank.map(q=>q.questionId));
 assert.equal(requested.tab,'Translation_01');
 assert.ok(requested.headers.includes('correctOption'));
});

function fixture(raw){
 const c=vm.createContext({});vm.runInContext(source,c);
 c.verifyToken_=()=>({studentId:'22221111',role:'student'});
 c.LockService={getScriptLock:()=>({waitLock(){},releaseLock(){}})};
 c.SpreadsheetApp={flush(){}};c.koreaTimestamp_=()=> '2026-09-27T22:10:00+09:00';c.seoulCellTime_=value=>value;
 c.translationBank_=()=>bank;c.translationQuestionToken_=(sid,q)=>'token:'+q.questionId;
 c.translationVerifyQuestionToken_=(token,sid)=>{assert.equal(sid,'22221111');return {qid:token.slice(6),key:c.translationContentKey_(bank.find(q=>q.questionId===token.slice(6)))};};
 const initial={version:3,item_schema:3,studentId:'22221111',name:'세미',area:'stage-1',completed:[0,1,2],coins:20,doping:1e14,character:{hat:'H07'},purchased:['H07'],...raw};
 let row=plain(c.studentRow_('22221111','세미',initial,4,'updated','created','salt','hash')),writes=0;
 const sheet={getRange:()=>({getValues:()=>[row],setValues:values=>{row=plain(values[0]);writes++;}})};
 c.studentsSheet_=()=>sheet;c.findStudentRow_=()=>2;c.audit_=()=>{};
 const answer=(id,optionId,revision=row[7])=>c.translationAction_({action:'translationAnswer',token:'auth',questionToken:'token:'+id,optionId,baseRevision:revision});
 return {c,initial,read:()=>JSON.parse(row[6]),revision:()=>row[7],writes:()=>writes,start:()=>c.translationAction_({action:'translationStart',token:'auth'}),answer};
}

test('each start returns one question without persisting an active round',()=>{
 const f=fixture(),before=f.writes(),r=f.start();
 assert.ok(r.quiz.question.id);assert.equal(r.quiz.question.options.length,4);
 assert.equal(r.quiz.questionToken,'token:'+r.quiz.question.id);
 assert.equal(f.writes(),before);assert.equal(f.read().translation_progress,undefined);
 assert.deepEqual(plain(r.student.save.translation_solved),[]);
});

test('wrong answers write nothing; first correct answer commits one ID and reward; retry and review pay zero',()=>{
 const f=fixture(),id=bank[0].questionId,q=bank[0],wrong=q.correctOption==='A'?'B':'A';
 const prior=f.writes();const incorrect=f.answer(id,wrong);assert.equal(incorrect.quiz.result.correct,false);assert.equal(f.writes(),prior);
 const first=f.answer(id,q.correctOption);assert.equal(first.quiz.result.correct,true);assert.equal(first.quiz.result.coins,10);
 assert.deepEqual(f.read().translation_solved,[id]);assert.equal(f.read().coins,30);assert.equal(f.writes(),prior+1);
 const retry=f.answer(id,q.correctOption,4);assert.equal(retry.quiz.result.coins,0);assert.equal(retry.quiz.result.repeat,true);assert.equal(f.read().coins,30);assert.equal(f.writes(),prior+1);
 const review=f.answer(id,q.correctOption);assert.equal(review.quiz.result.coins,0);assert.deepEqual(f.read().translation_solved,[id]);
 const forged=f.c.saveStudent_({token:'auth',baseRevision:f.revision(),includeStages:false,save:{...f.initial,translation_solved:['fake-id']}});
 assert.equal(forged.ok,true);assert.deepEqual(f.read().translation_solved,[id]);
});

test('legacy v24 correct counts migrate to IDs without resetting balances, and stale active content disappears',()=>{
 const f=fixture({translation_progress:{questions:{[bank[0].questionId]:{correctCount:2},[bank[1].questionId]:{correctCount:0}},active:{id:'old',questions:[{english:'duplicated question'}]}}});
 const normalized=f.c.parseStoredSave_(JSON.stringify(f.read()),'22221111','세미');
 assert.deepEqual(plain(normalized.translation_solved),[bank[0].questionId]);
 assert.equal(normalized.translation_progress,undefined);assert.equal(normalized.coins,20);
 assert.equal(normalized.doping,1e14);
});

test('editor migration backs up every account and strips verbose translation records',()=>{
 const c=vm.createContext({});vm.runInContext(source,c);
 const legacy={version:3,item_schema:3,studentId:'22221111',name:'세미',area:'stage-1',coins:100,doping:1e14,translation_progress:{questions:{[bank[0].questionId]:{correctCount:1},[bank[1].questionId]:{correctCount:0}},active:{questions:[{english:'large content'}]}}};
 let rows=[['22221111','세미',1e14,'n',100,'',JSON.stringify(legacy),5,'old','created','salt','hash']];
 const backups=[],props=new Map();
 const sheet={getLastRow:()=>2,getParent:()=>({}),copyTo:()=>({setName:name=>backups.push(name)}),getRange:(r,col,count,width)=>({
  getValues:()=>plain(rows.slice(r-2,r-2+count).map(row=>row.slice(col-1,col-1+width))),
  setValues:values=>values.forEach((value,i)=>{rows[r-2+i].splice(col-1,width,...plain(value));})
 })};
 c.studentsSheet_=()=>sheet;c.LockService={getScriptLock:()=>({waitLock(){},releaseLock(){}})};
 c.PropertiesService={getScriptProperties:()=>({setProperty:(k,v)=>props.set(k,v),deleteProperty:k=>props.delete(k)})};
 c.ScriptApp={getProjectTriggers:()=>[]};c.SpreadsheetApp={flush(){}};c.koreaTimestamp_=()=> '2026-09-27T22:10:00+09:00';c.audit_=()=>{};
 assert.match(c.migrateTranslationSolvedV25(),/전환 완료/);
 assert.equal(backups.length,1);assert.equal(rows[0][7],6);assert.equal(props.get('TRANSLATION_SOLVED_SCHEMA'),'25');
 const saved=JSON.parse(rows[0][6]);assert.deepEqual(saved.translation_solved,[bank[0].questionId]);
 assert.equal(saved.translation_progress,undefined);assert.equal(saved.coins,100);assert.equal(saved.doping,1e14);
});

test('issued question token binds the student and question, and rejects tampering',()=>{
 const c=vm.createContext({});vm.runInContext(source,c);
 c.Utilities={getUuid:()=> 'nonce',base64EncodeWebSafe:value=>Buffer.from(value).toString('base64url'),base64DecodeWebSafe:value=>Buffer.from(value,'base64url'),newBlob:bytes=>({getDataAsString:()=>Buffer.from(bytes).toString()})};
 c.sign_=text=>'signature:'+text;
 const token=c.translationQuestionToken_('22221111',bank[0]);
 assert.equal(c.translationVerifyQuestionToken_(token,'22221111').qid,bank[0].questionId);
 assert.throws(()=>c.translationVerifyQuestionToken_(token,'33333333'),/만료/);
 assert.throws(()=>c.translationVerifyQuestionToken_(token+'x','22221111'),/다시 불러오세요/);
});
