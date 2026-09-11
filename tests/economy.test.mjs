import {stageDefinitions,stageUnlocked} from '../src/maps.mjs';
import {stageDose} from '../src/progression.mjs';
import {test} from 'node:test';import assert from 'node:assert/strict';
import {grantReward,purchase,bridgeUnlocked,grantBookReward,bookDose} from '../src/economy.mjs';
const start=()=>({completed:[],doping:1e13,coins:0,purchased:[]});
test('guide grants key after exactly three ordered rewards, never duplicate rewards',()=>{
 let s=start();assert.equal(grantReward(s,{id:2,dose:4e13,coins:20}),s);
 for(let i=0;i<3;i++){const q={id:i,dose:[2e13,3e13,4e13][i],coins:20};s=grantReward(s,q);assert.equal(bridgeUnlocked(s),i===2);assert.equal(grantReward(s,q),s);}
 assert.equal(s.doping,1e14);assert.equal(s.coins,60);
});
test('stages unlock strictly in visible order and reward once',()=>{
 let s={...start(),completed:[0,1,2],doping:1e14};
 for(let i=0;i<12;i++){
  assert.equal(stageUnlocked(s.completed,i),true);
  if(i<11){assert.equal(stageUnlocked(s.completed,i+1),false);assert.equal(grantReward(s,{id:stageDefinitions[i+1].questId,dose:stageDose(i+1),coins:30}),s);}
  const q={id:stageDefinitions[i].questId,dose:stageDose(i),coins:30};s=grantReward(s,q,()=>.3);assert.equal(grantReward(s,q),s);
 }
 assert.ok(Math.abs(s.doping-9.5e20)<1e7);assert.equal(new Set(s.purchased).size,s.purchased.length);
});
test('each crossed level grants unique loot including pack purchases',()=>{
 let s={...start(),completed:[0,1,2],doping:1e14};
 s=grantReward(s,{id:3,dose:9.9e15,coins:30},()=>0);assert.equal(s.purchased.length,2);
 const before=s;s=purchase({...s,doping:9.9e16,coins:20},{id:'dopant',price:10},false,()=>0);assert.equal(s.purchased.length,before.purchased.length+1);
 const saved=JSON.parse(JSON.stringify(s));assert.deepEqual(saved.purchased,s.purchased);
});
test('shop checks coins, prevents duplicate equipment purchase, no spending at max XP',()=>{
 const hat={id:'trailcap',price:60},pack={id:'dopant',price:10};let s=start();assert.equal(purchase(s,hat),s);s={...s,coins:80};s=purchase(s,hat);assert.equal(s.coins,20);assert.deepEqual(s.purchased,['trailcap']);assert.equal(purchase(s,hat),s);
 s=purchase(s,pack);assert.equal(s.coins,10);assert.equal(s.doping,1.9e13);s={...s,doping:1e21};assert.equal(purchase(s,pack),s);
});


test('book completion awards two percent once and persists across reload',()=>{
 let s={...start(),completed:[0,1,2],doping:1e14};assert.equal(grantBookReward(s,1),s);
 const after=grantBookReward(s,0,()=>0);assert.equal(after.doping,s.doping+bookDose(0));assert.deepEqual(after.readBooks,[0]);assert.equal(after.coins,s.coins);assert.deepEqual(after.completed,s.completed);
 const restored=JSON.parse(JSON.stringify(after));assert.equal(grantBookReward(restored,0),restored);
 const capped=grantBookReward({...s,doping:1e21},0);assert.equal(capped.doping,1e21);assert.deepEqual(capped.readBooks,[0]);
});
