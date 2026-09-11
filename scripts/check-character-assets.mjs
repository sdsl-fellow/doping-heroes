import fs from 'node:fs';
import assert from 'node:assert/strict';
import {layers,defaultCharacter,hairStyles,outfits,validCharacter} from '../src/character.ts';
import {equipment,availableCharacter,unlocked} from '../src/equipment.ts';
const fullyEquipped={...defaultCharacter,outfit:'cardigan',hat:'cap',weapon:'sword',shoes:'boots'};
assert.deepEqual(availableCharacter(fullyEquipped,[]),defaultCharacter);
assert.deepEqual(availableCharacter(fullyEquipped,[0,1,2]),fullyEquipped);
assert.equal(availableCharacter(fullyEquipped,[0]).shoes,'boots');
assert.equal(availableCharacter(fullyEquipped,[0]).hat,'none');
assert.equal(availableCharacter(fullyEquipped,[0,1]).hat,'cap');
assert.equal(availableCharacter(fullyEquipped,[0,1]).weapon,'none');
for(const item of equipment)assert.equal(unlocked(item,[0,1,2]),item.quest!==-2);
assert.equal(availableCharacter({...defaultCharacter,hat:'trailcap'},[],['trailcap']).hat,'trailcap');
assert.equal(availableCharacter({...defaultCharacter,hat:'trailcap'},[]).hat,'none');
let count=0;const files=new Set();
for(const body of ['sturdy','agile'])for(const [hair] of hairStyles)for(const [outfit] of outfits){
 for(const {path} of layers({...defaultCharacter,body,hair,outfit})){const buffer=fs.readFileSync('public/lpc/'+path);assert.equal(buffer.readUInt32BE(16),576,path);assert.equal(buffer.readUInt32BE(20),256,path);files.add(path);}count++;
}
assert.deepEqual(validCharacter(null),defaultCharacter);
for(const body of ['sturdy','agile'])for(const species of ['cat','dog']){
 const character={...defaultCharacter,gender:'neutral',species,body};
 const parts=layers(character);assert.ok(parts.some(p=>p.path.includes('/'+species+'/')));assert.ok(!parts.some(p=>p.path.startsWith('hair/')));
 for(const {path} of parts){const buffer=fs.readFileSync('public/lpc/'+path);assert.equal(buffer.readUInt32BE(16),576,path);assert.equal(buffer.readUInt32BE(20),256,path);files.add(path);}count++;
}
assert.equal(validCharacter({gender:'neutral',accessory:'glasses'}).accessory,'glasses');
const invalid=validCharacter({hair:'../oops',body:'unknown',skin:'bad',outfit:'bad'});assert.equal(invalid.hair,defaultCharacter.hair);assert.equal(invalid.body,'sturdy');
console.log(`${count} body/hair/outfit combinations validated; ${files.size} PNG layers, all 576x256. Invalid appearance values sanitized.`);

for(const gender of ['male','female','neutral'])for(const accessory of ['none','glasses','headband']){
 for(const {path} of layers({...defaultCharacter,gender,accessory,hat:'cap',weapon:'sword',shoes:'boots'})){
  const b=fs.readFileSync('public/lpc/'+path);assert.equal(b.readUInt32BE(16),576,path);assert.equal(b.readUInt32BE(20),256,path);
 }
}
