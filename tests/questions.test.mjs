import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const code=fs.readFileSync('google-apps-script/Code_v19.gs','utf8');
const plain=x=>JSON.parse(JSON.stringify(x));
function fixture(){
 const c=vm.createContext({console});vm.runInContext(code,c);
 const headers=['questionId','studentId','studentName','stage','subject','question','answer','answeredBy','status','createdAt','answeredAt'];
 const rows=[headers];let locks=0,writes=0,lastWrite;
 const sheet={getLastColumn:()=>headers.length,getLastRow:()=>rows.length,getMaxRows:()=>1000,getName:()=> 'Questions',getParent:()=>({getId:()=> 'private-qa'}),getRange:(row,col=1,h=1,w=1)=>{
  const range={getValues:()=>Array.from({length:h},(_,i)=>Array.from({length:w},(_,j)=>rows[row+i-1]?.[col+j-1]??'')),getValue:()=>rows[row-1]?.[col-1]??'',setNumberFormat:()=>range,setValue:value=>range.setValues([[value]]),setValues:values=>{lastWrite=values;writes++;values.forEach((line,i)=>{rows[row+i-1]??=Array(headers.length).fill('');line.forEach((v,j)=>rows[row+i-1][col+j-1]=typeof v==='string'&&v.startsWith("'")?v.slice(1):v);});return range;}};return range;}};
 c.verifyToken_=token=>{if(!['student-a','student-b'].includes(token))throw Error('UNAUTHORIZED');return {studentId:token,role:'student'};};
 c.questionsSheet_=()=>sheet;c.studentsSheet_=()=>({getRange:()=>({getValue:()=> '실제 이름'})});c.findStudentRow_=()=>2;
 c.koreaTimestamp_=()=> '2026-09-25T16:55:00+09:00';c.LockService={getScriptLock:()=>({waitLock(){locks++;},releaseLock(){locks--;}})};
 c.PropertiesService={getScriptProperties:()=>({getProperty:()=> 'private-qa'})};
 return {c,rows,headers,sheet,stats:()=>({locks,writes,lastWrite}),create:(extra={})=>c.questionsAction_({action:'qaCreate',token:'student-a',requestId:'request-id-1234567890a',subject:'질문 제목',question:'원자가 전자를 방출하는 이유가 궁금합니다.',stage:1,...extra}),list:(token='student-a',cursor='')=>plain(c.questionsAction_({action:'qaList',token,cursor})).qa};
}
test('questions authenticate ownership and never return another student or draft answer',()=>{
 const f=fixture();assert.throws(()=>f.list('forged'),/UNAUTHORIZED/);
 f.create({studentId:'student-b',studentName:'가짜 이름'});
 assert.equal(f.rows[1][1],'student-a');assert.equal(f.rows[1][2],'실제 이름');
 f.rows[1][6]='비공개 초안';f.rows[1][7]='조교';f.rows[1][8]='작성중';
 assert.equal(f.list().questions[0].answer,'');assert.equal(f.list().questions[0].answeredBy,'');assert.equal(f.list('student-b').questions.length,0);
 f.rows[1][8]='답변완료';assert.equal(f.list().questions[0].answer,'비공개 초안');
 f.rows[1][8]='작성중';assert.equal(f.list().questions[0].answer,'');
});
test('create retries are idempotent, spoofed writes ignored, cell formulas escaped',()=>{
 const f=fixture();f.create({subject:'=IMPORTXML("x","y")',answer:'학생이 위조한 답',status:'답변완료'});
 assert.ok(f.stats().lastWrite[0][4].startsWith("'="));
 f.create();assert.equal(f.rows.length,2);assert.equal(f.stats().writes,1);assert.equal(f.stats().locks,0);
 assert.equal(f.list().questions[0].status,'답변대기');assert.equal(f.list().questions[0].answer,'');
 assert.throws(()=>f.create({token:'student-b'}),/질문 요청 번호/);assert.equal(f.stats().locks,0);
 assert.throws(()=>f.create({question:'x'.repeat(2001)}),/최대 2000/);
 assert.throws(()=>f.create({subject:' '}),/제목/);assert.throws(()=>f.create({stage:13}),/스테이지/);
});
test('own questions paginate newest first with no duplicates',()=>{
 const f=fixture();for(let i=0;i<35;i++)f.create({requestId:'request-id-1234567890-'+String(i).padStart(3,'0')});
 const page=f.list();assert.equal(page.questions.length,30);assert.equal(page.questions[0].id,'request-id-1234567890-034');
 const next=f.list('student-a',page.nextCursor);assert.equal(next.questions.length,5);assert.equal(next.nextCursor,'');
 assert.equal(new Set([...page.questions,...next.questions].map(q=>q.id)).size,35);
});
test('teacher edits timestamp only published answers and clear timestamp on withdrawal',()=>{
 const f=fixture();f.create();f.rows[1][6]='답변';f.rows[1][8]='답변완료';
 const e={range:{getSheet:()=>f.sheet,getColumn:()=>9,getLastColumn:()=>9,getRow:()=>2,getLastRow:()=>2}};
 f.c.questionsEditedV19(e);assert.equal(f.rows[1][10],'2026-09-25T16:55:00+09:00');
 f.rows[1][8]='작성중';f.c.questionsEditedV19(e);assert.equal(f.rows[1][10],'');assert.equal(f.stats().locks,0);
});
test('question routes do not save game state or return student records',()=>{
 const f=fixture();f.c.writeStudentProgress_=()=>{throw Error('unrelated game write');};
 assert.deepEqual(Object.keys(plain(f.create())).sort(),['ok','qa']);
 assert.equal(code,fs.readFileSync('google-apps-script/Code.gs','utf8'));
});
test('column reordering retains ownership and content; missing headers fail before writing',()=>{
 const f=fixture();[f.headers[1],f.headers[5]]=[f.headers[5],f.headers[1]];
 f.create();assert.equal(f.list().questions[0].question,'원자가 전자를 방출하는 이유가 궁금합니다.');assert.equal(f.list('student-b').questions.length,0);
 f.headers[1]='missing';assert.throws(()=>f.create({requestId:'another-request-123456789'}),/열 이름/);assert.equal(f.stats().writes,1);assert.equal(f.stats().locks,0);
});
test('setup reconnects an existing separate workbook and does not duplicate its edit trigger',()=>{
 const f=fixture();let creates=0,triggerCreates=0;const props=new Map([['QA_SPREADSHEET_ID','private-qa'],['SPREADSHEET_ID','operations'],['CONTENT_SPREADSHEET_ID','content']]);
 f.c.PropertiesService={getScriptProperties:()=>({getProperty:k=>props.get(k),setProperty:(k,v)=>props.set(k,v)})};
 const range={setNumberFormat(){return range;},setDataValidation(){return range;}};
 const sh={...f.sheet,setFrozenRows(){},setColumnWidths(){},setColumnWidth(){},getRange:()=>range};
 const ss={getSheetByName:()=>sh,setSpreadsheetTimeZone:zone=>assert.equal(zone,'Asia/Seoul'),getUrl:()=> 'private-sheet-url'};
 f.c.questionTable_=()=>({head:f.headers,rows:[]});
 const validation={requireValueInList(){return validation;},setAllowInvalid(){return validation;},build(){return {};}};
 f.c.SpreadsheetApp={openById:id=>{assert.equal(id,'private-qa');return ss;},create(){creates++;return ss;},newDataValidation:()=>validation};
 f.c.ScriptApp={getProjectTriggers:()=>[{getHandlerFunction:()=> 'questionsEditedV19',getTriggerSourceId:()=> 'private-qa'}],newTrigger(){triggerCreates++;}};
 f.c.console={log(){}};
 f.c.setupQuestionsV19();f.c.setupQuestionsV19();assert.equal(creates,0);assert.equal(triggerCreates,0);assert.equal(f.stats().locks,0);
 props.set('QA_SPREADSHEET_ID','operations');assert.throws(()=>f.c.setupQuestionsV19(),/분리/);assert.equal(f.stats().locks,0);
});
