import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
test('inventory success and revision conflict never query stage sheet; ordinary saves still do',()=>{
 const ctx=vm.createContext({});
 vm.runInContext(fs.readFileSync('google-apps-script/Code_v8.gs','utf8')+`
 var reads=0,writes=0,released=0;
 LockService={getScriptLock:()=>({waitLock:()=>{},releaseLock:()=>{released++;}})};
 verifyToken_=()=>({studentId:'22221111',role:'student'});
 const row=STUDENT_HEADERS.map(h=>h==='revision'?4:h==='saveJson'?JSON.stringify({item_schema:3,character:{hat:'H06'}}):h==='name'?'학생':'');
 studentsSheet_=()=>({getRange:()=>({getValues:()=>[row]})});
 findStudentRow_=()=>2;
 writeStudentProgress_=()=>{writes++;};audit_=()=>{};
 readStages_=()=>{reads++;return [true];};koreaTimestamp_=()=>'';
 `,ctx);
 for(const revision of [4,3]){
  ctx.request={token:'test',baseRevision:revision,includeStages:false,save:{item_schema:3,name:'학생',character:{hat:'H06'}}};
  const result=vm.runInContext('saveStudent_(request)',ctx);
  assert.equal('stages' in result,false);assert.equal(vm.runInContext('reads',ctx),0);
  assert.equal(result.ok,revision===4);assert.equal(result.student.save.character.hat,'H06');
 }
 ctx.request.includeStages=true;ctx.request.baseRevision=4;
 assert.deepEqual(Array.from(vm.runInContext('saveStudent_(request).stages',ctx)),[true]);
 assert.equal(vm.runInContext('writes',ctx),2);assert.equal(vm.runInContext('released',ctx),3);
});
