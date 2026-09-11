import {test} from 'node:test';import assert from 'node:assert/strict';
import {grantReward,purchase,bridgeUnlocked} from '../src/economy.mjs';
const start=()=>({completed:[],doping:1e13,coins:0,purchased:[]});
test('guide grants key after exactly three ordered rewards, never duplicate rewards',()=>{
 let s=start();assert.equal(grantReward(s,{id:2,dose:4e13,coins:20}),s);
 for(let i=0;i<3;i++){const q={id:i,dose:[2e13,3e13,4e13][i],coins:20};s=grantReward(s,q);assert.equal(bridgeUnlocked(s),i===2);assert.equal(grantReward(s,q),s);}
 assert.equal(s.doping,1e14);assert.equal(s.coins,60);
});
test('weekly quests require key then work in any order and clamp at maximum',()=>{
 const q={id:10,dose:9e20,coins:30};const empty=start();assert.equal(grantReward(empty,q),empty);
 let s={...start(),completed:[0,1,2],doping:1e14};s=grantReward(s,q);s=grantReward(s,{id:3,dose:9e13,coins:30});assert.ok(s.completed.includes(3)&&s.completed.includes(10));s=grantReward(s,{id:9,dose:9e20,coins:30});assert.equal(s.doping,1e21);
});
test('shop checks coins, prevents duplicate equipment purchase, no spending at max XP',()=>{
 const hat={id:'trailcap',price:60},pack={id:'dopant',price:10};let s=start();assert.equal(purchase(s,hat),s);s={...s,coins:80};s=purchase(s,hat);assert.equal(s.coins,20);assert.deepEqual(s.purchased,['trailcap']);assert.equal(purchase(s,hat),s);
 s=purchase(s,pack);assert.equal(s.coins,10);assert.equal(s.doping,1.9e13);s={...s,doping:1e21};assert.equal(purchase(s,pack),s);
});
