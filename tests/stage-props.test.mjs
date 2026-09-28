import test from 'node:test';
import assert from 'node:assert/strict';
import {stageDefinitions} from '../src/maps.mjs';
import {stageProps} from '../src/stage-props.mjs';
import {stageNpcCostumes} from '../src/stage-npc-costumes.mjs';
import {catalogItem} from '../src/catalog.mjs';
import {route,walkable,stageBookPoint} from '../src/navigation.mjs';

test('all twelve stages have reachable east terminals, south benches and distinct themed costumes',()=>{
 assert.equal(stageProps.length,12);
 assert.equal(stageNpcCostumes.length,12);
 const outfits=new Set();
 for(const stage of stageDefinitions){
  const {pc,pcApproach,experiment,experimentSign}=stageProps[stage.index];
  assert.ok(pc.x>pcApproach.x&&pc.x<1200);
  assert.ok(experiment.y>stage.road+180);
  assert.ok(experimentSign.y>stage.road+35&&experimentSign.y<experiment.y-90);
  for(const point of [pcApproach,experiment]){
   assert.ok(walkable(point.x,point.y,stage.area),`${stage.area} target off path`);
   assert.deepEqual(route(768,210,point.x,point.y,stage.area).at(-1),point);
  }
  const costume=stageNpcCostumes[stage.index];
  for(const slot of ['outfit','shoes','hat','accessory'])assert.equal(catalogItem(costume[slot])?.slot,slot);
  outfits.add(costume.outfit);
 }
 assert.ok(outfits.size>=7);
 assert.deepEqual(stageProps[0].experiment,{x:768,y:837});
 assert.deepEqual(stageProps[6].experiment,{x:768,y:865});
 const stageOne=stageDefinitions[0],guide={x:768,y:stageOne.road},book=stageBookPoint(stageOne.area),pc=stageProps[0].pc;
 const distance=p=>Math.hypot(p.x-guide.x,p.y-guide.y);
 assert.ok(Math.abs(distance(book)-distance(stageProps[0].experiment))<1);
 assert.ok(Math.abs(distance(pc)-distance(stageProps[0].experiment))<1);
});
