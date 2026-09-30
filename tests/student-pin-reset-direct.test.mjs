import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert/strict';
const source=fs.readFileSync('google-apps-script/Code_v25_Stage2.gs','utf8')+'\n'+fs.readFileSync('google-apps-script/StudentPinReset_Direct_20260930_1716.gs','utf8');
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
test('direct reset preserves progress, excludes admins/tests, backs up, and runs only once',()=>{
 const f=fixture(),before=structuredClone(f.rows);f.c.resetAllStudentPinsToStudentId();
 assert.equal(f.plan().status,'completed');assert.equal(f.plan().completed.length,2);
 assert.equal([...f.sheets.keys()].filter(n=>n.startsWith('PinResetReview')).length,0);
 assert.deepEqual(f.rows.slice(3),before.slice(3));
 for(let i=1;i<=2;i++){
  assert.deepEqual(f.rows[i].slice(0,10),before[i].slice(0,10));assert.equal(f.rows[i][12],before[i][12]);
  assert.equal(f.rows[i][11],f.c.hashPin_(f.rows[i][0],f.rows[i][0],f.rows[i][10]));
  assert.equal(JSON.parse(f.props.get('PIN_STATE_'+f.rows[i][0])).pending,true);
 }
 const backup=f.sheets.get(f.plan().backup);assert.deepEqual(JSON.parse(backup.data[2][1]),before[1]);
 const after=structuredClone(f.rows);assert.throws(()=>f.c.resetAllStudentPinsToStudentId(),/이미 실행/);assert.deepEqual(f.rows,after);
});
test('direct reset accepts an old unused preview, but blocks incomplete or completed execution',()=>{
 const f=fixture();f.props.set('STUDENT_PIN_RESET_20260930',JSON.stringify({status:'prepared'}));f.c.resetAllStudentPinsToStudentId();assert.equal(f.plan().status,'completed');
 for(const status of ['running','failed','completed']){const g=fixture(),before=structuredClone(g.rows);g.props.set('STUDENT_PIN_RESET_20260930',JSON.stringify({status}));assert.throws(()=>g.c.resetAllStudentPinsToStudentId());assert.deepEqual(g.rows,before);}
});
