import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {stageDefinitions} from '../src/maps.mjs';
import {fromStoredSave,toStoredSave} from '../src/completion-save.mjs';
test('current stage indices never convert based on an older layout marker',()=>{
 assert.deepEqual(stageDefinitions.map(s=>s.name),['결정 동굴','에너지 밴드 계곡','캐리어 습지','드리프트 협곡','확산 사막','BJT 오션','FET 정글','광전자 협곡','게이트 혁신 도시','기억의 영속성','전력 반도체 요새','첨단 패키징 공장']);
 for(let i=0;i<12;i++)for(const layout of [undefined,2,3]){
  const stored=toStoredSave({stage_layout:layout,tutorial_completed:[0],stage_completed:[i],readBooks:[i],puzzle_completed:[i],area:`stage-${i+1}`});
  assert.deepEqual(stored.stage_completed,[i]);assert.deepEqual(stored.readBooks,[i]);assert.deepEqual(stored.puzzle_completed,[i]);assert.equal(stored.area,`stage-${i+1}`);
  assert.deepEqual(fromStoredSave(stored).completed,[0,stageDefinitions[i].questId].sort((a,b)=>a-b));
 }
});
function fixture(rows){
 const original=structuredClone(rows);let backed=false,flushed=false,released=false;
 const sheet={getLastRow:()=>rows.length+1,getParent:()=>({}),copyTo:()=>{backed=true;return {setName(){}};},getRange(r,c,n,m){return {getValues:()=>rows.slice(r-2,r-2+n).map(row=>row.slice(c-1,c-1+m)),setValues(values){assert.ok(backed);values.forEach((row,i)=>row.forEach((v,j)=>rows[r-2+i][c-1+j]=v));}};}};
 const ctx=vm.createContext({LockService:{getScriptLock:()=>({waitLock(){},releaseLock(){released=true;}})},SpreadsheetApp:{flush(){flushed=true;}}});
 vm.runInContext(fs.readFileSync('google-apps-script/Code_v11.gs','utf8'),ctx);
 ctx.studentsSheet_=()=>sheet;ctx.koreaTimestamp_=()=> '2026-09-15 18:00:00';
 return {ctx,original,state:()=>({backed,flushed,released})};
}
const makeRow=id=>[id,'학생',123456,'p',123,'C01,C03,H07,T02',JSON.stringify({item_schema:3,studentId:id,name:'학생',character:{clothing:'C03',hat:'H07'},completed:[0,3],tutorial_completed:[0,1,2],stage_completed:[6],readBooks:[6],puzzle_completed:[6],fetPuzzleCompleted:true,doping:123456,coins:123,type:'p',quantities:{T02:2},purchased:['H07'],area:'stage-7'}),7,'old','created','salt','hash'];
test('bulk reset clears all accounts including root while retaining non-learning data and granted items',()=>{
 const rows=[makeRow('22221111'),makeRow('099746')],{ctx,original,state}=fixture(rows);
 assert.match(ctx.resetAllLearningProgress(),/2개 계정/);
 for(let i=0;i<rows.length;i++){
  const before=JSON.parse(original[i][6]),after=JSON.parse(rows[i][6]);
  for(const key of ['tutorial_completed','stage_completed','readBooks','puzzle_completed'])assert.deepEqual(after[key],[]);
  for(const key of ['completed','fetPuzzleCompleted'])assert.equal(key in after,false);
  for(const key of ['character','doping','coins','type','quantities'])assert.deepEqual(after[key],before[key]);
  assert.equal(after.area,'village');
  assert.ok(after.purchased.includes('C03'));assert.ok(after.purchased.includes('T02'));
  assert.deepEqual(rows[i].slice(0,5),original[i].slice(0,5));assert.deepEqual(rows[i].slice(9),original[i].slice(9));assert.equal(rows[i][7],8);
 }
 assert.deepEqual(state(),{backed:true,flushed:true,released:true});
});
test('invalid JSON aborts before any account is changed and empty sheets need no ranges',()=>{
 const rows=[makeRow('22221111'),makeRow('22221112')];rows[1][6]='broken';const f=fixture(rows);
 assert.throws(()=>f.ctx.resetAllLearningProgress(),/saveJson/);assert.deepEqual(rows,f.original);assert.equal(f.state().backed,false);assert.equal(f.state().released,true);
 const empty=fixture([]);assert.match(empty.ctx.resetAllLearningProgress(),/없습니다/);
});

test('reset returns every stage and adventure account to the village spawn',()=>{
 for(const area of ['village','adventure',...Array.from({length:12},(_,i)=>`stage-${i+1}`)]){
  const row=makeRow('22221111');row[6]=JSON.stringify({...JSON.parse(row[6]),area});
  const {ctx}=fixture([row]);ctx.resetAllLearningProgress();
  assert.equal(JSON.parse(row[6]).area,'village');
 }
});
