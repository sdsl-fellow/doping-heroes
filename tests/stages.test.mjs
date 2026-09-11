import {test} from 'node:test';import fs from 'node:fs';import assert from 'node:assert/strict';
import {stageDefinitions,mapInfo,arrivalPoint,gatewayLocations} from '../src/maps.mjs';
import {walkable,route} from '../src/navigation.mjs';
test('twelve unique stage scenes preserve quest IDs and connect to safe return positions',()=>{
 assert.equal(stageDefinitions.length,12);assert.equal(new Set(stageDefinitions.map(s=>s.questId)).size,12);assert.equal(new Set(stageDefinitions.map(s=>mapInfo(s.area).image)).size,12);
 for(const s of stageDefinitions){const info=mapInfo(s.area);assert.ok(walkable(info.spawn.x,info.spawn.y,s.area));for(const target of [{x:info.npc.x,y:info.npc.y+20},info.exit]){const path=route(info.spawn.x,info.spawn.y,target.x,target.y,s.area);assert.ok(path.length);assert.ok(path.every(p=>walkable(p.x,p.y,s.area)));assert.ok(Math.hypot(path.at(-1).x-target.x,path.at(-1).y-target.y)<20);}
 const back=arrivalPoint('adventure',s.index),gate=gatewayLocations[s.index];assert.ok(walkable(back.x,back.y,'adventure'));assert.ok(Math.hypot(back.x-gate.x,back.y-gate.y)>50);}
});
test('continent arrival is north of portals with a downward route; pn bridge blocks river',()=>{
 const start=arrivalPoint('adventure');assert.ok(start.y<Math.min(...gatewayLocations.map(g=>g.y)));const path=route(start.x,start.y,768,330,'adventure');assert.ok(path.length);assert.ok(path.at(-1).y>start.y);assert.equal(walkable(768,800,'stage-8'),false);
});

test('continent gates form three rows and four columns',()=>{assert.equal(new Set(gatewayLocations.map(g=>g.x)).size,4);assert.equal(new Set(gatewayLocations.map(g=>g.y)).size,3);});

test('every map uses the same native world dimensions',()=>{
 for(const area of ['village','adventure',...stageDefinitions.map(s=>s.area)]){assert.equal(mapInfo(area).width,1536);assert.equal(mapInfo(area).height,1024);}
});

test('winding roads block former straight shortcuts',()=>{assert.equal(walkable(584,480,'adventure'),false);assert.equal(walkable(815,244,'adventure'),true);assert.equal(walkable(768,244,'adventure'),false);});

test('stage artwork water and chasm remain blocked',()=>{assert.equal(walkable(768,570,'stage-8'),false);assert.equal(walkable(768,800,'stage-10'),false);assert.equal(walkable(506,470,'stage-12'),true);});

test('all stage backgrounds exist as nonempty WebP assets',()=>{
 for(const s of stageDefinitions){const file=fs.readFileSync(new URL('../public/'+mapInfo(s.area).image.slice(2),import.meta.url));assert.ok(file.length>10000);assert.equal(file.toString('ascii',0,4),'RIFF');assert.equal(file.toString('ascii',8,12),'WEBP');}
});
