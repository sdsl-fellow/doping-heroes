import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {toCloudItemSave,normalizeItemSave} from '../src/item-save.mjs';
import {purchase,useConsumable} from '../src/economy.mjs';
const code=fs.readFileSync(new URL('../google-apps-script/Code_v25_Stage2.gs',import.meta.url),'utf8');
test('all three purchase counters and escalating prices survive server save/load',()=>{
 const server=vm.createContext({});vm.runInContext(code,server);
 let save={item_schema:3,name:'학생',studentId:'20260001',character:{},completed:[],readBooks:[],purchased:[],doping:1e14,coins:10000,type:'n'};
 for(const id of ['T03','T04','T05'])for(let count=0;count<4;count++){
  const item={id,price:id==='T03'?30:60},before=save.coins;
  save=purchase(save,item);assert.equal(before-save.coins,item.price*2**count);
  save=useConsumable(save,id);server.input=toCloudItemSave(save);
  server.input=JSON.parse(JSON.stringify(vm.runInContext('toStoredSave(normalizeSave_(input,"20260001","학생"))',server)));
  save=normalizeItemSave(JSON.parse(JSON.stringify(vm.runInContext('normalizeSave_(input,"20260001","학생")',server))));
  assert.equal(save.purchaseCounts[id],count+1);
 }
 assert.deepEqual(save.purchaseCounts,{T03:4,T04:4,T05:4});
});
test('old saves begin at zero regardless of purchased IDs or remaining quantities',()=>{
 const server=vm.createContext({});vm.runInContext(code,server);
 server.input={purchased:['T03','T04','T05'],quantities:{T03:10,T04:2,T05:1}};
 const result=vm.runInContext('normalizeSave_(input,"20260001","학생")',server);
 assert.deepEqual(JSON.parse(JSON.stringify(result.purchaseCounts)),{T03:0,T04:0,T05:0});
 assert.equal(result.quantities.T03,10);
});
test('an older client save cannot erase counters already stored on the server',()=>{
 const server=vm.createContext({});vm.runInContext(code,server);
 const previous={name:'학생',character:{},purchaseCounts:{T03:2,T04:3,T05:4}};
 const row=['20260001','학생',1e14,'n',1000,'',JSON.stringify(previous),7,'','created','',''];
 server.verifyToken_=()=>({role:'student',studentId:'20260001'});
 server.LockService={getScriptLock:()=>({waitLock(){},releaseLock(){}})};
 server.studentsSheet_=()=>({getRange:()=>({getValues:()=>[row]})});
 server.findStudentRow_=()=>2;server.requireName_=s=>s;server.koreaTimestamp_=()=>'';
 let saved;server.writeStudentProgress_=(_sheet,_row,_id,_name,save)=>{saved=save;};
 server.audit_=()=>{};server.studentResponse_=()=>({ok:true});
 server.saveStudent_({token:'student',baseRevision:7,save:{name:'학생',purchaseCounts:{T03:1,T04:0,T05:5}}});
 assert.deepEqual(JSON.parse(JSON.stringify(saved.purchaseCounts)),{T03:2,T04:3,T05:5});
});
