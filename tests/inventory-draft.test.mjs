import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build} from 'esbuild';
// A small hook host lets the real Inventory component rerender without a browser.
const result=await build({stdin:{contents:"export {Inventory} from './src/Inventory.tsx'; export {begin,reset} from 'inventory-hooks';",resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'node',jsx:'automatic',plugins:[{name:'inventory-hook-host',setup(b){
 b.onResolve({filter:/^inventory-hooks$/},()=>({path:'hooks',namespace:'test'}));
 b.onLoad({filter:/.*/,namespace:'test'},()=>({contents:"let values=[],i=0;export const begin=()=>{i=0};export const reset=()=>{values=[];i=0};export function useState(initial){const k=i++;if(!(k in values))values[k]=typeof initial==='function'?initial():initial;return [values[k],v=>{values[k]=typeof v==='function'?v(values[k]):v}];}"}));
 b.onLoad({filter:/Inventory\.tsx$/},async args=>({contents:(await readFile(args.path,'utf8')).replace("import {useState} from 'react';","import {useState} from 'inventory-hooks';"),loader:'tsx'}));
}}]});
const {Inventory,begin,reset}=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
const character={gender:'neutral',species:'dog',outfit:'C01',shoes:'F01',hat:'none',weapon:'none',accessory:'none'};
test('selection stays local through stale server props; explicit save commits exactly once',async()=>{
 reset();let calls=0;
 const props={character,completed:[],purchased:[],onUse:()=>{},onSave:async c=>{calls++;return c;}};
 const render=()=>{begin();return Inventory(props).props;};
 render().onEquip({...character,outfit:'C03'});
 assert.equal(calls,0);assert.equal(render().character.outfit,'C03');assert.equal(props.character.outfit,'C01');
 await render().saveControl.props.children[0].props.onClick();
 assert.equal(calls,1);assert.equal(render().character.outfit,'C03');assert.equal(render().saveControl.props.children[0].props.disabled,true);
});
test('failed save keeps the selected outfit available for retry',async()=>{
 reset();const props={character,completed:[],purchased:[],onUse:()=>{},onSave:async()=>{throw Error('offline');}};
 const render=()=>{begin();return Inventory(props).props;};
 render().onEquip({...character,outfit:'none'});await render().saveControl.props.children[0].props.onClick();
 assert.equal(render().character.outfit,'none');assert.equal(render().saveControl.props.children[0].props.disabled,false);
 assert.equal(render().saveControl.props.children[1].props.children,'offline');
});
