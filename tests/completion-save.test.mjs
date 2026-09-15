import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {completionIds,fromStoredSave,toStoredSave} from '../src/completion-save.mjs';
test('legacy quest IDs split without changing other progress or rewards',()=>{
 const old={completed:[0,1,2,3,14,3],readBooks:[0,11],coins:43,purchased:['C10']};
 const stored=toStoredSave(old);
 assert.deepEqual(stored,{readBooks:[0,10],coins:43,purchased:['C10'],stage_layout:3,completion_schema:3,tutorial_completed:[0,1,2],stage_completed:[0,10],puzzle_completed:[]});
 assert.deepEqual(fromStoredSave(stored),{...old,stage_layout:3,readBooks:[0,10],completed:[0,1,2,3,14],puzzle_completed:[]});
 assert.deepEqual(toStoredSave(stored),stored);
});
test('new fields are authoritative, bounded and deduplicated',()=>{
 assert.deepEqual(completionIds({completed:[0,1,2,3,14],tutorial_completed:[],stage_completed:[0,11,11,12,-1,'1']}),[3,14]);
 assert.deepEqual(completionIds({tutorial_completed:[0,2,3],stage_completed:[]}),[0,2]);
});
test('all 32768 completion combinations survive local and Apps Script round trips',()=>{
 const ctx=vm.createContext({});vm.runInContext(fs.readFileSync('google-apps-script/Code.gs','utf8'),ctx);
 for(let mask=0;mask<32768;mask++){
  const completed=Array.from({length:15},(_,i)=>i).filter(i=>mask&(1<<i));
  const old={completed,readBooks:[0,11],coins:50,purchased:[]};
  const stored=toStoredSave(old);
  const server=ctx.normalizeSave_(JSON.parse(JSON.stringify(stored)),'20260001','학생');
  assert.equal(JSON.stringify(server.completed),JSON.stringify(completed));
  const row=ctx.studentRow_('20260001','학생',server,1,'','', '', '');
  const json=JSON.parse(row[6]);assert.equal('completed' in json,false);
  assert.deepEqual(json.tutorial_completed,stored.tutorial_completed);
  assert.deepEqual(json.stage_completed,stored.stage_completed);
  assert.deepEqual(fromStoredSave(json).completed,completed);
  assert.deepEqual(json.readBooks,[0,10]);
 }
});
