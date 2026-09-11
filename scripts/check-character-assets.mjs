import fs from 'node:fs';
import assert from 'node:assert/strict';
import {layers,defaultCharacter,hairStyles,outfits,validCharacter} from '../src/character.ts';
let count=0;const files=new Set();
for(const body of ['male','female'])for(const [hair] of hairStyles)for(const [outfit] of outfits){
 for(const {path} of layers({...defaultCharacter,body,hair,outfit})){const buffer=fs.readFileSync('public/lpc/'+path);assert.equal(buffer.readUInt32BE(16),576,path);assert.equal(buffer.readUInt32BE(20),256,path);files.add(path);}count++;
}
assert.deepEqual(validCharacter(null),defaultCharacter);
const invalid=validCharacter({hair:'../oops',body:'unknown',skin:'bad',outfit:'bad'});assert.equal(invalid.hair,defaultCharacter.hair);assert.equal(invalid.body,'male');
console.log(`${count} body/hair/outfit combinations validated; ${files.size} PNG layers, all 576x256. Invalid appearance values sanitized.`);
