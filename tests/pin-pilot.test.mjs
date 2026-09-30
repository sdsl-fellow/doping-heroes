import fs from 'node:fs';import vm from 'node:vm';import crypto from 'node:crypto';import assert from 'node:assert/strict';import test from 'node:test';
const source=fs.readFileSync('google-apps-script/Code_v25_Stage2.gs','utf8');
const properties=new WeakMap(),backups=[];
function runtime(db,secret='isolated-test-secret'){
 const props=properties.get(db)||new Map([['AUTH_SECRET',secret],['ROOT_STUDENT_ID','099746']]),cache=new Map();properties.set(db,props);
 const sheet={getLastColumn:()=>13,getParent:()=>({insertSheet:()=>({getRange:()=>({setNumberFormat(){return this;},setValues(rows){backups.push(structuredClone(rows));return this;}})})}),getLastRow:()=>db.length,getRange(r,c,n=1,m=1){const out={getValues:()=>Array.from({length:n},(_,i)=>Array.from({length:m},(_,j)=>db[r-1+i]?.[c-1+j]??'')),getDisplayValues:()=>out.getValues().map(a=>a.map(String)),setNumberFormat:()=>out,setValue(v){return out.setValues([[v]])},setValues(a){a.forEach((line,i)=>{db[r-1+i]??=[];line.forEach((v,j)=>db[r-1+i][c-1+j]=typeof v==='string'&&v.startsWith("'")?v.slice(1):v)});return out}};return out}};
 const ctx=vm.createContext({PropertiesService:{getScriptProperties:()=>({getProperty:k=>props.get(k)??null,setProperty:(k,v)=>props.set(k,v)})},CacheService:{getScriptCache:()=>({get:k=>cache.get(k),put:(k,v)=>cache.set(k,v),remove:k=>cache.delete(k)})},LockService:{getScriptLock:()=>({waitLock(){},releaseLock(){}})},SpreadsheetApp:{flush(){}},Utilities:{getUuid:()=>crypto.randomUUID(),DigestAlgorithm:{SHA_256:'sha256'},computeDigest:(a,s)=>[...crypto.createHash(a).update(s).digest()],computeHmacSha256Signature:(s,k)=>[...crypto.createHmac('sha256',k).update(s).digest()],base64EncodeWebSafe:s=>Buffer.from(typeof s==='string'?s:s).toString('base64url'),base64DecodeWebSafe:s=>[...Buffer.from(s,'base64url')],newBlob:s=>({getDataAsString:()=>Buffer.from(s).toString()}),formatDate:()=> '2026-09-30 15:00:00'}});
 vm.runInContext(source,ctx);ctx.studentsSheet_=()=>sheet;ctx.assertRosterAllowed_=()=>{};ctx.audit_=()=>{};ctx.readStages_=()=>Array(12).fill(false);ctx.koreaTimestamp_=()=> '2026-09-30T15:00:00+09:00';return ctx;
}

test('single-account PIN reset preserves progress and requires new PIN before access',()=>{
 const db=[[]],c=runtime(db),id='20001001';
 const account=(sid,pin)=>{
  const ticket=c.beginStudentRegistration_({studentId:sid,pin:sid});
  const registration=c.registerStudent_({studentId:sid,name:'Synthetic',pin:sid,registrationToken:ticket.registrationToken,save:{name:'Synthetic',coins:123,doping:1e15,completed:[0,1,2],purchased:['H09']}});
  c.changeStudentPin_({token:registration.token,newPin:pin,confirmPin:pin});
  return c.loginStudent_({studentId:sid,pin});
 };
 const original=account(id,'0123'),other=account('20001002','1234');
 const before=structuredClone(db);c.resetPilotPin20001001();
 assert.equal(backups.length,1);assert.deepEqual(db[1].slice(0,10),before[1].slice(0,10));assert.deepEqual(db[2],before[2]);
 assert.throws(()=>c.loadStudent_({token:original.token}),e=>e.code==='UNAUTHORIZED');assert.ok(c.loadStudent_({token:other.token}).ok);
 const login=runtime(db).loginStudent_({studentId:id,pin:id});assert.equal(login.mustChangePin,true);assert.equal(login.student,undefined);
 for(const action of ['loadStudent_','saveStudent_'])assert.throws(()=>c[action]({token:login.token}),e=>e.code==='PIN_CHANGE_REQUIRED');
 assert.throws(()=>c.changeStudentPin_({token:login.token,newPin:id,confirmPin:id}),e=>e.code==='INVALID_PIN');
 assert.throws(()=>c.changeStudentPin_({token:login.token,newPin:'0012',confirmPin:'0013'}),e=>e.code==='PIN_MISMATCH');
 assert.ok(c.changeStudentPin_({token:login.token,newPin:'0012',confirmPin:'0012'}).pinChanged);
 assert.deepEqual(db[1].slice(0,10),before[1].slice(0,10));assert.deepEqual(db[2],before[2]);
 assert.throws(()=>c.verifyToken_(login.token,true),e=>e.code==='UNAUTHORIZED');
 assert.throws(()=>runtime(db).loginStudent_({studentId:id,pin:id}),e=>e.code==='INVALID_CREDENTIALS');
 const final=runtime(db).loginStudent_({studentId:id,pin:'0012'});assert.ok(final.student);assert.ok(c.loadStudent_({token:final.token}).ok);
 const after=structuredClone(db);c.resetPilotPin20001001();assert.deepEqual(db,after);assert.equal(backups.length,1);
});


test('new student must verify temporary PIN, create once, change PIN and log in again',()=>{
 const db=[[]],c=runtime(db),id='20260001';
 assert.throws(()=>c.beginStudentRegistration_({studentId:id,pin:'1234'}),e=>e.code==='INVALID_PIN');
 assert.throws(()=>c.beginStudentRegistration_({studentId:'099746',pin:'099746'}),e=>e.code==='INVALID_STUDENT_ID');
 const ticket=c.beginStudentRegistration_({studentId:id,pin:id}).registrationToken;
 assert.throws(()=>c.loadStudent_({token:ticket}));
 const request={studentId:id,name:'Synthetic new',pin:id,registrationToken:ticket,save:{name:'Synthetic new',coins:0,doping:1e13,completed:[],character:{species:'dog'}}};
 assert.throws(()=>c.registerStudent_({...request,registrationToken:''}),e=>e.code==='REGISTRATION_REQUIRED');
 assert.throws(()=>c.registerStudent_({...request,studentId:'20260002'}),e=>e.code==='REGISTRATION_REQUIRED');
 assert.throws(()=>c.registerStudent_({...request,pin:'1234'}),e=>e.code==='INVALID_PIN');
 const pending=c.registerStudent_(request);assert.equal(pending.mustChangePin,true);assert.equal(pending.student,undefined);
 assert.throws(()=>c.loadStudent_({token:pending.token}),e=>e.code==='PIN_CHANGE_REQUIRED');
 assert.throws(()=>c.saveStudent_({token:pending.token}),e=>e.code==='PIN_CHANGE_REQUIRED');
 assert.throws(()=>c.registerStudent_(request),e=>e.code==='ACCOUNT_EXISTS');assert.equal(db.length,2);
 // A fresh runtime models closing the browser/server invocation and resuming.
 const resumed=runtime(db).loginStudent_({studentId:id,pin:id});assert.equal(resumed.mustChangePin,true);
 const before=structuredClone(db[1]);
 assert.throws(()=>c.changeStudentPin_({token:resumed.token,newPin:'0012',confirmPin:'0013'}),e=>e.code==='PIN_MISMATCH');
 assert.deepEqual(db[1],before);
 const changed=c.changeStudentPin_({token:resumed.token,newPin:'0012',confirmPin:'0012'});assert.equal(changed.token,undefined);
 assert.deepEqual(db[1].slice(0,10),before.slice(0,10));
 assert.throws(()=>runtime(db).loginStudent_({studentId:id,pin:id}),e=>e.code==='INVALID_CREDENTIALS');
 const login=runtime(db).loginStudent_({studentId:id,pin:'0012'});assert.equal(login.student.name,'Synthetic new');
 assert.ok(runtime(db).loadStudent_({token:login.token}).ok);
 assert.throws(()=>c.loadStudent_({token:resumed.token}),e=>e.code==='UNAUTHORIZED');
});

test('registration ticket expiration and tampering do not create an account',()=>{
 const db=[[]],c=runtime(db),id='20260003';
 const token=c.beginStudentRegistration_({studentId:id,pin:id}).registrationToken;
 const request={studentId:id,name:'Synthetic',pin:id,registrationToken:token,save:{}};
 assert.throws(()=>c.registerStudent_({...request,registrationToken:token+'x'}),e=>e.code==='REGISTRATION_REQUIRED');
 const expired=Buffer.from(JSON.stringify({studentId:id,purpose:'registration',exp:Date.now()-1000})).toString('base64url');
 assert.throws(()=>c.registerStudent_({...request,registrationToken:expired+'.'+c.sign_(expired)}),e=>e.code==='REGISTRATION_REQUIRED');
 assert.equal(db.length,1);
});
