import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const code=fs.readFileSync('google-apps-script/Code_v22.gs','utf8');
test('v22 keeps legacy questions and records a new category without shifting existing columns',()=>{
 const c=vm.createContext({console});vm.runInContext(code,c);
 const headers=['questionId','studentId','studentName','stage','subject','question','answer','answeredBy','status','createdAt','answeredAt'];
 const rows=[headers,['old-request','student-a','기존 학생',3,'예전 질문','기존 내용','','','답변대기','2026-09-24T12:00:00+09:00','']];
 const sheet={getLastColumn:()=>headers.length,getLastRow:()=>rows.length,getMaxRows:()=>1000,getRange:(row,col=1,height=1,width=1)=>{
  const range={getValues:()=>Array.from({length:height},(_,i)=>Array.from({length:width},(_,j)=>rows[row+i-1]?.[col+j-1]??'')),getValue:()=>rows[row-1]?.[col-1]??'',setNumberFormat:()=>range,setValue:v=>range.setValues([[v]]),setValues:values=>{values.forEach((line,i)=>{rows[row+i-1]??=Array(headers.length).fill('');line.forEach((v,j)=>rows[row+i-1][col+j-1]=v);});return range;}};return range;
 }};
 c.verifyToken_=()=>({studentId:'student-a'});c.questionsSheet_=()=>sheet;
 c.studentsSheet_=()=>({getRange:()=>({getValue:()=> '새 학생'})});c.findStudentRow_=()=>2;
 c.koreaTimestamp_=()=> '2026-09-25T12:00:00+09:00';c.LockService={getScriptLock:()=>({waitLock(){},releaseLock(){}})};
 const create=(category,id)=>c.questionsAction_({action:'qaCreate',token:'student-a',requestId:id,subject:'새 질문',question:'질문 내용입니다.',category});
 const list=()=>c.questionsAction_({action:'qaList',token:'student-a'}).qa.questions;
 assert.equal(list()[0].category,'일반 질문');assert.equal(list()[0].stage,3);
 assert.throws(()=>create('실험','invalid-category-request-123456'),/분류/);
 assert.equal(headers.length,11);
 const first=create('제안','valid-category-request-123456');
 assert.equal(headers[11],'category');assert.equal(rows[1][3],3);assert.equal(rows[1][4],'예전 질문');
 assert.equal(rows[2][3],0);assert.equal(rows[2][11],'제안');assert.equal(first.qa.questions[0].category,'제안');
 create('기타','another-category-request-12345');
 assert.equal(rows[3][11],'기타');assert.equal(headers.length,12);
 assert.equal(create('제안','valid-category-request-123456').qa.questions[0].category,'제안');
 assert.equal(rows.length,4);
});
