import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {grantBookReward,bookDose} from '../src/economy.mjs';
import {bookSources} from '../src/book-progress.mjs';
import {toStoredSave,fromStoredSave} from '../src/completion-save.mjs';
import {bank} from './fixtures/translation-bank.mjs';

const plain=v=>JSON.parse(JSON.stringify(v));
const server=fs.readFileSync('google-apps-script/Code_v25_Stage2.gs','utf8');
const initial=()=>({completed:[0,1,2,3,4],readBooks:[],doping:1e15,coins:20,purchased:[]});
test('translation panel mounts the quiz for released Stage 3 and keeps unavailable stages hidden',()=>{
 const source=fs.readFileSync('src/main.tsx','utf8');
 const tree=ts.createSourceFile('main.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 let expression;
 function visit(node){
  if(ts.isJsxExpression(node)&&node.expression?.getText(tree).startsWith("panel==='translation'&&"))expression=node.expression.getText(tree);
  ts.forEachChild(node,visit);
 }
 visit(tree);assert.ok(expression,'translation panel render expression exists');
 const code=ts.transpileModule('result = ('+expression+');',{compilerOptions:{jsx:ts.JsxEmit.React}}).outputText;
 const mounted=(area,ready=true,panel='translation')=>{
  const quiz=()=>{};
  const context={area,panel,stage2TranslationReady:ready,stage3TranslationReady:ready,TranslationQuiz:quiz,requestTranslation(){},setTranslationBusy(){},React:{createElement:type=>({type})}};
  vm.runInNewContext(code,context);return context.result?.type===quiz;
 };
 assert.equal(mounted('stage-3'),true);
 assert.equal(mounted('stage-3',false),false);
 assert.equal(mounted('stage-1',false),true);
 assert.equal(mounted('stage-2'),true);
 assert.equal(mounted('stage-2',false),false);
 assert.equal(mounted('stage-4'),false);
 assert.equal(mounted('stage-3',true,'book'),false);
});
test('Stage 3 materials have independent persistent rewards and preserve legacy reading',()=>{
 let save={...initial(),readBooks:[2]};
 assert.deepEqual(bookSources(save),['STAGE-3-BOOK-1']);
 assert.equal(grantBookReward(save,2,()=>0,'STAGE-3-BOOK-1'),save);
 for(const source of ['STAGE-3-BOOK-3','STAGE-3-BOOK-2']){
  const before=save;save=grantBookReward(save,2,()=>0,source);
  assert.ok(Math.abs(save.doping-before.doping-bookDose(2))<1);
  save=fromStoredSave(toStoredSave(save));
  assert.equal(grantBookReward(save,2,()=>0,source),save);
 }
 assert.deepEqual(bookSources(save),['STAGE-3-BOOK-1','STAGE-3-BOOK-3','STAGE-3-BOOK-2']);
 assert.equal(grantBookReward(save,1,()=>0,'STAGE-3-BOOK-2'),save);
 assert.equal(grantBookReward(save,2,()=>0,'STAGE-3-BOOK-4'),save);
});
test('locked Stage 3 cannot award reading experience',()=>{
 const save={...initial(),completed:[0,1,2]};
 assert.equal(grantBookReward(save,2,()=>0,'STAGE-3-BOOK-2'),save);
});
test('reading content covers three ordered sources with page references',()=>{
 const exports={};
 const compiled=ts.transpileModule(fs.readFileSync('src/stage3-reading.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
 vm.runInNewContext(compiled,{exports});
 const sources=exports.stage3ReadingSources;
 assert.deepEqual(plain(sources.map(s=>s.id)),['STAGE-3-BOOK-1','STAGE-3-BOOK-2','STAGE-3-BOOK-3']);
 assert.deepEqual(plain(sources.map(s=>s.pages.length)),[8,12,15]);
 assert.equal(exports.stage3ReadingPages.length,35);
 assert.ok(sources.every((s,i)=>s.pages.every(p=>p.label.startsWith('자료 '+(i+1))&&p.note.includes('PDF ')&&p.text.trim())));
});
test('Stage 3 translation validates its own tab and excludes unsupported stages',()=>{
 const c=vm.createContext({});vm.runInContext(server,c);
 let tab;
 c.learningRows_=name=>{tab=name;return bank.map(q=>({...q,stage:3}));};
 assert.equal(c.translationReadBank_(3).length,bank.length);assert.equal(tab,'Translation_03');
 assert.throws(()=>c.translationReadBank_(4),/지원하지/);
 c.learningRows_=()=>bank;assert.equal(c.translationReadBank_(3).length,0);
});
test('Stage 3 translation rewards persist once and keep PIN fields intact',()=>{
 const c=vm.createContext({});vm.runInContext(server,c);
 c.verifyToken_=()=>({studentId:'22221111',role:'student'});
 c.LockService={getScriptLock:()=>({waitLock(){},releaseLock(){}})};c.SpreadsheetApp={flush(){}};
 c.koreaTimestamp_=()=> '2026-10-04T15:30:00+09:00';c.seoulCellTime_=v=>v;c.audit_=()=>{};
 const stageBank=bank.map(q=>({...q,stage:3}));c.translationBank_=stage=>{assert.equal(stage,3);return stageBank;};
 c.translationQuestionToken_=(sid,q)=>'test:'+q.questionId;
 let issuedStage=3;
 c.translationVerifyQuestionToken_=token=>{const q=stageBank.find(q=>q.questionId===token.slice(5));return {qid:q.questionId,stage:issuedStage,key:c.translationContentKey_(q)};};
 let row=plain(c.studentRow_('22221111','테스트',{...initial(),studentId:'22221111',name:'테스트',area:'stage-3',character:{},translation_solved:[]},4,'updated','created','keep-salt','keep-hash'));
 c.studentsSheet_=()=>({getRange:()=>({getValues:()=>[row],setValues:r=>{row=plain(r[0]);}})});c.findStudentRow_=()=>2;
 const start=c.translationAction_({action:'translationStart',token:'auth'});
 assert.ok(start.quiz.questionToken);assert.equal(row[7],4);
 const q=stageBank[0],answer=()=>c.translationAction_({action:'translationAnswer',token:'auth',baseRevision:row[7],questionToken:'test:'+q.questionId,optionId:q.correctOption});
 const first=answer();assert.equal(first.quiz.result.correct,true);assert.equal(row[7],5);
 const balances=[row[2],row[4]];const repeat=answer();assert.equal(repeat.quiz.result.dose,0);assert.equal(repeat.quiz.result.coins,0);
 assert.deepEqual([row[2],row[4]],balances);assert.deepEqual(row.slice(10),['keep-salt','keep-hash']);
 assert.ok(JSON.parse(row[6]).translation_solved.includes(q.questionId));
 issuedStage=2;assert.throws(answer,/다른 스테이지/);
});
