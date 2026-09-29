import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';

const built=await build({entryPoints:['src/cloud.ts'],bundle:true,write:false,format:'esm',platform:'node'});
const moduleUrl=suffix=>'data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text+'\n//'+suffix).toString('base64');

test('v25 is verified before any account request and all calls use only the new endpoint',async()=>{
 const api=await import(moduleUrl('v25-routing'));
 const previousFetch=globalThis.fetch,previousWindow=globalThis.window,calls=[];
 globalThis.window={setTimeout,clearTimeout};
 globalThis.fetch=async(url,options)=>{
  calls.push({url,method:options.method,body:options.body});
  return {text:async()=>JSON.stringify(options.method==='GET'?{ok:true,apiVersion:25,item_schema:3}:{ok:true,allowed:true})};
 };
 try{
  const result=await api.checkCloudStudent('22221111');
  assert.equal(result.allowed,true);
  await api.loadCloud('token');
  assert.deepEqual(calls.map(c=>c.method),['GET','POST','POST']);
  assert.ok(calls.every(c=>c.url===api.CLOUD_API_URL));
  assert.match(api.CLOUD_API_URL,/AKfycbyW7Lk7vjVukqUeWaIw7KBa4bGGE_IO92rZN0QUFQWXAu8zwPl6QcCoyDQUthO941yY/);
 }finally{globalThis.fetch=previousFetch;globalThis.window=previousWindow;}
});

test('older or inaccessible servers receive no POST including saves',async()=>{
 for(const payload of [{ok:true,apiVersion:24,item_schema:3},{ok:true,apiVersion:26,item_schema:3},'<html>Google login</html>']){
  const api=await import(moduleUrl('reject-'+JSON.stringify(payload)));
  const previousFetch=globalThis.fetch,previousWindow=globalThis.window,calls=[];
  globalThis.window={setTimeout,clearTimeout};
  globalThis.fetch=async(url,options)=>{calls.push(options.method);return {text:async()=>typeof payload==='string'?payload:JSON.stringify(payload)};};
  try{
   await assert.rejects(api.saveCloud('token',{item_schema:3,character:{hat:'H07'},purchased:['H07'],completed:[]},1));
   assert.deepEqual(calls,['GET']);
  }finally{globalThis.fetch=previousFetch;globalThis.window=previousWindow;}
 }
});

test('verified v25 preserves equipment IDs and uses the 45-second request deadline',async()=>{
 const api=await import(moduleUrl('save-v25'));
 const previousFetch=globalThis.fetch,previousWindow=globalThis.window,calls=[],deadlines=[];
 globalThis.window={setTimeout:(fn,ms)=>{deadlines.push(ms);return setTimeout(fn,ms);},clearTimeout};
 globalThis.fetch=async(url,options)=>{
  calls.push(options);
  return {text:async()=>JSON.stringify(options.method==='GET'?{ok:true,apiVersion:25,item_schema:3}:{ok:true})};
 };
 try{
  await api.saveCloud('token',{item_schema:3,character:{hat:'H07'},purchased:['H07','H06'],completed:[],puzzle_completed:[]},1);
  assert.deepEqual(calls.map(c=>c.method),['GET','POST']);
  const save=JSON.parse(calls[1].body).save;
  assert.equal(save.character.hat,'H07');assert.deepEqual(save.purchased,['H07','H06']);
  assert.ok(deadlines.every(ms=>ms===45000));
 }finally{globalThis.fetch=previousFetch;globalThis.window=previousWindow;}
});

test('concurrent first requests share one version check',async()=>{
 const api=await import(moduleUrl('parallel-v25'));
 const previousFetch=globalThis.fetch,previousWindow=globalThis.window,calls=[];
 let release;const gate=new Promise(resolve=>{release=resolve;});
 globalThis.window={setTimeout,clearTimeout};
 globalThis.fetch=async(url,options)=>{calls.push(options.method);if(options.method==='GET')await gate;return {text:async()=>JSON.stringify(options.method==='GET'?{ok:true,apiVersion:25,item_schema:3}:{ok:true})};};
 try{
  const a=api.loadCloud('a'),b=api.loadCloud('b');
  assert.deepEqual(calls,['GET']);release();await Promise.all([a,b]);
  assert.deepEqual(calls,['GET','POST','POST']);
 }finally{release();globalThis.fetch=previousFetch;globalThis.window=previousWindow;}
});
