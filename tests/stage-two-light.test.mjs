import test from 'node:test';
import assert from 'node:assert/strict';
import {materials,lightResult,correctBandGap,PLANCK_EV_PER_THZ} from '../src/stage-two-light.mjs';
import {missingStageExperiments} from '../src/stage-experiments.mjs';
import {stageProps} from '../src/stage-props.mjs';
import {route,walkable} from '../src/navigation.mjs';
import {stageDefinitions} from '../src/maps.mjs';
import {grantReward} from '../src/economy.mjs';

test('Stage 2 experiment has a reachable table and must be completed before its quiz reward',()=>{
 const target=stageProps[1].experiment;
 assert.equal(walkable(target.x,target.y,'stage-2'),true);
 assert.ok(route(768,210,target.x,target.y,'stage-2').length);
 assert.deepEqual(missingStageExperiments({puzzle_completed:[]},1),[1]);
 assert.deepEqual(missingStageExperiments({puzzle_completed:[1]},1),[]);
 const initial={completed:[0,1,2,stageDefinitions[0].questId],puzzle_completed:[],doping:1e14,coins:60,purchased:[]};
 const quiz={id:stageDefinitions[1].questId,dose:1e15,coins:30};
 assert.equal(grantReward(initial,quiz),initial);
 const done=grantReward({...initial,puzzle_completed:[1]},quiz);
 assert.ok(done.completed.includes(quiz.id));
 assert.equal(done.coins,90);
});

test('frequency changes energy and model absorption according to material bandgaps',()=>{
 assert.equal(materials.length,3);
 assert.deepEqual(materials.map(item=>item.gap),[1.12,.66,1.42]);
 assert.ok(Math.abs(lightResult(materials[0],300).energy-300*PLANCK_EV_PER_THZ)<1e-12);
 for(const material of materials){
  const threshold=material.gap/PLANCK_EV_PER_THZ;
  const below=lightResult(material,threshold-10),above=lightResult(material,threshold+10),higher=lightResult(material,480);
  assert.equal(below.excited,false);assert.equal(below.absorbed,0);
  assert.equal(above.excited,true);assert.ok(above.absorbed>0);
  assert.ok(higher.absorbed>above.absorbed);
  assert.ok(Math.abs(above.transmitted+above.absorbed-1)<1e-12);
  assert.equal(correctBandGap(material,material.gap.toFixed(2)),true);
  assert.equal(correctBandGap(material,'0.00'),false);
 }
 assert.equal(correctBandGap(materials[0],'1,12'),true);
});
