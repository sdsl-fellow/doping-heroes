import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sample, stages, growth, conductance, formatS } from '../src/physics.mjs';
test('intrinsic carrier concentrations and conductivity',()=>{const s=sample();assert.equal(s.n,1e10);assert.equal(s.p,1e10);assert.ok(Math.abs(s.sigma-2.932e-6)<1e-9);});
test('n and p samples preserve mass action and neutrality',()=>{for(const kind of ['n','p']){const s=sample(kind,1e15);assert.ok(Math.abs(s.n*s.p/1e20-1)<1e-12);assert.ok(Math.abs(Math.abs(s.n-s.p)/1e15-1)<1e-12);}});
test('tenfold donor increase gives approximate tenfold conductivity',()=>assert.ok(Math.abs(stages[2].sigma/stages[1].sigma-10)<1e-5));
test('siemens equals sigma A/L and growth never falls',()=>{assert.equal(growth([]),conductance(stages[0]));assert.equal(conductance(stages[2]),stages[2].sigma*1000);assert.ok(growth([0])>growth([]));assert.equal(growth([0,1]),growth([0,1,2]));assert.equal(formatS(10),'10 S');assert.ok(growth([])>0);});
