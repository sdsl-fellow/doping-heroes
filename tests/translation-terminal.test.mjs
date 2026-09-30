import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {route,walkable} from '../src/navigation.mjs';

test('Stage 1 and Stage 2 PC approaches are reachable on extended paths',()=>{
 assert.equal(walkable(1080,485,'stage-1'),true);
 assert.equal(walkable(1100,495,'stage-2'),true);
 const stageTwoPath=route(768,495,1080,515,'stage-2');
 assert.deepEqual(stageTwoPath.at(-1),{x:1080,y:515});
 assert.ok(stageTwoPath.every(p=>walkable(p.x,p.y,'stage-2')));
 assert.equal(walkable(1100,470,'stage-3'),true);
 const path=route(768,465,1080,485,'stage-1');
 assert.deepEqual(path.at(-1),{x:1080,y:485});
 assert.ok(path.every(p=>walkable(p.x,p.y,'stage-1')));
});

test('PC click walks without auto-opening; a second nearby click opens',()=>{
 const source=readFileSync(new URL('../src/World.tsx',import.meta.url),'utf8');
 const start=source.indexOf('this.add.zone(p.x,p.y-42,120,112)');
 const handler=source.slice(start).match(/on\('pointerdown',\(\)=>\{([\s\S]*?)\}\);/)[1];
 let opened=0;
 const live={current:{active:true,onTranslation:()=>opened++,onError:()=>{}}};
 const scene={busy:false,player:{x:768,y:465},path:[],pending:null,go(x,y,pending){this.target={x,y};this.pending=pending;},destination:{setVisible(){}}};
 const click=new Function('live',handler);
 click.call(scene,live);
 assert.equal(opened,0);
 assert.equal(scene.pending,null);
 assert.deepEqual(scene.target,{x:1080,y:485});
 scene.player=scene.target;
 assert.equal(opened,0);
 click.call(scene,live);
 assert.equal(opened,1);
 assert.equal(source.includes('props.onTranslation()'),false);
 const talk=source.slice(source.indexOf("this.game.events.on('talk'"),source.indexOf('  readBook()'));
 assert.equal(talk.includes('live.current.onTranslation()'),false);
});
