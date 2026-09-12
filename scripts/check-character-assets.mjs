import fs from 'node:fs';
import assert from 'node:assert/strict';
import {layers,defaultCharacter,hairStyles,outfits,validCharacter} from '../src/character.ts';
import {equipment,availableCharacter,unlocked} from '../src/equipment.ts';
const fullyEquipped={...defaultCharacter,outfit:'C03',hat:'H01',weapon:'W01',shoes:'F02'};
const unequipped={...defaultCharacter,outfit:'none',shoes:'none',hat:'none',weapon:'none',accessory:'none'};
assert.deepEqual(validCharacter(unequipped),unequipped);
assert.deepEqual(availableCharacter(unequipped,[]),unequipped);
assert.ok(layers(unequipped).some(l=>l.path.startsWith('torso/')));
assert.ok(layers(unequipped).every(l=>!l.path.startsWith('feet/')));
assert.notEqual(layers({...defaultCharacter,gender:'male'}).find(l=>l.path.startsWith('legs/')).color,layers({...defaultCharacter,gender:'female'}).find(l=>l.path.startsWith('legs/')).color);
// A saved custom clothing colour must never replace an equipped item's palette.
for(const outfit of ['C01','C02','C03']){
 const white=layers({...defaultCharacter,outfit,outfitColor:'#e6e9e5'});
 const red=layers({...defaultCharacter,outfit,outfitColor:'#bd555f'});
 assert.deepEqual(white,red,`${outfit}: catalogue colour overridden by saved custom colour`);
}
assert.deepEqual(availableCharacter(fullyEquipped,[]),{...defaultCharacter,outfit:'C03'});
assert.deepEqual(availableCharacter(fullyEquipped,[0,1,2]),fullyEquipped);
assert.equal(availableCharacter(fullyEquipped,[0]).shoes,'F02');
assert.equal(availableCharacter(fullyEquipped,[0]).hat,'none');
assert.equal(availableCharacter(fullyEquipped,[0,1]).hat,'H01');
assert.equal(availableCharacter(fullyEquipped,[0,1]).weapon,'none');
for(const item of equipment)assert.equal(unlocked(item,[0,1,2]),[-1,0,1,2].includes(item.quest));
assert.equal(availableCharacter({...defaultCharacter,hat:'H02'},[],['H02']).hat,'H02');
assert.equal(availableCharacter({...defaultCharacter,hat:'H02'},[]).hat,'none');
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
assert.equal(validCharacter({gender:'neutral',accessory:'A01'}).accessory,'A01');
const invalid=validCharacter({hair:'../oops',body:'unknown',skin:'bad',outfit:'bad'});assert.equal(invalid.hair,defaultCharacter.hair);assert.equal(invalid.body,'sturdy');
console.log(`${count} body/hair/outfit combinations validated; ${files.size} PNG layers, all 576x256. Invalid appearance values sanitized.`);

for(const gender of ['male','female','neutral'])for(const accessory of ['none','A01','A02']){
 for(const {path} of layers({...defaultCharacter,gender,accessory,hat:'H01',weapon:'W01',shoes:'F02'})){
  const b=fs.readFileSync('public/lpc/'+path);assert.equal(b.readUInt32BE(16),576,path);assert.equal(b.readUInt32BE(20),256,path);
 }
}

const {lootItems}=await import('../src/loot.mjs');
for(const item of lootItems){
 const c={...defaultCharacter,[item.slot]:item.id};assert.equal(validCharacter(c)[item.slot],item.id);assert.equal(availableCharacter(c,[],[item.id])[item.slot],item.id);
 for(const part of layers(c))assert.ok(fs.existsSync('public/lpc/'+part.path));
}
console.log(`${lootItems.length} random equipment variants validated for save/restore, ownership and sprite layers.`);
