import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const built=await build({entryPoints:['src/cloud.ts'],bundle:true,write:false,format:'esm',platform:'node'});
const {saveCloud}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
test('old deployment cannot receive a save; v7 receives H07 without reversing it',async()=>{
 const oldFetch=globalThis.fetch,oldWindow=globalThis.window;
 const calls=[];let schema=2;
 globalThis.window={setTimeout,clearTimeout};
 globalThis.fetch=async(url,options)=>{calls.push(options);return {text:async()=>JSON.stringify({ok:true,item_schema:schema})};};
 try{
  const save={item_schema:3,character:{hat:'H07'},purchased:['H07','H06'],completed:[],puzzle_completed:[]};
  await assert.rejects(saveCloud('test-token',save,1),error=>error.code==='ITEM_SCHEMA_MISMATCH');
  assert.equal(calls.length,1);assert.equal(calls[0].method,'GET');
  schema=3;calls.length=0;await saveCloud('test-token',save,1);
  assert.equal(calls.length,2);const body=JSON.parse(calls[1].body);
  assert.equal(body.save.character.hat,'H07');assert.equal(body.save.item_schema,3);
  assert.deepEqual(body.save.purchased,['H07','H06']);
 }finally{globalThis.fetch=oldFetch;globalThis.window=oldWindow;}
});
