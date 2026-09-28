// Included in the complete Code_v19.gs bundle; do not install twice.
const QUESTION_HEADERS=['questionId','studentId','studentName','stage','subject','question','answer','answeredBy','status','createdAt','answeredAt'];

function setupQuestionsV19(){
 const lock=LockService.getScriptLock();lock.waitLock(10000);
 try{
  const props=PropertiesService.getScriptProperties();let id=props.getProperty('QA_SPREADSHEET_ID');
  if(id&&[props.getProperty('SPREADSHEET_ID'),props.getProperty('CONTENT_SPREADSHEET_ID')].includes(id))throw new Error('질문답변 파일은 운영·학습 콘텐츠 파일과 분리해주세요.');
  const ss=id?SpreadsheetApp.openById(id):SpreadsheetApp.create('도핑 히어로즈_질문답변');
  if(!id){id=ss.getId();props.setProperty('QA_SPREADSHEET_ID',id);}
  ss.setSpreadsheetTimeZone('Asia/Seoul');
  let sheet=ss.getSheetByName('Questions');
  if(!sheet){const empty=ss.getSheets().find(s=>s.getLastRow()===0);sheet=empty?empty.setName('Questions'):ss.insertSheet('Questions');}
  if(sheet.getLastRow()===0)sheet.getRange(1,1,1,QUESTION_HEADERS.length).setValues([QUESTION_HEADERS]);
  questionTable_(sheet); // Validate before editing an existing file.
  sheet.setFrozenRows(1);sheet.setColumnWidths(1,11,110);sheet.setColumnWidth(5,180);sheet.setColumnWidth(6,300);sheet.setColumnWidth(7,300);
  sheet.getRange(1,1,sheet.getMaxRows(),11).setNumberFormat('@');
  sheet.getRange(2,9,Math.max(1,sheet.getMaxRows()-1),1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['답변대기','작성중','답변완료'],true).setAllowInvalid(false).build());
  if(!ss.getSheetByName('사용 안내')){
   const guide=ss.insertSheet('사용 안내');
   const rows=[['항목','사용 방법'],['조교 편집','answer에 답변, answeredBy에 표시할 이름을 작성한 뒤 status를 답변완료로 변경합니다.'],['비공개 초안','답변대기·작성중 상태의 answer는 학생에게 보이지 않습니다.'],['학생 조회','학생은 본인의 질문과 게시된 답변만 게임에서 확인합니다.'],['자동 기록','questionId, studentId, studentName, stage, subject, question, createdAt, answeredAt은 자동 관리합니다.'],['시간','createdAt과 answeredAt은 한국(서울) 시간입니다.'],['공유','이 파일만 조교에게 편집자로 공유하세요. 운영 데이터·학습 콘텐츠·Apps Script 프로젝트는 공유할 필요 없습니다.'],['순서','새 질문은 마지막 행에 추가되고 게임에서는 최신순으로 표시됩니다. 헤더 이름과 questionId는 변경하지 마세요.'],['수정·철회','게시된 답변을 고치면 다시 불러올 때 반영됩니다. status를 작성중으로 바꾸면 답변이 숨겨집니다.']];
   guide.getRange(1,1,rows.length,2).setValues(rows);guide.setColumnWidth(1,110);guide.setColumnWidth(2,650);guide.getRange(1,1,rows.length,2).setWrap(true);
  }
  if(!ScriptApp.getProjectTriggers().some(t=>t.getHandlerFunction()==='questionsEditedV19'&&t.getTriggerSourceId()===id))ScriptApp.newTrigger('questionsEditedV19').forSpreadsheet(id).onEdit().create();
  const url=ss.getUrl();console.log('질문답변 시트: '+url);return url;
 }finally{lock.releaseLock();}
}

function questionsSheet_(){
 const id=PropertiesService.getScriptProperties().getProperty('QA_SPREADSHEET_ID');
 if(!id)throw apiError_('QA_SETUP','질문 기능 준비 중입니다. 관리자가 setupQuestionsV19를 실행해주세요.');
 const sheet=SpreadsheetApp.openById(id).getSheetByName('Questions');
 if(!sheet)throw apiError_('QA_SETUP','질문답변 시트의 Questions 탭을 확인해주세요.');return sheet;
}
function questionTable_(sheet){
 const width=sheet.getLastColumn(),head=width?sheet.getRange(1,1,1,width).getValues()[0].map(String):[];
 if(QUESTION_HEADERS.some(k=>head.filter(h=>h===k).length!==1))throw apiError_('QA_HEADERS','Questions 열 이름을 확인해주세요.');
 const values=sheet.getLastRow()>1?sheet.getRange(2,1,sheet.getLastRow()-1,width).getValues():[];
 return {head,rows:values.map(row=>Object.fromEntries(head.map((key,i)=>[key,row[i]])))};
}
function questionPublic_(q){
 const published=String(q.status).trim()==='답변완료'&&String(q.answer||'').trim().length>0;
 return {id:String(q.questionId),stage:Number(q.stage)||0,subject:String(q.subject||''),question:String(q.question||''),status:published?'답변완료':'답변대기',createdAt:String(q.createdAt||''),answer:published?String(q.answer):'',answeredBy:published?String(q.answeredBy||'교수·조교'):'',answeredAt:published?String(q.answeredAt||''):''};
}
function questionText_(value,max,label){
 if(typeof value!=='string'||!value.trim()||value.trim().length>max)throw apiError_('QA_INPUT',label+'을 확인해주세요. (최대 '+max+'자)');return value.trim();
}
// Prefix text formulas before writing user input to Google Sheets.
function questionCell_(value){return typeof value==='string'&&/^[=+@-]/.test(value)?"'"+value:value;}
function questionsAction_(request){
 const auth=verifyToken_(request.token);
 if(request.action==='qaList'){
  const table=questionTable_(questionsSheet_()),cursor=typeof request.cursor==='string'?request.cursor:'';
  const key=q=>String(q.createdAt||'')+'|'+String(q.questionId);
  const own=table.rows.filter(q=>String(q.studentId)===auth.studentId&&q.questionId).sort((a,b)=>key(b).localeCompare(key(a)));
  const remaining=cursor?own.filter(q=>key(q)<cursor):own,page=remaining.slice(0,30);
  return {ok:true,qa:{questions:page.map(questionPublic_),nextCursor:remaining.length>30?key(page[page.length-1]):''}};
 }
 if(request.action!=='qaCreate')throw apiError_('UNKNOWN_ACTION','지원하지 않는 질문 요청입니다.');
 const id=String(request.requestId||'');
 if(!/^[a-zA-Z0-9_-]{20,80}$/.test(id))throw apiError_('QA_INPUT','질문 요청 번호를 확인해주세요.');
 const subject=questionText_(request.subject,80,'제목'),question=questionText_(request.question,2000,'질문 내용'),stage=Number(request.stage);
 if(!Number.isInteger(stage)||stage<0||stage>12)throw apiError_('QA_INPUT','질문 스테이지를 확인해주세요.');
 const lock=LockService.getScriptLock();lock.waitLock(10000);
 try{
  const sheet=questionsSheet_(),table=questionTable_(sheet),existing=table.rows.find(q=>String(q.questionId)===id);
  if(existing){if(String(existing.studentId)!==auth.studentId)throw apiError_('QA_REQUEST','질문 요청 번호를 다시 생성해주세요.');return {ok:true,qa:{questions:[questionPublic_(existing)],nextCursor:''}};}
  const students=studentsSheet_(),row=findStudentRow_(students,auth.studentId);
  if(!row)throw apiError_('ACCOUNT_NOT_FOUND','등록된 계정을 확인해주세요.');
  const name=String(students.getRange(row,STUDENT_HEADERS.indexOf('name')+1).getValue());
  const q={questionId:id,studentId:auth.studentId,studentName:name,stage,subject,question,answer:'',answeredBy:'',status:'답변대기',createdAt:koreaTimestamp_(),answeredAt:''};
  // Append without shifting a row that a teaching assistant may be editing.
  const next=sheet.getLastRow()+1;if(next>sheet.getMaxRows())sheet.insertRowsAfter(sheet.getMaxRows(),1);
  sheet.getRange(next,1,1,table.head.length).setNumberFormat('@').setValues([table.head.map(k=>questionCell_(q[k]??''))]);
  return {ok:true,qa:{questions:[questionPublic_(q)],nextCursor:''}};
 }finally{lock.releaseLock();}
}
function questionsEditedV19(e){
 if(!e||!e.range)return;
 const id=PropertiesService.getScriptProperties().getProperty('QA_SPREADSHEET_ID'),sheet=e.range.getSheet();
 if(sheet.getParent().getId()!==id||sheet.getName()!=='Questions')return;
 const lock=LockService.getScriptLock();lock.waitLock(10000);
 try{
  const table=questionTable_(sheet),startCol=e.range.getColumn(),endCol=e.range.getLastColumn();
  if(!['answer','answeredBy','status'].some(k=>{const c=table.head.indexOf(k)+1;return c>=startCol&&c<=endCol;}))return;
  const start=Math.max(2,e.range.getRow()),end=Math.min(e.range.getLastRow(),sheet.getLastRow());
  for(let row=start;row<=end;row++){
   const q=table.rows[row-2];if(!q?.questionId)continue;
   const timestamp=String(q.status).trim()==='답변완료'&&String(q.answer||'').trim()?koreaTimestamp_():'';
   sheet.getRange(row,table.head.indexOf('answeredAt')+1).setNumberFormat('@').setValue(timestamp);
  }
 }finally{lock.releaseLock();}
}
