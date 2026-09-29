import {stageDefinitions,stageUnlocked} from '../src/maps.mjs';
import {stageDose} from '../src/progression.mjs';
import {test} from 'node:test';import assert from 'node:assert/strict';
import {grantReward,purchase,useConsumable,bridgeUnlocked,grantBookReward,bookDose} from '../src/economy.mjs';
const start=()=>({completed:[],doping:1e13,coins:0,purchased:[]});
test('root earns the same stage and reading rewards without prerequisites, once only',()=>{
 const root={...start(),name:'공수교대',studentId:'099746'};
 const index=10,q={id:stageDefinitions[index].questId,dose:stageDose(index),coins:30};
 const ordinary={...start(),completed:[0,1,2,...stageDefinitions.slice(0,index).map(s=>s.questId)]};
 const expected=grantReward(ordinary,q,()=>.3),actual=grantReward(root,q,()=>.3);
 assert.deepEqual(root.completed,[]);assert.equal(root.doping,1e13);
 assert.deepEqual(actual.completed,[q.id]);assert.equal(actual.doping,expected.doping);
 assert.equal(actual.coins,expected.coins);assert.deepEqual(actual.purchased,expected.purchased);
 assert.equal(grantReward(actual,q),actual);
 const book=grantBookReward(root,index,()=>.3),normalBook=grantBookReward(ordinary,index,()=>.3);
 assert.equal(book.doping,normalBook.doping);assert.deepEqual(book.completed,[]);
 assert.deepEqual(book.readBooks,[index]);assert.equal(grantBookReward(book,index),book);
});
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
  const q={id:stageDefinitions[i].questId,dose:stageDose(i),coins:30};
  if(i===0||i===1||i===6){assert.equal(grantReward(s,q,()=>.3),s);s={...s,puzzle_completed:[...(s.puzzle_completed??[]),i]};}
  s=grantReward(s,q,()=>.3);assert.equal(grantReward(s,q),s);
 }
 assert.ok(Math.abs(s.doping-9.5e20)<1e7);assert.equal(new Set(s.purchased).size,s.purchased.length);
});
test('an experiment stage grants no completion or reward until its experiment is saved',()=>{
 const index=6,q={id:stageDefinitions[index].questId,dose:stageDose(index),coins:30};
 const before={...start(),completed:[0,1,2,...stageDefinitions.slice(0,index).map(s=>s.questId)],puzzle_completed:[],doping:1e14};
 assert.equal(grantReward(before,q),before);
 const after={...before,puzzle_completed:[6]};
 const complete=grantReward(after,q,()=>.3);
 assert.ok(complete.completed.includes(q.id));assert.equal(complete.coins,30);
 assert.equal(grantReward(complete,q),complete);
});
test('Stage 1 quiz reward waits for the 5-atom experiment',()=>{
 const before={...start(),completed:[0,1,2],puzzle_completed:[],doping:1e14};
 const quest={id:stageDefinitions[0].questId,dose:stageDose(0),coins:30};
 assert.equal(grantReward(before,quest),before);
 const after=grantReward({...before,puzzle_completed:[0]},quest,()=>.3);
 assert.ok(after.completed.includes(quest.id));assert.equal(after.coins,30);
 assert.equal(grantReward(after,quest),after);
});
test('each crossed level grants unique loot including pack purchases',()=>{
 let s={...start(),completed:[0,1,2],puzzle_completed:[0],doping:1e14};
 s=grantReward(s,{id:3,dose:9.9e15,coins:30},()=>0);assert.equal(s.purchased.length,2);
 const before=s;s=purchase({...s,doping:9.9e16,coins:20},{id:'T03',price:10},false,()=>0);assert.equal(s.purchased.length,before.purchased.length+1);
 const saved=JSON.parse(JSON.stringify(s));assert.deepEqual(saved.purchased,s.purchased);
});
test('shop checks coins, prevents duplicate equipment purchase, no spending at max XP',()=>{
 const hat={id:'H02',price:60},pack={id:'T03',price:10};let s=start();assert.equal(purchase(s,hat),s);s={...s,coins:80};s=purchase(s,hat);assert.equal(s.coins,20);assert.deepEqual(s.purchased,['H02']);assert.equal(purchase(s,hat),s);
 s=purchase(s,pack);assert.equal(s.coins,10);assert.equal(s.doping,1e13);assert.equal(s.quantities.T03,1);s=useConsumable(s,'T03');assert.equal(s.doping,1.9e13);assert.equal(s.quantities.T03,0);assert.equal(useConsumable(s,'T03'),s);s={...s,doping:1e21};assert.equal(useConsumable(s,'T03'),s);
});


test('book completion awards two percent once and persists across reload',()=>{
 let s={...start(),completed:[0,1,2],doping:1e14};assert.equal(grantBookReward(s,1),s);
 const after=grantBookReward(s,0,()=>0);assert.equal(after.doping,s.doping+bookDose(0));assert.deepEqual(after.readBooks,[0]);assert.equal(after.coins,s.coins);assert.deepEqual(after.completed,s.completed);
 const restored=JSON.parse(JSON.stringify(after));assert.equal(grantBookReward(restored,0),restored);
 const capped=grantBookReward({...s,doping:1e21},0);assert.equal(capped.doping,1e21);assert.deepEqual(capped.readBooks,[0]);
});



test('consumables double prices per item and must be used before repurchase',()=>{
 for(const id of ['T03','T04','T05']){
  const item={id,price:id==='T03'?30:60};let s={...start(),coins:10000,type:'n'};
  for(let count=0;count<4;count++){
   const before=s.coins;s=purchase(s,item);
   assert.equal(before-s.coins,item.price*2**count);
   assert.equal(s.purchaseCounts[id],count+1);
   assert.equal(s.quantities[id],1);assert.equal(purchase(s,item),s);
   s=JSON.parse(JSON.stringify(useConsumable(s,id,()=>0)));
   assert.equal(s.quantities[id],0);
  }
 }
});
test('legacy purchases start at zero while all existing stock must be used first',()=>{
 const item={id:'T04',price:60};let s={...start(),coins:1000,purchased:['T04'],quantities:{T04:2}};
 assert.equal(purchase(s,item),s);s=useConsumable(s,'T04');assert.equal(purchase(s,item),s);
 s=useConsumable(s,'T04');const next=purchase(s,item);
 assert.equal(next.coins,940);assert.equal(next.purchaseCounts.T04,1);
});
test('donor purchases do not increase acceptor price and unaffordable purchases change nothing',()=>{
 let s=purchase({...start(),coins:200},{id:'T04',price:60});
 s=purchase(s,{id:'T05',price:60});assert.equal(s.coins,80);
 s=useConsumable(s,'T04');assert.equal(purchase(s,{id:'T04',price:60}),s);
 const overflow={...start(),coins:1e9,purchaseCounts:{T03:2000}};
 assert.equal(purchase(overflow,{id:'T03',price:30}),overflow);
});
