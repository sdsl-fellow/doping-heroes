import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert/strict';
const source=fs.readFileSync('google-apps-script/Code_v25_Stage2.gs','utf8')+'\n'+fs.readFileSync('google-apps-script/StudentPinReset_Prepare_20260930.gs','utf8');
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
test('bulk reset preview is read-only for auth, excludes admin/test, and requires approval',()=>{
 const f=fixture(),before=structuredClone(f.rows);f.c.prepareStudentPinReset();assert.deepEqual(f.rows,before);
 assert.equal([...f.props.keys()].filter(k=>k.startsWith('PIN_STATE_')).length,0);
 assert.throws(()=>f.c.executePreparedStudentPinReset(),/승인/);assert.deepEqual(f.rows,before);
 const review=f.sheets.get(f.plan().review);assert.equal(review.data[2][1],'2');assert.equal(review.data[3][1],'5');
 review.getRange(2,2).setValue('초기화 승인');f.c.executePreparedStudentPinReset();
 assert.equal(f.plan().status,'completed');assert.deepEqual(f.rows.slice(3),before.slice(3));
 for(let i=1;i<=2;i++){
  assert.deepEqual(f.rows[i].slice(0,10),before[i].slice(0,10));assert.equal(f.rows[i][12],before[i][12]);
  assert.equal(f.rows[i][11],f.c.hashPin_(f.rows[i][0],f.rows[i][0],f.rows[i][10]));
  assert.equal(JSON.parse(f.props.get('PIN_STATE_'+f.rows[i][0])).pending,true);
 }
 const backup=f.sheets.get(f.plan().backup);assert.deepEqual(JSON.parse(backup.data[2][1]),before[1]);
 const after=structuredClone(f.rows);assert.throws(()=>f.c.executePreparedStudentPinReset(),/이미 실행/);assert.throws(()=>f.c.prepareStudentPinReset(),/이미 실행/);assert.deepEqual(f.rows,after);
});
test('changed exclusion flags invalidate preview before any PIN mutation',()=>{
 const f=fixture();f.c.prepareStudentPinReset();f.sheets.get(f.plan().review).getRange(2,2).setValue('초기화 승인');f.rows[1][12]=true;
 const before=structuredClone(f.rows);assert.throws(()=>f.c.executePreparedStudentPinReset(),/변경/);assert.deepEqual(f.rows,before);
});
test('missing exclusion column or duplicate student ID blocks preparation',()=>{
 for(const variant of ['column','duplicate']){const f=fixture();if(variant==='column')f.rows[0][12]='wrong';else f.rows.push(structuredClone(f.rows[1]));assert.throws(()=>f.c.prepareStudentPinReset());assert.equal(f.props.size,0);}
});
