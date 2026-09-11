import {test} from 'node:test';
import assert from 'node:assert/strict';
import {checkProcessOrder,processSteps,shuffleSteps,FET_GAME_POINT} from '../src/fet-process.mjs';
import {mapInfo} from '../src/maps.mjs';
import {route,clearSegment} from '../src/navigation.mjs';
test('only the complete intended process order succeeds, across all permutations',()=>{
 const ids=processSteps.map(s=>s.id);let accepted=0;
 function visit(prefix,left){if(!left.length){if(checkProcessOrder(prefix).correct){accepted++;assert.deepEqual(prefix,ids);}return;}for(const id of left)visit([...prefix,id],left.filter(x=>x!==id));}
 visit([],ids);assert.equal(accepted,1);
 assert.equal(checkProcessOrder(ids.slice(1)).correct,false);
 assert.equal(checkProcessOrder(Array(6).fill(ids[0])).correct,false);
 assert.equal(checkProcessOrder(['unknown',...ids.slice(1)]).correct,false);
 for(const random of [()=>0,()=>.5,()=>.999]){const bank=shuffleSteps(random);assert.equal(new Set(bank).size,6);assert.equal(checkProcessOrder(bank).correct,false);}
});
test('FET minigame lies south of the quiz and can be reached and exited safely',()=>{
 const info=mapInfo('stage-11');assert.ok(FET_GAME_POINT.y>info.npc.y+100);
 for(const [from,to] of [[info.spawn,FET_GAME_POINT],[FET_GAME_POINT,info.exit]]){const path=route(from.x,from.y,to.x,to.y,'stage-11');assert.ok(path.length);let previous=from;for(const p of path){assert.ok(clearSegment(previous,p,'stage-11'));previous=p;}assert.ok(Math.hypot(previous.x-to.x,previous.y-to.y)<20);}
});
