import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {catalog} from '../src/catalog.mjs';

test('all 60 catalogue items have individual RGBA icons with consistent dimensions',()=>{
 const names=fs.readdirSync('public/item-icons').filter(n=>n.endsWith('.png'));
 assert.equal(names.length,60);
 for(const item of catalog){
  const bytes=fs.readFileSync(`public/item-icons/${item.code}.png`);
  assert.equal(bytes.subarray(1,4).toString(),'PNG');
  assert.equal(bytes.readUInt32BE(16),128,item.code);
  assert.equal(bytes.readUInt32BE(20),128,item.code);
  assert.equal(bytes[25],6,`${item.code} must contain a real alpha channel`);
 }
});
