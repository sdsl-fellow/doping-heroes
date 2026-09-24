import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('google-apps-script/Code_v14.gs','utf8');
function fixture(){
 const c=vm.createContext({});vm.runInContext(source,c);
 const props=new Map([['TRANSLATION_REPORT_DIRTY','1']]);let locked=false,available=true,writes=0,flushFails=false;
 const p={attempts:1,correctCount:1,lastAnsweredAt:'2026-09-24T12:00:00+09:00',totalRewardCoins:10};
 const students=[['22221111','','','','','',JSON.stringify({translation_progress:{questions:{q1:p}}})],['22222222','','','','','',JSON.stringify({translation_progress:{questions:{q2:{...p,lastAnsweredAt:'2026-09-24T13:00:00+09:00'}}}})]];
 const headers=Array.from(vm.runInContext('TRANSLATION_PROGRESS_HEADERS',c)),rows=[headers];
 const sheet={getLastRow:()=>rows.length,getMaxRows:()=>1000,getRange(r,col,n,m){return {getValues:()=>rows.slice(r-1,r-1+n).map(v=>v.slice(col-1,col-1+m)),setNumberFormat(){return this;},setValues(v){writes++;v.forEach((x,i)=>{rows[r-1+i]=Array.from(x);});},clearContent(){rows.splice(r-1,n);}};}};
 c.PropertiesService={getScriptProperties:()=>({getProperty:k=>props.get(k),deleteProperty:k=>props.delete(k)})};
 c.LockService={getScriptLock:()=>({tryLock(){locked=available;return available;},releaseLock(){locked=false;}})};
 c.studentsSheet_=()=>({getLastRow:()=>students.length+1,getRange:()=>({getValues:()=>students})});c.requiredSheet_=()=>sheet;
 c.SpreadsheetApp={flush(){if(flushFails)throw Error('Transient write error');}};
 return {c,props,rows,students,setAvailable:v=>available=v,setFailure:v=>flushFails=v,locked:()=>locked,writes:()=>writes};
}
test('worker batches absolute summaries newest first; idle execution does no writes',()=>{
 const f=fixture();f.c.syncTranslationProgress();assert.equal(f.rows.length,3);assert.equal(f.rows[1][0],'22222222');assert.equal(f.rows[2][11],10);
 assert.equal(f.props.has('TRANSLATION_REPORT_DIRTY'),false);assert.equal(f.locked(),false);const n=f.writes();f.c.syncTranslationProgress();assert.equal(f.writes(),n);
});
test('busy worker and failed flush retain durable retry marker; replay never doubles counts',()=>{
 const f=fixture();f.setAvailable(false);f.c.syncTranslationProgress();assert.equal(f.writes(),0);assert.equal(f.props.get('TRANSLATION_REPORT_DIRTY'),'1');
 f.setAvailable(true);f.setFailure(true);assert.throws(()=>f.c.syncTranslationProgress(),/Transient/);assert.equal(f.locked(),false);assert.equal(f.props.get('TRANSLATION_REPORT_DIRTY'),'1');
 f.setFailure(false);f.c.syncTranslationProgress();assert.equal(f.rows.length,3);assert.equal(f.rows[2][11],10);
});
test('corrupt canonical records never clear reporting data or retry marker',()=>{
 const f=fixture();f.students[0][6]='{broken';assert.throws(()=>f.c.syncTranslationProgress());assert.equal(f.writes(),0);assert.equal(f.props.get('TRANSLATION_REPORT_DIRTY'),'1');assert.equal(f.locked(),false);
});
