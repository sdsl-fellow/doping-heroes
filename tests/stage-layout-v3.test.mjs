import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {stageDefinitions} from '../src/maps.mjs';
import {fromStoredSave,toStoredSave,toLegacyStageSave,legacyStageQuestIds,oldToNewStage} from '../src/completion-save.mjs';
test('twelve requested topics appear in order; old records migrate by stable quest identity',()=>{
 assert.deepEqual(stageDefinitions.map(s=>s.name),['결정 동굴','에너지 밴드 계곡','캐리어 습지','드리프트 협곡','확산 사막','BJT 오션','FET 정글','광전자 협곡','게이트 혁신 도시','기억의 영속성','전력 반도체 요새','첨단 패키징 공장']);
 for(let old=0;old<12;old++){
  const input={completion_schema:2,stage_completed:[old],tutorial_completed:[0],readBooks:[old],puzzle_completed:[old],area:`stage-${old+1}`,coins:99,purchased:['H07']};
  const current=fromStoredSave(input),next=oldToNewStage[old];
  assert.deepEqual(current.completed,[0,legacyStageQuestIds[old]]);
  assert.deepEqual(current.readBooks,[next]);assert.deepEqual(current.puzzle_completed,[next]);assert.equal(current.area,`stage-${next+1}`);
  assert.deepEqual(fromStoredSave(current),current);
  assert.deepEqual(fromStoredSave(toStoredSave(current)),current);
  assert.deepEqual(fromStoredSave(toLegacyStageSave(current)),current);
 }
});
test('new game round-trips all twelve stage records through actual v8 and v9 normalizers',()=>{
 for(const version of [8,9]){
  const ctx=vm.createContext({});vm.runInContext(fs.readFileSync(`google-apps-script/Code_v${version}.gs`,'utf8'),ctx);
  for(let stage=0;stage<12;stage++){
   const current={stage_layout:3,completed:[0,1,2,stageDefinitions[stage].questId],readBooks:[stage],puzzle_completed:[stage],area:`stage-${stage+1}`,coins:73,character:{hat:'H07'},purchased:['H07']};
   ctx.input=version===8?toLegacyStageSave(current):current;
   const stored=JSON.parse(JSON.stringify(vm.runInContext('toStoredSave(normalizeSave_(input,"22221111","학생"))',ctx)));
   const restored=fromStoredSave(stored);
   assert.deepEqual(restored.completed,current.completed);assert.deepEqual(restored.readBooks,[stage]);assert.deepEqual(restored.puzzle_completed,[stage]);assert.equal(restored.area,current.area);assert.equal(restored.coins,73);
  }
 }
});
