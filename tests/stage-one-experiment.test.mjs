import test from 'node:test';
import assert from 'node:assert/strict';
import {route,walkable} from '../src/navigation.mjs';
import {STAGE_ONE_EXPERIMENT_POINT} from '../src/stage-one-experiment.mjs';
import {missingStageExperiments} from '../src/stage-experiments.mjs';
import {clusterSites,cubeEdges,latticeAtoms,latticeBonds,missingAtoms,projectAtom,siliconBondLengthNm,siliconBondAngleDeg} from '../src/diamond-lattice.mjs';
import {mapInfo,stageDefinitions} from '../src/maps.mjs';

test('Stage 1 experiment is reachable down the center path and gates only Stage 1',()=>{
 const target=STAGE_ONE_EXPERIMENT_POINT;
 assert.equal(target.y,837);
 assert.equal(walkable(target.x,target.y,'stage-1'),true);
 const path=route(768,210,target.x,target.y,'stage-1');
 assert.ok(path.length);assert.ok(path.every(p=>walkable(p.x,p.y,'stage-1')));
 assert.ok(Math.hypot(path.at(-1).x-target.x,path.at(-1).y-target.y)<20);
 assert.deepEqual(missingStageExperiments({puzzle_completed:[]},0),[0]);
 assert.deepEqual(missingStageExperiments({puzzle_completed:[0]},0),[]);
 assert.deepEqual(missingStageExperiments({puzzle_completed:[]},6),[6]);
 assert.deepEqual(missingStageExperiments({puzzle_completed:[]},1),[]);
});

test('diamond cube has tetrahedral nearest-neighbor bonds and a five-site vacancy',()=>{
 assert.equal(latticeAtoms.length,18); // 8 corners, 6 face centers, 4 interior atoms
 assert.equal(cubeEdges.length,12);
 assert.equal(latticeBonds.length,16);
 for(const bond of latticeBonds){
  assert.equal(bond.a.reduce((d,v,i)=>d+(v-bond.b[i])**2,0),3/16);
 }
 assert.equal(missingAtoms.length,5);
 assert.deepEqual(missingAtoms,[[.75,.25,.75],[.5,0,.5],[.5,.5,1],[1,0,1],[1,.5,.5]]);
 assert.equal(latticeBonds.filter(b=>b.a.every((v,i)=>v===missingAtoms[0][i])).length,4);
 for(const neighbor of missingAtoms.slice(1))assert.equal(neighbor.reduce((d,v,i)=>d+(v-missingAtoms[0][i])**2,0),3/16);
 assert.deepEqual(clusterSites[0],{x:0,y:0});
 assert.ok(clusterSites.every(site=>Number.isFinite(site.x)&&Number.isFinite(site.y)));
 assert.ok(projectAtom(missingAtoms[0]).x>0);
 assert.equal(siliconBondLengthNm.toFixed(3),'0.235');
 assert.equal(siliconBondAngleDeg.toFixed(2),'109.47');
});

test('stage guides stand at their crossroads with room for the southern sign',()=>{
 for(const stage of stageDefinitions)assert.deepEqual(mapInfo(stage.area).npc,{x:768,y:stage.road});
});
