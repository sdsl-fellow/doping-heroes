import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {catalog,catalogItem,inventoryIds} from '../src/catalog.mjs';
import {normalizeItemSave,toCloudItemSave} from '../src/item-save.mjs';
const oldNames={F:['basic','boots','sandals','snowboots','moss-boots','violet-boots','crystal-boots','lab-shoes','cleanroom-shoes','electron-boots'],H:['cap','trailcap','forest-cap','sun-cap','miner-helmet','crystal-cap','moon-cap','process-hat','cleanroom-hood','silicon-crown']};
test('requested ordering retains each original artwork and ascending purchase prices',()=>{
 assert.deepEqual(catalog.filter(i=>i.slot==='shoes').map(i=>i.name),['기본 신발','사막 샌들','이끼 부츠','탐험 부츠','설산 부츠','보랏빛 부츠','결정 부츠','연구실 안전화','클린룸 방진화','전자 질주화']);
 assert.deepEqual(catalog.filter(i=>i.slot==='hat').map(i=>i.name),['숲길 모자','푸른 탐험 모자','햇살 모자','광부 안전모','깊은 숲 모자','달빛 모자','결정 모자','공정 마법사 모자','클린룸 후드','실리콘 왕관']);
 for(const [prefix,names] of Object.entries(oldNames))for(const [index,name] of names.entries())assert.equal(catalogItem(name).assetCode,prefix+String(index+1).padStart(2,'0'));
 assert.ok(inventoryIds({completed:[0],purchased:[]}).includes('F04'));
 assert.equal(catalogItem('F04').price,null);
});
test('all old footwear and hats migrate once, preserving ownership across both server versions',()=>{
 const context=vm.createContext({});
 const source=fs.readFileSync('google-apps-script/Code.gs','utf8');
 vm.runInContext(source.slice(source.indexOf('// BEGIN GENERATED ITEM RULES')),context);
 for(const [prefix,names] of Object.entries(oldNames))for(const [index,name] of names.entries()){
  const old=prefix+String(index+1).padStart(2,'0'),slot=prefix==='F'?'shoes':'hat';
  const save={character:{[slot]:old},purchased:[old],coins:97,completed:[0],readBooks:[1],quantities:{T03:2}};
  const next=normalizeItemSave(save),expected=catalogItem(name).id;
  assert.equal(next.character[slot],expected);assert.deepEqual(next.purchased,[expected]);
  assert.deepEqual(normalizeItemSave(next),next);
  const wire=toCloudItemSave(next);
  const {item_schema,...oldServer}=wire;
  assert.deepEqual(normalizeItemSave(oldServer),next);
  context.input=wire;
  assert.deepEqual(JSON.parse(JSON.stringify(vm.runInContext('normalizeItemSave(input)',context))),next);
  context.input=save;
  assert.deepEqual(JSON.parse(JSON.stringify(vm.runInContext('normalizeItemSave(input)',context))),next);
 }
});

test('schema 2 crystal and moon hats swap exactly once and survive v2 server replies',()=>{
 for(const [old,current] of [['H06','H07'],['H07','H06']]){
  const input={item_schema:2,character:{hat:old},purchased:[old],coins:120};
  const next=normalizeItemSave(input);
  assert.equal(next.character.hat,current);assert.deepEqual(next.purchased,[current]);
  assert.equal(next.item_schema,3);assert.deepEqual(normalizeItemSave(next),next);
  const wire=toCloudItemSave(next);
  // v2 server changes only the earlier footwear/hat ordering, leaving H06/H07 intact.
  assert.deepEqual(normalizeItemSave({...wire,item_schema:2}),next);
 }
});
