import test from 'node:test';
import assert from 'node:assert/strict';
import {canEnterStage,emptyStageReleases,nextGatewayKnock,normalizeStageReleases} from '../src/stage-release.mjs';

test('students need both the administrator release and every prerequisite',()=>{
 const tutorial=[0,1,2],stageOneComplete=[...tutorial,3];
 assert.equal(canEnterStage(tutorial,0,false,false),false);
 assert.equal(canEnterStage(tutorial,0,false,true),true);
 assert.equal(canEnterStage(tutorial,1,false,true),false);
 assert.equal(canEnterStage(stageOneComplete,1,false,true),true);
 assert.equal(canEnterStage([],11,true,false),true);
 assert.equal(canEnterStage([],12,true,false),false);
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
