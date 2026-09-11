import test from 'node:test';
import assert from 'node:assert/strict';
import {isRootAccount,validStudentId} from '../src/access.mjs';
import {stageUnlocked} from '../src/maps.mjs';
test('development account can enter all stages without changing progress',()=>{
 const account={name:'공수교대',studentId:'099746'},completed=[];
 assert.equal(validStudentId(account.name,account.studentId),true);
 for(let i=0;i<12;i++)assert.equal(stageUnlocked(completed,i,isRootAccount(account)),true);
 assert.deepEqual(completed,[]);
 assert.equal(stageUnlocked([],12,true),false);
});
test('root access requires both identifiers and preserves ordinary progression',()=>{
 for(const account of [{name:'다른 이름',studentId:'099746'},{name:'공수교대',studentId:'99746'},{name:'공수교대',studentId:'0099746'},{name:'공수교대',studentId:'20260001'},null]){
  assert.equal(isRootAccount(account),false);
  assert.equal(stageUnlocked([],0,isRootAccount(account)),false);
 }
 assert.equal(validStudentId('학생','099746'),false);
 assert.equal(validStudentId('학생','20260001'),true);
 assert.equal(stageUnlocked([0,1,2],0),true);
 assert.equal(stageUnlocked([0,1,2],1),false);
});
