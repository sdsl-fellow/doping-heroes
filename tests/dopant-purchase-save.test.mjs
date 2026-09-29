import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {toCloudItemSave,normalizeItemSave} from '../src/item-save.mjs';
import {purchase,useConsumable} from '../src/economy.mjs';

const code=fs.readFileSync(new URL('../google-apps-script/Code_v25_Stage2.gs',import.meta.url),'utf8');
test('three purchases remain capped after use and a server save/load round trip',()=>{
 const server=vm.createContext({});vm.runInContext(code,server);
 const item={id:'T03',price:30};let save={item_schema:3,name:'학생',studentId:'20260001',character:{},completed:[],readBooks:[],purchased:[],doping:1e14,coins:120,type:'n'};
 for(let i=0;i<3;i++){
  save=purchase(save,item);
  save=useConsumable(save,'T03');
  server.input=toCloudItemSave(save);
  const stored=vm.runInContext('toStoredSave(normalizeSave_(input,"20260001","학생"))',server);
  save=normalizeItemSave(JSON.parse(JSON.stringify(vm.runInContext('normalizeSave_(input,"20260001","학생")',Object.assign(server,{input:stored})))));
 }
 assert.equal(save.quantities.T03,0);
 assert.equal(save.purchaseCounts.T03,3);
 assert.equal(purchase(save,item),save);
});
test('server migrates old stock conservatively and preserves already recorded counts',()=>{
 const server=vm.createContext({});vm.runInContext(code,server);
 for(const [stock,recorded,expected] of [[2,undefined,2],[0,undefined,1],[0,3,3]]){
  server.input={purchased:['T03'],quantities:{T03:stock},purchaseCounts:recorded===undefined?undefined:{T03:recorded}};
  const save=vm.runInContext('normalizeSave_(input,"20260001","학생")',server);
  assert.equal(save.purchaseCounts.T03,expected);
 }
});
