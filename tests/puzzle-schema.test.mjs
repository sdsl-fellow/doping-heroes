import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {toStoredSave,fromStoredSave,puzzleIds} from '../src/completion-save.mjs';
test('FET legacy completion belongs to Stage 7, index 6',()=>{
 assert.deepEqual(puzzleIds({fetPuzzleCompleted:true}),[6]);
 assert.deepEqual(puzzleIds({fetPuzzleCompleted:false}),[]);
 for(let stage=0;stage<12;stage++){
  const save=toStoredSave({stage_layout:3,completed:[],puzzle_completed:[stage]});
  assert.deepEqual(save.puzzle_completed,[stage]);assert.ok(!('fetPuzzleCompleted' in save));
  assert.deepEqual(fromStoredSave(save).puzzle_completed,[stage]);
 }
 assert.deepEqual(puzzleIds({stage_layout:3,puzzle_completed:[0,11,11,12,-1,'2']}),[0,11]);
});
test('actual map quest order and v5 arrays migrate without progress loss',()=>{
 assert.deepEqual(toStoredSave({completed:[11]}).stage_completed,[7]);
 assert.deepEqual(toStoredSave({completed:[10]}).stage_completed,[6]);
 assert.deepEqual(toStoredSave({stage_completed:[8],tutorial_completed:[]}).stage_completed,[7]);
 assert.deepEqual(fromStoredSave({completion_schema:2,stage_completed:[1]}).completed,[11]);
});
test('obsolete column removal backs up first and preserves all other cells',()=>{
 const ctx=vm.createContext({});vm.runInContext(fs.readFileSync('google-apps-script/Code.gs','utf8'),ctx);
 const headers=['studentId','name','completedStages','doping','type','coins','items','saveJson','revision','updatedAt','createdAt','pinSalt','pinHash'];
 const data=[headers.slice(),['20260001','학생','0,1,2',1e13,'n',123,'C01','{"completed":[0,1,2]}',9,'updated','created','salt','hash']];
 let backup,deleted=0;
 const sheet={getLastRow:()=>data.length,getRange:(r,c,n,m)=>({getValues:()=>data.slice(r-1,r-1+n).map(row=>row.slice(c-1,c-1+m))}),copyTo(){backup=structuredClone(data);return {setName(){}};},deleteColumn(c){assert.ok(backup);deleted++;data.forEach(row=>row.splice(c-1,1));}};
 const ss={getSheetByName:()=>sheet};
 const current=headers.filter(h=>h!=='completedStages');
 ctx.ensureSheet_(ss,'Students',current);ctx.ensureSheet_(ss,'Students',current);
 assert.equal(deleted,1);assert.equal(data[1][10],'salt');assert.equal(data[1][11],'hash');assert.equal(data[1][6],backup[1][7]);assert.equal(data[1][7],9);
 const save=ctx.normalizeSave_({completed:[0,1,2],fetPuzzleCompleted:true},'20260001','학생');
 const row=ctx.studentRow_('20260001','학생',save,9,'','', 'salt','hash');
 assert.equal(row.length,12);assert.equal(row[10],'salt');assert.equal(row[11],'hash');
 assert.deepEqual(JSON.parse(row[6]).puzzle_completed,[6]);
});
test('save API uses the shifted revision and credential columns',()=>{
 const ctx=vm.createContext({});vm.runInContext(fs.readFileSync('google-apps-script/Code.gs','utf8'),ctx);
 vm.runInContext(`
 var current=['20260001','학생',1e13,'n',0,'C01','{}',7,'updated','created','salt','hash'];
 verifyToken_=()=>({studentId:'20260001',role:'student'});
 var LockService={getScriptLock:()=>({waitLock(){},releaseLock(){}})};
 studentsSheet_=()=>({getRange:()=>({getValues:()=>[current]})});
 findStudentRow_=()=>2;koreaTimestamp_=()=>'';audit_=()=>{};readStages_=()=>[];
 var captured;
 writeStudentProgress_=(sheet,row,id,name,save,revision,updated,created,salt,hash)=>{captured={revision,created,salt,hash,save};};
 `,ctx);
 const response=ctx.saveStudent_({baseRevision:7,save:{name:'학생',completed:[0],puzzle_completed:[10]}});
 assert.equal(response.ok,true);assert.equal(ctx.captured.revision,8);
 assert.equal(ctx.captured.created,'created');assert.equal(ctx.captured.salt,'salt');assert.equal(ctx.captured.hash,'hash');
 assert.deepEqual(JSON.parse(JSON.stringify(response.student.save.puzzle_completed)),[6]);
 assert.equal(ctx.saveStudent_({baseRevision:6,save:{name:'학생'}}).error.code,'REVISION_CONFLICT');
});
