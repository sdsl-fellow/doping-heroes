import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert/strict';
const source=fs.readFileSync('google-apps-script/Code_v25_Stage2.gs','utf8')+'\n'+fs.readFileSync('google-apps-script/StudentPinReset_Include20001001_20260930_1726.gs','utf8');
function fixture(){
 const headers=['studentId','name','doping','type','coins','items','saveJson','revision','updatedAt','createdAt','pinSalt','pinHash','rankExcluded'];
 const row=(id,excluded=false)=>[id,'Synthetic',1e15,'n',77,'H09','{"coins":77}',3,'now','then','old-salt','old-hash',excluded];
 const rows=[headers,row('20220001'),row('20220002'),row('099746'),row('20001001'),row('20001002'),row('20220003',true),row('20220004','TRUE')];
 const sheets=new Map(),props=new Map();
 const ss={insertSheet(name){assert.ok(!sheets.has(name));const s=sheet(name,[]);sheets.set(name,s);return s;},getSheetByName:name=>sheets.get(name)};
 function sheet(name,data){return {data,getName:()=>name,getParent:()=>ss,getLastColumn:()=>data[0]?.length||0,getLastRow:()=>data.length,getRange(r,c,n=1,m=1){const range={getValues:()=>Array.from({length:n},(_,i)=>Array.from({length:m},(_,j)=>data[r-1+i]?.[c-1+j]??'')),getValue:()=>data[r-1]?.[c-1]??'',setNumberFormat:()=>range,setValue:v=>range.setValues([[v]]),setValues:values=>{values.forEach((line,i)=>{data[r-1+i]??=[];line.forEach((v,j)=>data[r-1+i][c-1+j]=v)});return range;}};return range;}};}
 const student=sheet('Students',rows);sheets.set('Students',student);
 const c=vm.createContext({console:{log(){}},PropertiesService:{getScriptProperties:()=>({getProperty:k=>props.get(k)||null,setProperty:(k,v)=>props.set(k,v)})},LockService:{getScriptLock:()=>({waitLock(){},releaseLock(){}})},SpreadsheetApp:{flush(){}},Utilities:{getUuid:()=>crypto.randomUUID(),DigestAlgorithm:{SHA_256:'sha256'},computeDigest:(a,s)=>[...crypto.createHash(a).update(s).digest()]}});
 vm.runInContext(source,c);c.studentsSheet_=()=>student;c.rosterStudent_=()=>({});c.hashPin_=(id,pin,salt)=>crypto.createHash('sha256').update(id+':'+pin+':'+salt).digest('hex');c.clearLoginFailures_=()=>{};c.koreaTimestamp_=()=> '2026-09-30';
 return {c,rows,props,sheets,plan:()=>JSON.parse(props.get('STUDENT_PIN_RESET_20260930'))};
}
test('bulk includes 20001001 despite rank exclusion and preserves all other excluded accounts',()=>{
 const f=fixture();f.rows[4][12]=true;const before=structuredClone(f.rows);
 f.c.resetAllStudentPinsToStudentId();assert.equal(f.plan().completed.length,3);
 assert.equal(f.rows[4][11],f.c.hashPin_('20001001','20001001',f.rows[4][10]));
 assert.deepEqual(f.rows[4].slice(0,10),before[4].slice(0,10));assert.equal(f.rows[4][12],true);
 for(const i of [3,5,6,7])assert.deepEqual(f.rows[i],before[i]);
 const after=structuredClone(f.rows);assert.throws(()=>f.c.resetOnly20001001Again());assert.deepEqual(f.rows,after);
});
test('after previous bulk completion, reset only 20001001 once without touching other users',()=>{
 const f=fixture();f.rows[4][12]=true;
 f.props.set('STUDENT_PIN_RESET_20260930',JSON.stringify({status:'completed'}));
 f.props.set('PIN_STATE_20001001',JSON.stringify({pilotResetDone:true,pending:false,epoch:'old'}));
 const before=structuredClone(f.rows);f.c.resetOnly20001001Again();
 for(let i=0;i<f.rows.length;i++)if(i!==4)assert.deepEqual(f.rows[i],before[i]);
 assert.deepEqual(f.rows[4].slice(0,10),before[4].slice(0,10));
 const state=JSON.parse(f.props.get('PIN_STATE_20001001'));assert.equal(state.pending,true);assert.notEqual(state.epoch,'old');
 assert.equal(f.rows[4][11],f.c.hashPin_('20001001','20001001',f.rows[4][10]));
 const after=structuredClone(f.rows);assert.throws(()=>f.c.resetOnly20001001Again());assert.deepEqual(f.rows,after);
});
