import {test} from 'node:test';
import assert from 'node:assert/strict';
import {route,walkable,npcLocations} from '../src/navigation.mjs';
test('all NPCs are reachable along walkable ground',()=>{for(const p of npcLocations){const steps=route(768,590,p.x,p.y+20);assert.ok(steps.length);assert.ok(steps.every(s=>walkable(s.x,s.y)));const last=steps.at(-1);assert.ok(Math.hypot(last.x-p.x,last.y-p.y)<100);}});
test('river and academy are blocked, central bridge is traversable',()=>{assert.equal(walkable(500,740),false);assert.equal(walkable(768,250),false);assert.equal(walkable(768,740),true);assert.ok(route(768,590,768,950).length>0);});
