import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const built=await build({entryPoints:['src/cloud.ts'],bundle:true,write:false,format:'esm',platform:'node'});
const {saveCloud}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
test('old deployment cannot receive a save; v7 receives H07 without reversing it',async()=>{
 const oldFetch=globalThis.fetch,oldWindow=globalThis.window;
 const calls=[];let schema=2;
 globalThis.window={setTimeout,clearTimeout};
 globalThis.fetch=async(url,options)=>{calls.push(options);return {text:async()=>JSON.stringify({ok:true,apiVersion:schema===3?19:7,item_schema:schema})};};
 try{
  const save={item_schema:3,character:{hat:'H07'},purchased:['H07','H06'],completed:[],puzzle_completed:[]};
  await assert.rejects(saveCloud('test-token',save,1),error=>error.code==='ITEM_SCHEMA_MISMATCH');
  assert.equal(calls.length,2);assert.ok(calls.every(call=>call.method==='GET'));
  schema=3;calls.length=0;await saveCloud('test-token',save,1);
  assert.equal(calls.length,2);const body=JSON.parse(calls[1].body);
  assert.equal(body.save.character.hat,'H07');assert.equal(body.save.item_schema,3);
  assert.deepEqual(body.save.purchased,['H07','H06']);
 }finally{globalThis.fetch=oldFetch;globalThis.window=oldWindow;}
});

test('verified login avoids pre-save GET and uses a 45-second deadline',async()=>{
 const api=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text+'\n//login-test').toString('base64'));
 const oldFetch=globalThis.fetch,oldWindow=globalThis.window;const calls=[],deadlines=[];
 globalThis.window={setTimeout:(fn,ms)=>{deadlines.push(ms);return setTimeout(fn,ms);},clearTimeout};
 globalThis.fetch=async(url,options)=>{calls.push(options);return {text:async()=>JSON.stringify({ok:true,student:{save:{item_schema:3,character:{hat:'H06'},purchased:['H06']},revision:1}})};};
 try{
  await api.loadCloud('test');calls.length=0;
  await api.saveCloud('test',{item_schema:3,character:{hat:'H06'},purchased:['H06']},1,false);
  assert.equal(calls.length,1);assert.equal(calls[0].method,'POST');
  assert.equal(JSON.parse(calls[0].body).save.character.hat,'H06');
  assert.equal(JSON.parse(calls[0].body).includeStages,false);
  assert.ok(deadlines.every(ms=>ms===45000));
 }finally{globalThis.fetch=oldFetch;globalThis.window=oldWindow;}
});

test('concurrent stage polling and save verification share one GET',async()=>{
 const api=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text+'\n//concurrency-test').toString('base64'));
 const oldFetch=globalThis.fetch,oldWindow=globalThis.window;const calls=[];let release;
 const gate=new Promise(resolve=>{release=resolve;});
 globalThis.window={setTimeout,clearTimeout};
 globalThis.fetch=async(url,options)=>{calls.push(options);if(options.method==='GET')await gate;return {text:async()=>JSON.stringify({ok:true,apiVersion:19,item_schema:3})};};
 try{
  const first=api.fetchCloudStages(),second=api.fetchCloudStages();
  const save=api.saveCloud('test',{item_schema:3,character:{hat:'H06'},purchased:['H06']},1);
  assert.equal(first,second);assert.equal(calls.length,1);release();
  await Promise.all([first,second,save]);
  assert.deepEqual(calls.map(c=>c.method),['GET','POST']);
 }finally{release();globalThis.fetch=oldFetch;globalThis.window=oldWindow;}
});


test('inaccessible v19 deployment keeps login and saves on the working endpoint',async()=>{
 const api=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text+'\n//fallback-test').toString('base64'));
 const oldFetch=globalThis.fetch,oldWindow=globalThis.window,calls=[];
 globalThis.window={setTimeout,clearTimeout};
 globalThis.fetch=async(url,options)=>{
  calls.push({url,method:options.method});
  return {text:async()=>url.includes('AKfycbx2Ko65')?'<html>Google login</html>':JSON.stringify({ok:true,apiVersion:18,item_schema:3})};
 };
 try{
  await api.fetchCloudStages();
  await api.loadCloud('test-token');
  assert.deepEqual(calls.map(c=>c.method),['GET','GET','POST']);
  assert.ok(calls[1].url.includes('AKfycbwt_pMjx'));
  assert.equal(calls[2].url,calls[1].url);
 }finally{globalThis.fetch=oldFetch;globalThis.window=oldWindow;}
});
