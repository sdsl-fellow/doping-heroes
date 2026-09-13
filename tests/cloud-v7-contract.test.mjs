import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import {toCloudItemSave,normalizeItemSave} from '../src/item-save.mjs';
import {fromStoredSave} from '../src/completion-save.mjs';
test('Pages save payload survives exact Code_v7 normalizer and response without ID reversal',()=>{
 const ctx=vm.createContext({});
 vm.runInContext(fs.readFileSync('google-apps-script/Code_v7.gs','utf8')+'\nreadStages_=()=>[];koreaTimestamp_=()=>"2026-09-13T09:00:00+09:00";',ctx);
 for(const hat of ['H06','H07']){
  ctx.input=toCloudItemSave({item_schema:3,character:{hat},purchased:['H06','H07'],coins:123,completed:[0,1],puzzle_completed:[10],readBooks:[2]});
  const response=vm.runInContext('studentResponse_("22221111","학생",normalizeSave_(input,"22221111","학생"),4,null)',ctx);
  const saved=JSON.parse(JSON.stringify(response.student.save));
  assert.equal(saved.item_schema,3);assert.equal(saved.character.hat,hat);
  assert.deepEqual(saved.purchased,['H06','H07']);assert.equal(saved.coins,123);
  assert.equal(normalizeItemSave(fromStoredSave(saved)).character.hat,hat);
 }
});
