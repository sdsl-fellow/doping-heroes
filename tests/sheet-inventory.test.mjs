import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
import {inventoryIds} from '../src/catalog.mjs';
const context=vm.createContext({Utilities:{formatDate(date,zone){
 assert.equal(zone,'Asia/Seoul');return new Date(date.getTime()+9*3600000).toISOString().slice(0,19);
}}});
vm.runInContext(fs.readFileSync('google-apps-script/Code.gs','utf8'),context);
test('Apps Script ownership rules are generated from the game source',()=>{
 execFileSync(process.execPath,['scripts/sync-apps-script-items.mjs','--check']);
});
test('sheet items match the inventory for defaults, quests, loot, tools and root',()=>{
 for(const partial of [{},{completed:[0]},{completed:[0,1,2]},
 {purchased:['C10','C10','moon-sword'],readBooks:[0],quantities:{T04:2}},
 {name:'공수교대',studentId:'099746'}]){
  const save={name:'학생',studentId:'20260001',completed:[],purchased:[],coins:0,...partial};
  const expected=inventoryIds(save);
  assert.equal(context.studentRow_(save.studentId,save.name,save,1,'','', '', '')[5],expected.join(','));
  assert.equal(new Set(expected).size,expected.length);assert.ok(!expected.includes('none'));
 }
 assert.deepEqual(inventoryIds({}),['C01','C02','C03','F01','A01','A02']);
 assert.equal(inventoryIds({name:'공수교대',studentId:'099746'}).length,60);
});
test('UTC timestamps become Seoul time once, including date rollover',()=>{
 assert.equal(context.seoulCellTime_('2026-09-12T18:30:00.000Z'),'2026-09-13T03:30:00+09:00');
 assert.equal(context.seoulCellTime_('2026-09-13T03:30:00+09:00'),'2026-09-13T03:30:00+09:00');
 assert.equal(context.seoulCellTime_('2026-09-12 18:30:00'),'2026-09-12 18:30:00');
 assert.equal(context.seoulCellTime_(''),'');
});
