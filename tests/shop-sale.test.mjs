import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {shopCatalog,inventoryIds} from '../src/catalog.mjs';
import {purchase} from '../src/economy.mjs';
import {saleItems,salePrice,saleBlockReason,sellItem,createSaleTransaction} from '../src/shop-sale.mjs';
const initial=()=>({version:3,item_schema:3,stage_layout:3,studentId:'22221111',name:'세미',completed:[0,1,2],readBooks:[2],readBookSources:['STAGE-3-BOOK-1'],puzzle_completed:[2],doping:1e16,type:'n',coins:100,character:{hat:'none',outfit:'C01',shoes:'F01',weapon:'none',accessory:'none'},purchased:['T06','H06','T03'],quantities:{T03:1},purchaseCounts:{T03:2},translation_solved:['Q1'],area:'village'});
const plain=x=>JSON.parse(JSON.stringify(x));
test('sale uses actual shop price and excludes consumables and free quest equipment',()=>{
 assert.equal(salePrice('T06'),63);
 for(const item of shopCatalog.filter(i=>!['T03','T04','T05'].includes(i.id)))assert.equal(salePrice(item.id),Math.floor(item.price*70/100));
 for(const id of ['T01','T02','F04','H01','C01','W01','T03','T04','T05','fake'])assert.equal(salePrice(id),0);
 assert.deepEqual(saleItems(initial()).map(i=>i.id),['H06','T06']);
});
test('sale removes ownership, keeps progress and consumable history, and permits repurchase',()=>{
 const s=initial(),next=sellItem(s,'T06');assert.equal(next.coins,163);assert.equal(s.coins,100);
 assert.ok(!inventoryIds(next).includes('T06'));assert.equal(sellItem(next,'T06'),next);
 for(const key of ['completed','readBooks','readBookSources','puzzle_completed','doping','translation_solved','purchaseCounts'])assert.deepEqual(next[key],s[key]);
 assert.deepEqual(next.quantities,s.quantities);
 const bought=purchase(next,shopCatalog.find(i=>i.id==='T06'));
 assert.equal(bought.coins,73);assert.ok(inventoryIds(bought).includes('T06'));
});
test('equipped gear, virtual root ownership and coin overflow cannot be sold',()=>{
 const s=initial();s.character.hat='H06';assert.equal(sellItem(s,'H06'),s);assert.match(saleBlockReason(s,'H06'),/착용/);
 const root={...s,studentId:'099746',name:'공수교대',purchased:[]};assert.ok(inventoryIds(root).includes('T06'));assert.equal(sellItem(root,'T06'),root);
 assert.equal(saleItems(root).length,0);
 const capped={...s,coins:1000000000};assert.equal(sellItem(capped,'T06'),capped);
});
function server(){
 const c=vm.createContext({});vm.runInContext(fs.readFileSync(new URL('../google-apps-script/Code_v25_Stage2.gs',import.meta.url),'utf8'),c);
 c.verifyToken_=()=>({studentId:'22221111',role:'student'});c.LockService={getScriptLock:()=>({waitLock(){},releaseLock(){}})};
 c.SpreadsheetApp={flush(){}};c.koreaTimestamp_=()=> '2026-10-10T10:00:00+09:00';c.seoulCellTime_=x=>x;c.audit_=()=>{};
 let row=plain(c.studentRow_('22221111','세미',initial(),4,'updated','created','salt','hash')),writes=0;
 c.studentsSheet_=()=>({getRange:()=>({getValues:()=>[row],setValues:rows=>{row=plain(rows[0]);writes++;}})});c.findStudentRow_=()=>2;
 return {submit:attempt=>c.saveStudent_({token:'auth',baseRevision:attempt.revision,includeStages:false,save:plain(attempt.candidate)}),read:()=>JSON.parse(row[6]),writes:()=>writes,row:()=>row};
}
test('existing server saves sale and PIN together; retry after a lost response cannot pay twice',()=>{
 const s=server(),transaction=createSaleTransaction(),attempt=transaction.begin(initial(),4,'T06');
 const result=s.submit(attempt);assert.equal(result.ok,true);assert.equal(s.read().coins,163);assert.ok(!s.read().purchased.includes('T06'));
 assert.equal(s.row()[10],'salt');assert.equal(s.row()[11],'hash');assert.deepEqual(s.read().translation_solved,['Q1']);
 assert.equal(transaction.begin(initial(),999,'T06'),attempt);
 const retry=s.submit(transaction.pending);assert.equal(retry.ok,false);assert.equal(retry.error.code,'REVISION_CONFLICT');assert.equal(s.read().coins,163);assert.equal(s.writes(),1);
 transaction.clear();assert.equal(transaction.pending,null);
 const saved=s.submit({candidate:result.student.save,revision:result.student.revision});assert.equal(saved.ok,true);assert.ok(!s.read().purchased.includes('T06'));assert.equal(s.read().coins,163);
});
test('retry before any server commit uses the original revision and snapshot',()=>{
 const t=createSaleTransaction(),s=server(),a=t.begin(initial(),4,'T06');
 assert.throws(()=>t.begin(initial(),4,'H06'),/먼저/);
 assert.equal(t.begin({...initial(),coins:999},10,'T06'),a);
 assert.equal(s.submit(t.pending).ok,true);assert.equal(s.read().coins,163);
});
