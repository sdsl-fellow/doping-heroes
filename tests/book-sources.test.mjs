import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {grantBookReward,bookDose} from '../src/economy.mjs';
import {bookSources} from '../src/book-progress.mjs';
import {toStoredSave,fromStoredSave} from '../src/completion-save.mjs';
const first='SE01-CRYSTAL-2026',second='SE02-ATOMS-2026';
const initial=()=>({completed:[0,1,2],readBooks:[],doping:1e14,coins:0,purchased:[]});
test('legacy Stage 1 completion belongs only to material 1',()=>{
 const old={...initial(),readBooks:[0]};
 assert.deepEqual(bookSources(old),[first]);
 const next=grantBookReward(old,0,()=>0,second);
 assert.ok(Math.abs(next.doping-old.doping-bookDose(0))<1);
 assert.deepEqual(next.readBookSources,[first,second]);
 assert.equal(grantBookReward(next,0,()=>0,second),next);
 assert.equal(grantBookReward(next,0,()=>0,first),next);
});
test('material 2 can be read first and does not complete material 1',()=>{
 const start=initial(),s=grantBookReward(start,0,()=>0,second);
 const restored=fromStoredSave(toStoredSave(s));
 assert.deepEqual(bookSources(restored),[second]);
 const both=grantBookReward(restored,0,()=>0,first);
 assert.ok(Math.abs(both.doping-start.doping-2*bookDose(0))<1);
 assert.equal(grantBookReward(both,0,()=>0,'invented-source'),both);
});
test('server round trip preserves independent source records and migrates legacy saves',()=>{
 const code=fs.readFileSync('google-apps-script/Code_v18.gs','utf8'),c=vm.createContext({});vm.runInContext(code,c);
 const normalize=s=>JSON.parse(JSON.stringify(c.normalizeSave_(s,'22221111','테스트')));
 assert.deepEqual(normalize({...initial(),readBooks:[0]}).readBookSources,[first]);
 const once=grantBookReward(initial(),0,()=>0,second),saved=normalize(toStoredSave(once));
 assert.deepEqual(saved.readBookSources,[second]);
 assert.deepEqual(normalize(c.toStoredSave(saved)).readBookSources,[second]);
 assert.deepEqual(normalize({...initial(),readBookSources:[]}).readBookSources,[]);
 assert.ok(code.includes('save.readBookSources = [];'));
});
