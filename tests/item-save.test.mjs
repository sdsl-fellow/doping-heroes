import {test} from 'node:test';
import assert from 'node:assert/strict';
import {catalog,migrateItemId} from '../src/catalog.mjs';
import {normalizeItemSave} from '../src/item-save.mjs';
test('every item uses its permanent display code as its canonical ID',()=>{
 for(const item of catalog){
  assert.match(item.id,/^[CFHWAT]\d{2}$/);
  assert.equal(item.id,item.code);
  assert.equal(migrateItemId(item.legacyId),item.id);
  assert.equal(migrateItemId(item.id),item.id);
 }
});
test('old local and cloud saves migrate equipment, ownership and quantities losslessly',()=>{
 const old={character:{outfit:'crystal-armor',shoes:'ember-boots',weapon:'moon-sword',hat:'none'},purchased:['crystal-armor','C10','moon-sword'],quantities:{dopant:3,'donor-ampoule':2},coins:100,completed:[0],readBooks:[0]};
 const snapshot=JSON.stringify(old),next=normalizeItemSave(old);
 assert.deepEqual(next.character,{outfit:'C10',shoes:'F08',weapon:'W08',hat:'none'});
 assert.deepEqual(next.purchased,['C10','W08']);
 assert.deepEqual(next.quantities,{T03:3,T04:2});
 assert.equal(next.coins,100);assert.deepEqual(next.completed,[0]);assert.deepEqual(next.readBooks,[0]);
 assert.equal(JSON.stringify(old),snapshot);
 assert.deepEqual(normalizeItemSave(next),next);
});
