import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function server(){
 const context={};vm.createContext(context);
 vm.runInContext(fs.readFileSync(new URL('../google-apps-script/Code_v23.gs',import.meta.url),'utf8'),context);
 context.learningCached_=(_key,load)=>load();
 return context;
}

test('Stage 1 accepts numeric bank rows without options and keeps answers server side',()=>{
 const app=server();
 app.learningRows_=()=>[
  {questionId:'S01-Q001',question:'최근접 원자 수?',optionA:'4개',optionB:'6개',correctOption:'A',active:true,rewardDose:100,rewardCoins:30},
  {questionId:'S01-Q002',question:'원자 밀도',questionType:'numeric',numericAnswer:5,answerScale:22,answerUnit:'atoms/cm³',tolerance:.01,commonInstruction:'a=0.543 nm',active:true,rewardDose:0,rewardCoins:0}
 ];
 const bank=app.learningQuizBank_(1);
 assert.equal(bank.length,2);
 assert.equal(bank[0].questionType,'choice');
 assert.equal(bank[1].questionType,'numeric');
 assert.equal(bank[1].options.length,0);
});

test('numeric answers use server tolerance and all questions must be solved for Stage completion',()=>{
 const app=server(),saved=new Map();
 const cache={get:key=>saved.get(key),put:(key,value)=>saved.set(key,value)};
 const batch={studentId:'student',stage:1,entries:{'S01-Q001':'choice-session','S01-Q002':'numeric-session'},answered:[],rewardDose:100,rewardCoins:30};
 saved.set('learning-stage-batch:batch',JSON.stringify(batch));
 const auth={studentId:'student'},numeric={studentId:'student',kind:'stage-quiz',stage:1,batchId:'batch',question:{questionId:'S01-Q002',questionType:'numeric',numericAnswer:5,tolerance:.01,options:[]}};
 const choice={...numeric,question:{questionId:'S01-Q001',questionType:'choice',correctOption:'A',options:[{id:'A'},{id:'B'}]}};
 assert.equal(app.stageQuizAnswer_(auth,numeric,{sessionId:'numeric-session',numericValue:'5.02'},cache).content.correct,false);
 assert.throws(()=>app.stageQuizAnswer_(auth,numeric,{sessionId:'numeric-session',numericValue:'5e0'},cache));
 const first=app.stageQuizAnswer_(auth,numeric,{sessionId:'numeric-session',numericValue:'5.01'},cache).content;
 assert.equal(first.correct,true);assert.equal(first.stageComplete,false);
 const last=app.stageQuizAnswer_(auth,choice,{sessionId:'choice-session',optionId:'A'},cache).content;
 assert.equal(last.stageComplete,true);assert.equal(last.dose,100);assert.equal(last.coins,30);
});
