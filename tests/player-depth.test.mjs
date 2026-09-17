import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {playerDepth} from '../src/player-depth.mjs';
import {gatewayLocations} from '../src/maps.mjs';

test('adventure player stays above all twelve gates, backings and titles at every map height',()=>{
 for(let y=0;y<=1024;y++){
  const depth=playerDepth('adventure',y);
  for(const gate of gatewayLocations)assert.ok(depth>gate.y);
  assert.ok(depth>1500&&depth<1600);
 }
 assert.equal(playerDepth('village',700),700);
 assert.equal(playerDepth('stage-1',465),465);
});
test('spawn, movement and gate entry apply the same depth rule',()=>{
 const source=readFileSync(new URL('../src/World.tsx',import.meta.url),'utf8');
 assert.ok(source.includes('this.player=sprite.setDepth(playerDepth(area,sprite.y))'));
 assert.ok(source.includes('this.player.setDepth(playerDepth(area,this.player.y)).setFrame'));
 assert.ok(source.includes('this.player.setDepth(playerDepth(area,this.player.y));this.busy=true'));
});
