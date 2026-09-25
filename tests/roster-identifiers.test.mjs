import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

test('roster matches numeric cells despite display formatting and accepts rostered special IDs',()=>{
 const context=vm.createContext({
  PropertiesService:{getScriptProperties:()=>({getProperty:key=>key==='ROOT_STUDENT_ID'?'099746':key==='ROOT_NAME'?'공수교대':''})}
 });
 vm.runInContext(fs.readFileSync('google-apps-script/Code.gs','utf8'),context);
 const rows=[['studentId','name'],[20261234,'숫자 학생'],['TA-01','조교'],[12345,'특별 수강생'],['00001234','문자 ID']];
 const displays=[['studentId','name'],['2.02612E+07','숫자 학생'],['TA-01','조교'],['12,345','특별 수강생'],['00001234','문자 ID']];
 const sheet={
  getLastRow:()=>rows.length,
  getRange(start,column,count,width){return {
   getValues:()=>rows.slice(start-1,start-1+count).map(row=>row.slice(column-1,column-1+width)),
   getDisplayValues:()=>displays.slice(start-1,start-1+count).map(row=>row.slice(column-1,column-1+width))
  };}
 };
 context.rosterSheet_=()=>sheet;
 for(const id of ['20261234','TA-01','12345','00001234']){
  assert.ok(context.rosterStudent_(id),id);
  assert.ok(context.findStudentRow_(sheet,id),id);
 }
 assert.equal(context.rosterStudent_('00012345'),null);
 assert.equal(context.requireStudentId_('ta-01'),'TA-01');
 assert.equal(context.canonicalStudentId_('12345'),'12345');
 assert.equal(context.canonicalStudentId_('00001234'),'00001234');
 assert.throws(()=>context.requireStudentId_('TA 01'),/1~20자/);
});
