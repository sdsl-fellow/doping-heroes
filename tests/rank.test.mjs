import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../google-apps-script/Code_v25_Stage2.gs',import.meta.url),'utf8');
const headers=['studentId','name','doping','type','coins','items','saveJson','revision','updatedAt','createdAt','pinSalt','pinHash','rankExcluded'];
const makeRow=(id,dose=1e14,excluded='')=>[id,'캐릭터 '+id,dose,'n',99,'W10',JSON.stringify({name:'캐릭터 '+id,character:{gender:'neutral',species:'dog',pinHash:'nested-secret'},translation_solved:['private']}),1,'','','salt-secret','hash-secret',excluded];
function fixture(){
 const data=[makeRow('099746',1e20),makeRow('test1',1e19,true),makeRow('test2',1e19,'TRUE'),makeRow('test3',1e19,' true '),...Array.from({length:12},(_,i)=>makeRow(String(i+1),1e16-i*1e14))];
 data[5][2]=data[4][2];
 const cache=new Map();let reads=0,role='root';
 const context=vm.createContext({PropertiesService:{getScriptProperties:()=>({getProperty:k=>k==='ROOT_STUDENT_ID'?'099746':k==='SPREADSHEET_ID'?'sheet':'root'})},Utilities:{newBlob:s=>({getBytes:()=>Buffer.from(s)})},CacheService:{getScriptCache:()=>({get:k=>cache.get(k),put:(k,v,ttl)=>{assert.equal(ttl,60);cache.set(k,v);}})}});
 vm.runInContext(source,context);
 context.verifyToken_=()=>({role,studentId:role==='root'?'099746':'1'});
 context.studentsSheet_=()=>{reads++;return {getLastColumn:()=>headers.length,getLastRow:()=>data.length+1,getRange:(r,c,h,w)=>({getValues:()=>r===1?[headers]:data})};};
 return {context,data,cache,reads:()=>reads,setRole:v=>{role=v;}};
}

test('ranking excludes root and flagged rows, sorts by doping, and assigns shared ranks',()=>{
 const f=fixture(),snapshot=f.context.rankSnapshot_(headers,f.data,'099746');
 assert.equal(snapshot.entries.length,12);
 assert.deepEqual(Array.from(snapshot.entries.slice(0,3),e=>e.rank),[1,1,3]);
 assert.ok(snapshot.entries.every(e=>!['099746','test1','test2','test3'].includes(e.studentId)));
 assert.throws(()=>f.context.rankSnapshot_(headers.slice(0,-1),f.data,'099746'),/Students/);
});

test('public payload is limited to top ten and contains no student IDs, PIN fields or saves',()=>{
 const f=fixture(),response=f.context.rankAction_({token:'root-token'});
 assert.equal(response.rank.entries.length,10);assert.equal(response.rank.total,12);
 assert.equal(response.rank.myRank,null);assert.equal(response.rank.excluded,true);
 const payload=JSON.stringify(response);
 for(const secret of ['studentId','pinHash','pinSalt','salt-secret','hash-secret','translation_solved','saveJson','nested-secret'])assert.ok(!payload.includes(secret),secret);
});

test('student requests are denied before reading even a warmed cache',()=>{
 const f=fixture();f.context.rankAction_({});f.setRole('student');
 assert.throws(()=>f.context.rankAction_({}),e=>e.code==='FORBIDDEN');
 assert.equal(f.reads(),1);
});

test('repeat opens reuse cache and refresh an expired snapshot',()=>{
 const f=fixture();f.context.rankAction_({});f.context.rankAction_({});assert.equal(f.reads(),1);
 const [key,value]=[...f.cache.entries()][0],snapshot=JSON.parse(value);snapshot.createdAt=Date.now()-61000;f.cache.set(key,JSON.stringify(snapshot));
 f.context.rankAction_({});assert.equal(f.reads(),2);
});

test('flag at the end of Students survives a normal progress save',()=>{
 const f=fixture(),row=f.data[1],before=JSON.stringify(row[12]);
 const sheet={getRange:(r,c,h,w)=>({setValues:values=>{values[0].forEach((v,i)=>{row[c-1+i]=v;});}})};
 f.context.SpreadsheetApp={flush(){}};
 f.context.writeStudentId_=()=>{};
 f.context.studentRow_=()=>Array(12).fill('updated');
 f.context.writeStudentProgress_(sheet,2,'test1','',{},1,'','','','');
 assert.equal(JSON.stringify(row[12]),before);
});

test('invalid or uncreated saves do not appear on the board',()=>{
 const f=fixture();f.data[4][6]='broken json';f.data[5][6]='{}';f.data[6][2]=NaN;
 assert.equal(f.context.rankSnapshot_(headers,f.data,'099746').entries.length,9);
});
