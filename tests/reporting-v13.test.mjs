import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('google-apps-script/Code_v13.gs','utf8');
const plain=x=>JSON.parse(JSON.stringify(x));
function context(){const c=vm.createContext({PropertiesService:{getScriptProperties:()=>({getProperty:k=>k==='ROOT_STUDENT_ID'?'000001':k==='ROOT_NAME'?'관리자':''})}});vm.runInContext(source,c);return c;}
const old=(id,time,correct=true,sid='22221111',qid='q1')=>[id,sid,1,'round',qid,'term',correct?'A':'B','A',correct,false,correct?1e12:0,correct?10:0,time,'source',3];
test('migration deduplicates receipts, aggregates and sorts by latest answer',()=>{
 const c=context(),rows=plain(c.buildTranslationProgress_([
  old('a','2026-09-01T10:00:00+09:00'),old('a','2026-09-01T10:00:00+09:00'),
  old('b','2026-09-02T10:00:00+09:00',false),old('c','2026-09-03T10:00:00+09:00',true,'22222222')],[],[]));
 assert.equal(rows.length,2);assert.equal(rows[0][0],'22222222');
 assert.deepEqual(rows[1].slice(4,6),[2,1]);assert.equal(rows[1][10],1e12);assert.equal(rows[1][11],10);assert.equal(rows[1][12],true);
 assert.equal(rows[1][8],'B');assert.equal(rows[1][9],false);
 assert.deepEqual(plain(c.buildTranslationProgress_([],rows,[])),rows);
});
test('migration preserves canonical counts and flags missing reward evidence',()=>{
 const c=context();const rows=plain(c.buildTranslationProgress_([old('a','2026-09-01T10:00:00+09:00')],[],[{studentId:'22221111',questions:{q1:{attempts:5,correctCount:3,firstCorrectAt:'2026-09-01T10:00:00+09:00',lastAnsweredAt:'2026-09-05T10:00:00+09:00'}}}]));
 assert.equal(rows[0][4],5);assert.equal(rows[0][5],3);assert.equal(rows[0][12],false);assert.equal(rows[0][11],10);
 assert.deepEqual(plain(c.buildTranslationProgress_([old('a','2026-09-01T10:00:00+09:00')],rows,[])),rows);
});
test('committed but unlogged answer is recovered from active receipt once',()=>{
 const c=context(),student={studentId:'22221111',questions:{q1:{attempts:1,correctCount:1,lastAnsweredAt:'2026-09-01T10:00:00+09:00'}},active:{id:'round',questions:[{questionId:'q1',kind:'term',stage:1}],results:{q1:{selected:'A',correctOption:'A',correct:true,dose:1e12,coins:10,answeredAt:'2026-09-01T10:00:00+09:00',sourceId:'source',sourcePage:3}}}};
 const rows=plain(c.buildTranslationProgress_([],[],[student]));assert.equal(rows[0][11],10);assert.equal(rows[0][12],true);
 const again=plain(c.buildTranslationProgress_([],rows,[student]));assert.deepEqual(again,rows);
});
function sheet(name,rows){return {rows,getName:()=>name,getLastRow:()=>rows.length,getRange(r,c,n=1,m=1){return {getValues:()=>Array.from({length:n},(_,i)=>Array.from({length:m},(_,j)=>rows[r-1+i]?.[c-1+j]??'')),setValues(v){v.forEach((a,i)=>{rows[r-1+i]??=[];a.forEach((x,j)=>rows[r-1+i][c-1+j]=x);});return this;},setNumberFormat(){return this;},sort(spec){const a=rows.splice(r-1,n);a.sort((a,b)=>{for(const s of spec){const d=String(a[s.column-1]).localeCompare(String(b[s.column-1]));if(d)return s.ascending?d:-d;}return 0;});rows.splice(r-1,0,...a);return this;}};},insertRowBefore(r){rows.splice(r-1,0,[]);}};}
test('summary updates absolute counts, retries never append duplicates, updated rows rise',()=>{
 const c=context(),headers=plain(vm.runInContext('TRANSLATION_PROGRESS_HEADERS',c)),s=sheet('TranslationProgress',[headers]);
 c.requiredSheet_=()=>s;c.SpreadsheetApp={flush(){}};
 const p={attempts:1,correctCount:1,lastAnsweredAt:'2026-09-01T10:00:00+09:00',totalRewardDose:1e12,totalRewardCoins:10,rewardTotalsComplete:true};
 c.translationLog_('22221111',null,'q1',{q1:p});c.translationLog_('22221111',null,'q1',{q1:p});assert.equal(s.rows.length,2);assert.equal(s.rows[1][11],10);
 c.translationLog_('22222222',null,'q1',{q1:{...p,lastAnsweredAt:'2026-09-02T10:00:00+09:00'}});assert.equal(s.rows[1][0],'22222222');
 c.translationLog_('22221111',null,'q1',{q1:{...p,attempts:2,correctCount:2,totalRewardCoins:11,lastAnsweredAt:'2026-09-03T10:00:00+09:00'}});assert.equal(s.rows.length,3);assert.equal(s.rows[1][0],'22221111');assert.equal(s.rows[1][11],11);
});
test('audit skips normal saves and logs newest important events without secrets',()=>{
 const c=context(),s=sheet('AuditLog',[['timestamp','event','studentId','detail']]);let owned=false;
 c.requiredSheet_=()=>s;c.koreaTimestamp_=()=> '2026-09-01T10:00:00+09:00';
 c.LockService={getScriptLock:()=>({hasLock:()=>owned,tryLock(){owned=true;return true;},releaseLock(){owned=false;}})};
 c.audit_('SAVE','22221111',{});c.audit_('LOGIN','22221111',{});assert.equal(s.rows.length,1);
 c.audit_('STAGE_RELEASE','000001',{stage:1});c.auditRequestError_({action:'login',studentId:'22221111',pin:'SECRET_PIN',token:'SECRET_TOKEN'},{code:'INVALID_CREDENTIALS',message:'SECRET_STACK'});
 assert.equal(s.rows[1][1],'LOGIN_FAILED');assert.equal(s.rows[2][1],'STAGE_RELEASE');assert.ok(!JSON.stringify(s.rows).includes('SECRET'));assert.equal(owned,false);
});

test('editor migration preserves balances, removes legacy only after verification and reruns safely',()=>{
 const c=context(),table=new Map(),props=new Map();let deleted=false,locked=false;
 function add(name,rows){const s=sheet(name,rows),get=s.getRange;s.getParent=()=>ss;s.setFrozenRows=()=>{};
  s.getRange=(...args)=>{const range=get(...args);range.clearContent=()=>{const [r,col,n,m]=args;for(let i=0;i<n;i++)for(let j=0;j<m;j++)if(rows[r-1+i])rows[r-1+i][col-1+j]='';return range;};return range;};
  // Emulate Sheets getLastRow ignoring cleared rows.
  s.getLastRow=()=>{let n=rows.length;while(n&&rows[n-1].every(x=>x===''||x==null))n--;return n;};table.set(name,s);return s;
 }
 const ss={getSheetByName:n=>table.get(n),insertSheet:n=>add(n,[]),deleteSheet(s){assert.equal(table.get('TranslationProgress').rows[1][4],1);table.delete(s.getName());deleted=true;}};
 const save={name:'student',coins:20,doping:1e14,translation_progress:{questions:{q1:{attempts:1,correctCount:1,lastAnsweredAt:'2026-09-01T10:00:00+09:00'}}}};
 const students=add('Students',[plain(vm.runInContext('STUDENT_HEADERS',c)),['22221111','student',1e14,'n',20,'[]',JSON.stringify(save),4,'updated','created','salt','hash']]);
 add('TranslationAttempts',[plain(vm.runInContext('TRANSLATION_ATTEMPT_HEADERS',c)),old('a','2026-09-01T10:00:00+09:00')]);
 add('AuditLog',[['timestamp','event','studentId','detail'],['2026-09-01T10:00:00+09:00','SAVE','22221111','{}'],['2026-09-02T10:00:00+09:00','STAGE_RELEASE','000001','{}']]);
 c.studentsSheet_=()=>students;c.requiredSheet_=n=>table.get(n);c.PropertiesService={getScriptProperties:()=>({setProperty:(k,v)=>props.set(k,v)})};
 c.LockService={getScriptLock:()=>({waitLock(){locked=true;},hasLock:()=>locked,tryLock(){locked=true;return true;},releaseLock(){locked=false;}})};
 c.SpreadsheetApp={flush(){}};c.koreaTimestamp_=()=> '2026-09-24T12:00:00+09:00';
 c.setupReportingV13();assert.equal(deleted,true);assert.equal(props.get('REPORTING_SCHEMA'),'13');
 assert.equal(students.rows[1][4],20);assert.equal(students.rows[1][2],1e14);assert.ok(!table.get('AuditLog').rows.some(r=>r[1]==='SAVE'));
 const progress=plain(table.get('TranslationProgress').rows);const counters=JSON.parse(students.rows[1][6]).translation_progress.questions;
 c.setupReportingV13();assert.deepEqual(plain(table.get('TranslationProgress').rows),progress);assert.deepEqual(JSON.parse(students.rows[1][6]).translation_progress.questions,counters);assert.equal(locked,false);
});
