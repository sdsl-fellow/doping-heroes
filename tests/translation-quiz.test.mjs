import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {route,walkable} from '../src/navigation.mjs';
const source=fs.readFileSync('google-apps-script/Code_v14.gs','utf8');
const bank=JSON.parse(fs.readFileSync('data/translation-stage1.json','utf8'));
const plain=x=>JSON.parse(JSON.stringify(x));
function fixture(){
 const ctx=vm.createContext({});vm.runInContext(source,ctx);
 ctx.PropertiesService={getScriptProperties:()=>({getProperty:()=>'13'})};
 const initial={version:3,item_schema:3,stage_layout:3,studentId:'22221111',name:'학생',area:'stage-1',completed:[0,1,2],readBooks:[0],puzzle_completed:[],coins:20,doping:1e14,character:{hat:'H07'},purchased:['H07'],quantities:{}};
 let row=plain(ctx.studentRow_('22221111','학생',initial,4,'updated','created','salt','hash')),writes=0,locks=0;
 ctx.verifyToken_=token=>{assert.equal(token,'valid');return {studentId:'22221111',role:'student'};};
 ctx.LockService={getScriptLock:()=>({waitLock(){locks++;},releaseLock(){locks--;}})};
 ctx.SpreadsheetApp={flush(){}};ctx.koreaTimestamp_=()=> '2026-09-17 20:00:00';
 const sheet={getRange:()=>({getValues:()=>[row],setValues:values=>{row=plain(values[0]);writes++;}})};
 ctx.studentsSheet_=()=>sheet;ctx.findStudentRow_=()=>2;ctx.translationBank_=()=>bank;ctx.audit_=()=>{};ctx.translationLog_=()=>{};
 ctx.readStages_=()=>{throw Error('Translation must not fetch releases');};
 return {ctx,initial,read:()=>JSON.parse(row[6]),revision:()=>row[7],writes:()=>writes,locks:()=>locks,start:(id='round-0001')=>ctx.translationAction_({action:'translationStart',token:'valid',roundId:id,baseRevision:row[7]}),answer:(qid,optionId='A',id='round-0001',rev=row[7])=>ctx.translationAction_({action:'translationAnswer',token:'valid',roundId:id,questionId:qid,optionId,baseRevision:rev})};
}
test('bank contains 9 terms / 21 sentences with unique IDs and source pages',()=>{
 assert.equal(bank.length,30);assert.equal(bank.filter(q=>q.kind==='term').length,9);assert.equal(new Set(bank.map(q=>q.questionId)).size,30);
 for(const q of bank){assert.equal(q.stage,1);assert.ok(q.sourcePage>=3&&q.sourcePage<=34);assert.equal(new Set(['A','B','C','D'].map(k=>q['option'+k])).size,4);assert.equal(q.rewardCoins%10,0);}
 assert.equal(source,fs.readFileSync('google-apps-script/Code.gs','utf8'));
});
test('round sampling has five unique questions, 1/2 terms, shuffled options and no answer leakage',()=>{
 const f=fixture();const signatures=new Set();let termCount=0;
 for(let i=0;i<400;i++){const sampled=plain(f.ctx.translationSample_(bank));const n=sampled.filter(q=>q.kind==='term').length;assert.ok(n===1||n===2);termCount+=n;assert.equal(new Set(sampled.map(q=>q.questionId)).size,5);sampled.forEach(q=>assert.deepEqual(q.options.map(o=>o.id).sort(),['A','B','C','D']));signatures.add(sampled[0].options.map(o=>o.id).join(''));}
 assert.ok(termCount>530&&termCount<670);assert.ok(signatures.size>10);
 const response=plain(f.start());assert.equal(response.quiz.questions.length,5);assert.ok(response.quiz.questions.every(q=>!('correctOption' in q)&&!('explanation' in q)));assert.equal(response.student.save.translation_progress.active,undefined);
});
test('first answer reward is atomic, retried requests are idempotent, and repeat correct answers earn one tenth',()=>{
 const f=fixture(),started=f.start(),q=started.quiz.questions[0].id;
 const a=f.answer(q);assert.equal(a.quiz.results[q].coins,10);assert.equal(a.quiz.results[q].dose,1e12);assert.equal(f.read().coins,30);
 const writes=f.writes();f.answer(q,'B','round-0001',4);assert.equal(f.writes(),writes);assert.equal(f.read().coins,30);
 // Resuming a timed-out start never creates another sample or clears receipts.
 f.start();assert.equal(f.writes(),writes);
 let round;
 for(let i=2;i<150;i++){round=f.start('round-'+String(i).padStart(4,'0'));if(round.quiz.questions.some(x=>x.id===q))break;}
 assert.ok(round.quiz.questions.some(x=>x.id===q));
 const b=f.answer(q,'A',round.quiz.id);assert.equal(b.quiz.results[q].coins,1);assert.equal(b.quiz.results[q].dose,1e11);assert.equal(b.quiz.results[q].repeat,true);
 assert.equal(f.read().translation_progress.questions[q].correctCount,2);assert.equal(f.read().coins,31);
 for(const field of ['character','purchased','readBooks','puzzle_completed','area'])assert.deepEqual(f.read()[field],f.initial[field]);
 assert.deepEqual(f.read().tutorial_completed,[0,1,2]);assert.deepEqual(f.read().stage_completed,[]);assert.equal(f.locks(),0);
});
test('wrong answers earn nothing and cannot be changed; stale/invalid requests never write',()=>{
 const f=fixture(),r=f.start(),q=r.quiz.questions[0].id;
 const wrong=f.answer(q,'B');assert.equal(wrong.quiz.results[q].correct,false);assert.equal(f.read().coins,20);f.answer(q,'A');assert.equal(f.read().coins,20);
 const next=r.quiz.questions[1].id,writes=f.writes();assert.equal(f.answer(next,'A',r.quiz.id,1).error.code,'REVISION_CONFLICT');assert.equal(f.writes(),writes);
 assert.throws(()=>f.answer('missing','A'),/확인/);assert.equal(f.writes(),writes);
 f.start('round-0002');assert.throws(()=>f.answer(next,'A','round-0001'),/만료/);
 assert.throws(()=>f.ctx.translationAction_({action:'translationStart',token:'invalid'}));assert.equal(f.locks(),0);
});
test('ordinary inventory saves retain server-owned translation records',()=>{
 const f=fixture(),r=f.start();f.answer(r.quiz.questions[0].id);const before=f.read().translation_progress;
 const response=f.ctx.saveStudent_({token:'valid',baseRevision:f.revision(),includeStages:false,save:{...f.initial,coins:30,translation_progress:{questions:{forged:{correctCount:999}}}}});
 assert.equal(response.ok,true);assert.deepEqual(f.read().translation_progress,before);assert.equal(response.student.save.translation_progress.active,undefined);
});
test('Stage 1 quiz is reachable on the existing right-hand path',()=>{
 assert.ok(walkable(1000,465,'stage-1'));const path=route(768,210,1000,465,'stage-1');assert.ok(path.length>0);for(const p of path)assert.ok(walkable(p.x,p.y,'stage-1'));assert.ok(Math.hypot(path.at(-1).x-1000,path.at(-1).y-465)<20);
});

test('a log failure after reward commit can be retried without awarding twice',()=>{
 const f=fixture(),r=f.start(),q=r.quiz.questions[0].id;f.ctx.translationLog_=()=>{throw Error('log delayed');};
 assert.throws(()=>f.answer(q),/log delayed/);assert.equal(f.read().coins,30);const writes=f.writes();
 f.ctx.translationLog_=()=>{};const result=f.answer(q,'A',r.quiz.id,4);assert.equal(result.quiz.results[q].coins,10);assert.equal(f.read().coins,30);assert.equal(f.writes(),writes);
});

test('setup is repeatable and never overwrites teacher edits or disables them',()=>{
 const ctx=vm.createContext({});vm.runInContext(source,ctx);const headers=plain(vm.runInContext('TRANSLATION_HEADERS',ctx));
 const edited={...bank[0],english:'Teacher edited prompt',active:false};const rows=[headers,headers.map(h=>edited[h])];
 const sheet={getLastRow:()=>rows.length,setFrozenRows(){},getRange(r,c,n,m){return {getValues:()=>rows.slice(r-1,r-1+n).map(row=>row.slice(c-1,c-1+m)),setValues(values){values.forEach((row,i)=>{rows[r-1+i]??=[];row.forEach((v,j)=>rows[r-1+i][c-1+j]=v);});}};}};
 ctx.LockService={getScriptLock:()=>({waitLock(){},releaseLock(){}})};ctx.PropertiesService={getScriptProperties:()=>({getProperty:()=> 'sheet-id'})};ctx.SpreadsheetApp={openById:()=>({getSheetByName:()=>sheet}),flush(){}};ctx.ensureSheet_=()=>{};
 assert.match(ctx.setupTranslationQuiz(),/확인 완료/);assert.match(ctx.setupTranslationQuiz(),/확인 완료/);assert.equal(rows.length,2);rows.push(...bank.slice(1).map(q=>headers.map(h=>q[h])));assert.equal(rows[1][3],'Teacher edited prompt');assert.equal(rows[1][13],false);
 ctx.requiredSheet_=()=>sheet;const loaded=plain(ctx.translationBank_());assert.equal(loaded.length,29);assert.ok(!loaded.some(q=>q.questionId===edited.questionId));
 rows[2][0]=rows[3][0];assert.throws(()=>ctx.translationBank_(),/행/);
});

test('v14 answers commit once without synchronous reporting; retries survive reporting outage',()=>{
 const f=fixture(),properties=new Map([['REPORTING_SCHEMA','13'],['TRANSLATION_ASYNC_REPORTING','14']]);
 f.ctx.PropertiesService={getScriptProperties:()=>({getProperty:k=>properties.get(k),setProperty:(k,v)=>properties.set(k,v)})};
 f.ctx.translationLog_=()=>{throw Error('Reporting must not run in answer request');};
 const r=f.start(),q=r.questions?.[0]||r.quiz.questions[0];
 const a=f.answer(q.id);assert.equal(a.ok,true);assert.equal(properties.get('TRANSLATION_REPORT_DIRTY'),'1');
 assert.equal(f.read().coins,30);const count=f.writes();f.answer(q.id,'A',r.quiz.id,4);assert.equal(f.writes(),count);
 assert.equal(f.read().coins,30);assert.equal(f.locks(),0);
 f.start('round-0002'); // No replay of five old summary rows on the next start.
});

test('v14 bank cache avoids Sheets reads and falls back on eviction or failure',()=>{
 const c=vm.createContext({});vm.runInContext(source,c);let reads=0,cached=null;
 c.PropertiesService={getScriptProperties:()=>({getProperty:()=> 'private-sheet'})};
 c.CacheService={getScriptCache:()=>({get:()=>cached,put:(key,value,ttl)=>{assert.equal(ttl,60);cached=value;},remove:()=>{cached=null;}})};
 c.Utilities={newBlob:s=>({getBytes:()=>Buffer.from(s)})};
 c.translationReadBank_=()=>{reads++;return bank;};
 assert.equal(c.translationBank_().length,30);assert.equal(c.translationBank_().length,30);assert.equal(reads,1);
 c.clearTranslationQuestionCache();c.translationBank_();assert.equal(reads,2);
 c.CacheService={getScriptCache(){throw Error('Cache unavailable');}};assert.equal(c.translationBank_().length,30);assert.equal(reads,3);
});
