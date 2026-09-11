import {test} from 'node:test';
import assert from 'node:assert/strict';
import {progress,addDopants,conductivity,resistivity,MIN_DOPING,MAX_DOPING} from '../src/progression.mjs';
import {route,walkable,adventureLocations} from '../src/navigation.mjs';
test('each decade levels up and the last experience range ends at 1e21',()=>{
 for(let e=13;e<=20;e++){
  const p=progress(10**e);assert.equal(p.stage,e-12);assert.equal(p.low,10**e);assert.equal(p.high,10**(e+1));assert.equal(p.fraction,0);
  assert.equal(progress(10**(e+1)).stage,p.stage+1);
 }
 const max=progress(addDopants(MAX_DOPING,1e21));assert.equal(max.low,1e20);assert.equal(max.high,1e21);assert.equal(max.fraction,1);assert.equal(max.max,true);
 assert.equal(progress(MIN_DOPING+2e13).sigma,progress(MIN_DOPING).sigma);
 assert.equal(addDopants(addDopants(addDopants(MIN_DOPING,2e13),3e13),4e13),1e14);
});
test('graph resistivity is inverted in ohm cm, interpolated monotonically',()=>{
 for(const type of ['n','p']){let last=0;for(let i=0;i<=80;i++){const n=10**(13+i/10),sigma=conductivity(n,type);assert.ok(Math.abs(sigma*resistivity(n,type)-1)<1e-12);assert.ok(sigma>=last);last=sigma;}}
 assert.ok(conductivity(1e16,'n')>conductivity(1e16,'p'));
});
test('all twelve stage gateways and the northern return gate are reachable on roads',()=>{
 for(const p of [...adventureLocations,{x:768,y:70}]){const path=route(768,200,p.x,p.y,'adventure');assert.ok(path.length>0);assert.ok(path.every(n=>walkable(n.x,n.y,'adventure')));assert.ok(Math.hypot(path.at(-1).x-p.x,path.at(-1).y-p.y)<20);}
 assert.equal(walkable(1280,100,'adventure'),false);
});
