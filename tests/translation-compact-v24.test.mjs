import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {bank} from './fixtures/translation-bank.mjs';

const code=fs.readFileSync(new URL('../google-apps-script/Code_v24.gs',import.meta.url),'utf8');
const plain=value=>JSON.parse(JSON.stringify(value));

test('v24 stores only question references and minimal answer receipts while returning full quiz content',()=>{
 const c=vm.createContext({});vm.runInContext(code,c);
 const props=new Map([['REPORTING_SCHEMA','13'],['TRANSLATION_ASYNC_REPORTING','14']]);
 c.PropertiesService={getScriptProperties:()=>({getProperty:key=>props.get(key),setProperty:(key,value)=>props.set(key,value)})};
 c.verifyToken_=()=>({studentId:'22221111',role:'student'});
 c.LockService={getScriptLock:()=>({waitLock(){},releaseLock(){}})};
 c.SpreadsheetApp={flush(){}};c.koreaTimestamp_=()=> '2026-09-27T21:00:00+09:00';c.seoulCellTime_=value=>value;
 c.translationBank_=()=>bank;c.audit_=()=>{};
 const initial={version:3,item_schema:3,studentId:'22221111',name:'세물',area:'stage-1',completed:[0,1,2],coins:20,doping:1e14,character:{hat:'H07'},purchased:['H07']};
 let row=plain(c.studentRow_('22221111','세물',initial,4,'updated','created','salt','hash'));
 const sheet={getRange:()=>({getValues:()=>[row],setValues:values=>{row=plain(values[0]);}})};
 c.studentsSheet_=()=>sheet;c.findStudentRow_=()=>2;
 const start=c.translationAction_({action:'translationStart',token:'valid',roundId:'round-0001',baseRevision:4});
 const stored=JSON.parse(row[6]).translation_progress.active;
 assert.equal(stored.questions.length,5);
 assert.ok(stored.questions.every(q=>Object.keys(q).sort().join(',')==='contentKey,optionOrder,questionId'));
 assert.ok(!row[6].includes('correctOption')&&!row[6].includes('english')&&!row[6].includes('explanation'));
 assert.equal(start.quiz.questions.length,5);
 const id=start.quiz.questions[0].id;
 const answer=c.translationAction_({action:'translationAnswer',token:'valid',roundId:'round-0001',questionId:id,optionId:'A',baseRevision:5});
 const receipt=JSON.parse(row[6]).translation_progress.active.results[id];
 assert.deepEqual(Object.keys(receipt).sort(),['answeredAt','coins','correct','dose','repeat','selected']);
 assert.equal(answer.quiz.results[id].correctOption,'A');
 const balance=JSON.parse(row[6]).coins;
 const retry=c.translationAction_({action:'translationAnswer',token:'valid',roundId:'round-0001',questionId:id,optionId:'B',baseRevision:5});
 assert.equal(retry.quiz.results[id].selected,'A');assert.equal(JSON.parse(row[6]).coins,balance);
});

test('v24 rejects a changed question before scoring a compact session',()=>{
 const c=vm.createContext({});vm.runInContext(code,c);
 const q=bank[0],ref={questionId:q.questionId,optionOrder:'BCDA',contentKey:c.translationContentKey_(q)};
 assert.throws(()=>c.translationResolveActive_({questions:[ref]},[{...q,optionA:'변경된 보기'}]),/변경/);
 assert.deepEqual(plain(c.translationResolveActive_({questions:[ref]},[q])[0].options.map(o=>o.id)),['B','C','D','A']);
});

test('editor reset clears every saveJson and increments revisions without changing other columns',()=>{
 const c=vm.createContext({});vm.runInContext(code,c);
 let rows=[['099746','관리자',1e14,'p',200,'H01','{"coins":200}',8,'old','created','',''],['22221111','세물',1e13,'n',30,'C01','{"coins":30}',5,'old','created','salt','hash']];
 const original=plain(rows),backups=[];
 const sheet={getLastRow:()=>rows.length+1,getParent:()=>({}),copyTo:()=>({setName:name=>backups.push(name)}),getRange:(r,col,count,width)=>({
  getValues:()=>plain(rows.slice(r-2,r-2+count).map(row=>row.slice(col-1,col-1+width))),
  setValues:values=>values.forEach((value,i)=>{rows[r-2+i].splice(col-1,width,...plain(value));})
 })};
 c.studentsSheet_=()=>sheet;c.LockService={getScriptLock:()=>({waitLock(){},releaseLock(){}})};
 c.koreaTimestamp_=()=> '2026-09-27T21:00:00+09:00';c.SpreadsheetApp={flush(){}};c.audit_=()=>{};
 assert.match(c.resetAllSaveJsonV24(),/2개 계정/);
 assert.equal(backups.length,1);
 for(let i=0;i<2;i++){
  assert.equal(rows[i][6],'');assert.equal(rows[i][7],original[i][7]+1);
  assert.deepEqual(rows[i].slice(0,6),original[i].slice(0,6));
  assert.deepEqual(rows[i].slice(9),original[i].slice(9));
 }
});
