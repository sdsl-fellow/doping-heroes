import {test} from 'node:test';import fs from 'node:fs';import assert from 'node:assert/strict';
import {stageDefinitions,mapInfo,arrivalPoint,gatewayLocations} from '../src/maps.mjs';
import {walkable,route,routeToGateway,stageBookPoint,clearSegment} from '../src/navigation.mjs';
test('twelve unique stage scenes preserve quest IDs and connect to safe return positions',()=>{
 assert.equal(stageDefinitions.length,12);assert.equal(new Set(stageDefinitions.map(s=>s.questId)).size,12);assert.equal(new Set(stageDefinitions.map(s=>mapInfo(s.area).image)).size,12);
 for(const s of stageDefinitions){const info=mapInfo(s.area);assert.ok(walkable(info.spawn.x,info.spawn.y,s.area));for(const target of [{x:info.npc.x,y:info.npc.y+20},info.exit]){const path=route(info.spawn.x,info.spawn.y,target.x,target.y,s.area);assert.ok(path.length);assert.ok(path.every(p=>walkable(p.x,p.y,s.area)));assert.ok(Math.hypot(path.at(-1).x-target.x,path.at(-1).y-target.y)<20);}
 const back=arrivalPoint('adventure',s.index),gate=gatewayLocations[s.index];assert.ok(walkable(back.x,back.y,'adventure'));assert.ok(Math.hypot(back.x-gate.x,back.y-gate.y)>50);}
});
test('continent arrival is north of portals with a downward route; pn bridge blocks river',()=>{
 const start=arrivalPoint('adventure');assert.ok(start.y<Math.min(...gatewayLocations.map(g=>g.y)));const path=route(start.x,start.y,768,330,'adventure');assert.ok(path.length);assert.ok(path.at(-1).y>start.y);assert.equal(walkable(768,800,'stage-8'),false);
});

test('continent gates form three rows and four columns',()=>{assert.equal(new Set(gatewayLocations.map(g=>g.x)).size,4);assert.equal(new Set(gatewayLocations.map(g=>g.y)).size,3);});

test('village extends south over sea while stage dimensions remain unchanged',()=>{
 for(const area of ['village','adventure',...stageDefinitions.map(s=>s.area)]){assert.equal(mapInfo(area).width,1536);assert.equal(mapInfo(area).height,area==='village'?1536:1024);}
});

test('winding roads block former straight shortcuts',()=>{assert.equal(walkable(584,480,'adventure'),false);assert.equal(walkable(815,244,'adventure'),true);assert.equal(walkable(768,244,'adventure'),false);});

test('stage artwork water and chasm remain blocked',()=>{assert.equal(walkable(768,570,'stage-8'),false);assert.equal(walkable(768,800,'stage-10'),false);assert.equal(walkable(506,470,'stage-12'),true);});

test('all stage backgrounds exist as nonempty WebP assets',()=>{
 for(const s of stageDefinitions){const file=fs.readFileSync(new URL('../public/'+mapInfo(s.area).image.slice(2),import.meta.url));assert.ok(file.length>10000);assert.equal(file.toString('ascii',0,4),'RIFF');assert.equal(file.toString('ascii',8,12),'WEBP');}
});

test('next-stage routes stay on connected roads without forced detours',()=>{
 for(let i=0;i<11;i++){
 const from=arrivalPoint('adventure',i),to=gatewayLocations[i+1];const path=routeToGateway(from.x,from.y,i+1);
 assert.ok(path.length);assert.ok(path.every(p=>walkable(p.x,p.y,'adventure')));let previous=from;for(const point of path){assert.ok(clearSegment(previous,point,'adventure'));previous=point;}assert.ok(Math.hypot(path.at(-1).x-to.x,path.at(-1).y-to.y)<20);
 }
});


test('removed outer vertical links are blocked while each row stays reachable',()=>{
 for(const x of [246,1289])for(const y of [480,680])assert.equal(walkable(x,y,'adventure'),false);
 for(const index of [0,3,4,7,8,11]){const p=routeToGateway(768,200,index),g=gatewayLocations[index];assert.ok(p.length);assert.ok(Math.hypot(p.at(-1).x-g.x,p.at(-1).y-g.y)<20);}
});
test('all twelve books are reachable from spawn and connect back to the exit',()=>{
 for(const stage of stageDefinitions){const info=mapInfo(stage.area),book=stageBookPoint(stage.area);assert.ok(book.x<info.spawn.x);assert.ok(walkable(book.x,book.y,stage.area));for(const [from,to] of [[info.spawn,book],[book,info.exit]]){const p=route(from.x,from.y,to.x,to.y,stage.area);assert.ok(p.length);assert.ok(Math.hypot(p.at(-1).x-to.x,p.at(-1).y-to.y)<20);}}
});

test('a nearby clicked gate does not route back to the central spine',()=>{
 const length=(from,path)=>{let total=0;for(const p of path){total+=Math.hypot(p.x-from.x,p.y-from.y);from=p;}return total;};
 for(let i=0;i<12;i++){const gate=gatewayLocations[i],from={x:gate.x,y:gate.y+45},p=routeToGateway(from.x,from.y,i);assert.ok(length(from,p)<70);}
 const from=arrivalPoint('adventure',0),p=routeToGateway(from.x,from.y,1);assert.ok(length(from,p)<450);assert.ok(p.every(p=>p.x<650));
});
