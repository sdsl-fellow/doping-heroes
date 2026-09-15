import test from 'node:test';
import assert from 'node:assert/strict';
import {canContinueStage,canEnterStage,emptyStageReleases,nextGatewayKnock,normalizeStageReleases,stageAccessBlock} from '../src/stage-release.mjs';

test('students need both the administrator release and every prerequisite',()=>{
 const tutorial=[0,1,2],stageOneComplete=[...tutorial,3];
 assert.equal(canEnterStage(tutorial,0,false,false),false);
 assert.equal(canEnterStage(tutorial,0,false,true),true);
 assert.equal(canEnterStage(tutorial,1,false,true),false);
 assert.equal(canEnterStage(stageOneComplete,1,false,true),true);
 assert.equal(canEnterStage([],11,true,false),true);
 assert.equal(canEnterStage([],12,true,false),false);
 assert.equal(stageAccessBlock(tutorial,0,false,false),'admin');
 assert.equal(stageAccessBlock(tutorial,1,false,true),'prerequisite');
 assert.equal(stageAccessBlock(stageOneComplete,1,false,true),null);
 assert.equal(stageAccessBlock([],11,true,false),null);
});

test('exactly seven consecutive knocks release one gateway and timeout resets',()=>{
 let state={index:-1,count:0,deadline:0};
 for(let i=1;i<=7;i++){state=nextGatewayKnock(state,4,i*500);assert.equal(state.released,i===7);}
 state=nextGatewayKnock({index:4,count:5,deadline:1000},4,7001);assert.equal(state.count,1);assert.equal(state.released,false);
 state=nextGatewayKnock({index:4,count:5,deadline:9000},5,4000);assert.equal(state.count,1);assert.equal(state.released,false);
});

test('release state accepts only twelve explicit boolean values',()=>{
 assert.deepEqual(emptyStageReleases(),Array(12).fill(false));
 assert.deepEqual(normalizeStageReleases([true,1,'true']),[true,...Array(11).fill(false)]);
});

test('relocking blocks the next admission but lets a student already inside finish',()=>{
 const completed=[3];
 assert.equal(canEnterStage(completed,0,false,false),false);
 assert.equal(canContinueStage(0,completed,0,false,false),true);
 assert.equal(canContinueStage(-1,completed,0,false,false),false);
});

// Exercise the actual world gate callback and admission method, not just the access helper.
test('root taps locked gates to enter all twelve stages without publishing them',async()=>{
 const {readFileSync}=await import('node:fs');
 const source=readFileSync('src/World.tsx','utf8');
 const callback=source.match(/this\.add\.zone\(p\.x,p\.y-48,100,108\)[\s\S]*?on\('pointerdown',\(\)=>\{([\s\S]*?)\n    \}\);return;/)[1];
 const method=source.match(/tryGateway\(index:number\)\{([\s\S]*?)\n  \}/)[1];
 for(let i=0;i<12;i++)for(const rootAccount of [true,false]){
  const live={current:{active:true,rootAccount,releasedStages:Array(12).fill(false),completed:[]}};
  const p={x:100,y:200};let entered=null,blocked=null;
  const scene={busy:false,player:{...p},enterGateway:n=>entered=n,knock(){throw Error('Entry must not publish a stage');},startRelockHold(){throw Error('Locked gate must not start relock');},go(){throw Error('Already at gate');}};
  scene.tryGateway=new Function('live','interact','canEnterStage','return function(index){'+method+'}')(live,n=>blocked=n,canEnterStage);
  new Function('live','p','i',callback).call(scene,live,p,i);
  assert.equal(entered,rootAccount?i:null);assert.equal(blocked,rootAccount?null:i);
  assert.deepEqual(live.current.releasedStages,Array(12).fill(false));
 }
});
