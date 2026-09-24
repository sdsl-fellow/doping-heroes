import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
function fixture(rows){
 const c=vm.createContext({});vm.runInContext(fs.readFileSync('google-apps-script/Code_v15.gs','utf8'),c);
 const sheet={getLastRow:()=>rows.length,getLastColumn:()=>rows[0].length,getRange(r,col,n=1,m=1){return {getValues:()=>Array.from({length:n},(_,i)=>Array.from({length:m},(_,j)=>rows[r-1+i]?.[col-1+j]??'')),setValue(v){rows[r-1]??=[];rows[r-1][col-1]=v;}};}};
 c.stagesSheet_=()=>sheet;c.verifyToken_=()=>({role:'root'});c.audit_=()=>{};c.koreaTimestamp_=()=> 'now';c.SpreadsheetApp={flush(){}};c.LockService={getScriptLock:()=>({waitLock(){},releaseLock(){}})};
 return c;
}
test('manual sheet values and sorted rows map to stage numbers, not positions',()=>{
 const c=fixture([['updatedBy','released','stageNumber','updatedAt'],['admin',' TRUE ',3,''],['admin',true,1,''],['admin','FALSE',2,''],['admin','1',12,'']]);
 const flags=Array.from(c.readStages_());assert.equal(flags.length,12);assert.deepEqual(flags.map((x,i)=>x?i+1:null).filter(Boolean),[1,3,12]);
 assert.equal(c.stageReleasedValue_('false'),false);assert.equal(c.stageReleasedValue_('yes'),false);assert.equal(c.stageReleasedValue_(0),false);
});
test('root updates matched row after sorting and preserves other stages',()=>{
 const rows=[['updatedBy','released','stageNumber','updatedAt'],['x',true,3,''],['x',false,1,'']];const c=fixture(rows);
 c.setStage_({index:0,released:true});assert.equal(rows[2][1],true);assert.equal(rows[1][2],3);assert.equal(rows[1][1],true);
 c.setStage_({index:2,released:false});assert.equal(rows[1][1],false);
 c.setStage_({index:11,released:true});assert.equal(rows[3][2],12);assert.equal(c.readStages_()[11],true);
});
test('duplicate stage numbers and missing headers fail explicitly',()=>{
 assert.throws(()=>fixture([['stageNumber','released','updatedAt','updatedBy'],[1,true],[1,false]]).readStages_(),/중복/);
 assert.throws(()=>fixture([['stageNumber','wrong','updatedAt','updatedBy']]).readStages_(),/열/);
});
