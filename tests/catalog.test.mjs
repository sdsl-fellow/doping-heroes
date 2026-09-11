import {test} from 'node:test';
import assert from 'node:assert/strict';
import {catalog,inventoryIds,migrateItemId,shopCatalog} from '../src/catalog.mjs';
import {purchase,useConsumable} from '../src/economy.mjs';
test('approved catalogue has six ordered categories with unique codes and ascending prices',()=>{
 assert.equal(catalog.length,60);assert.equal(new Set(catalog.map(i=>i.id)).size,60);
 for(const [row,prefix] of ['C','F','H','W','A','T'].entries()){
  const items=catalog.filter(i=>i.row===row);assert.equal(items.length,10);
  assert.deepEqual(items.map(i=>i.code),Array.from({length:10},(_,i)=>prefix+String(i+1).padStart(2,'0')));
  const prices=items.filter(i=>i.price!==null).map(i=>i.price);assert.deepEqual(prices,[...prices].sort((a,b)=>a-b));
 }
 assert.ok(shopCatalog.every(i=>i.price>0));assert.ok(!catalog.some(i=>i.id==='moon-sword'));
});
test('root test inventory is derived without awarding progress or leaking to an ordinary identity',()=>{
 const root={name:'공수교대',studentId:'099746',purchased:['trailcap'],completed:[],doping:1e13};
 const before=JSON.stringify(root);assert.equal(inventoryIds(root).length,60);assert.equal(JSON.stringify(root),before);
 assert.deepEqual(inventoryIds({...root,name:'학생',studentId:'202601'}),['trailcap']);
 assert.deepEqual(inventoryIds({...root,name:'학생',studentId:'202601',purchased:['moon-sword','ember-boots'],readBooks:[0]}),['semiconductor-pen','lab-shoes','lecture-notes']);
 assert.equal(migrateItemId('W08'),'semiconductor-pen');
});
test('ampoules persist quantities, consume one dose, and root follows the same XP rules',()=>{
 const s={name:'학생',studentId:'202601',doping:1e13,type:'n',coins:100,purchased:[]};
 const bought=purchase(s,shopCatalog.find(i=>i.id==='acceptor-ampoule'));
 assert.equal(bought.coins,80);assert.equal(bought.doping,s.doping);
 const used=useConsumable(JSON.parse(JSON.stringify(bought)),'acceptor-ampoule');
 assert.equal(used.type,'p');assert.equal(used.doping,2.8e13);assert.equal(used.quantities['acceptor-ampoule'],0);
 assert.equal(useConsumable(used,'acceptor-ampoule'),used);
 const root=useConsumable({...s,name:'공수교대',studentId:'099746'},'acceptor-ampoule');assert.equal(root.doping,used.doping);assert.deepEqual(root.purchased,[]);
});
