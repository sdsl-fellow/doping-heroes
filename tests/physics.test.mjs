import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sample, stages, level } from '../src/physics.mjs';
test('intrinsic carrier concentrations and conductivity',()=>{const s=sample();assert.equal(s.n,1e10);assert.equal(s.p,1e10);assert.ok(Math.abs(s.sigma-2.932e-6)<1e-9);});
test('n and p samples preserve mass action and neutrality',()=>{for(const kind of ['n','p']){const s=sample(kind,1e15);assert.ok(Math.abs(s.n*s.p/1e20-1)<1e-12);assert.ok(Math.abs(Math.abs(s.n-s.p)/1e15-1)<1e-12);}});
test('tenfold donor increase gives approximate tenfold conductivity',()=>assert.ok(Math.abs(stages[2].sigma/stages[1].sigma-10)<1e-5));
test('independent p sample cannot reduce best-sample level',()=>{assert.equal(level([]),1);assert.ok(level([0])>1);assert.equal(level([0,1]),level([0,1,2]));});
