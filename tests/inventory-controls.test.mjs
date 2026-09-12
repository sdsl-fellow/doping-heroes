import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {catalog} from '../src/catalog.mjs';

// Exercise the actual JSX button props and click handlers, not a duplicate eligibility rule.
const bundle=await build({entryPoints:['src/Inventory.tsx'],bundle:true,write:false,platform:'node',format:'esm',jsx:'automatic'});
const {Inventory}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
function buttons(node,result=[]){
 if(Array.isArray(node)){for(const child of node)buttons(child,result);return result;}
 if(!node||typeof node!=='object')return result;
 if(node.type==='button')result.push(node);
 buttons(node.props?.children,result);return result;
}
for(const species of ['dog','cat'])test(`${species}: all 50 owned wearables can be clicked and equip their slot`,()=>{
 const character={gender:'neutral',species,outfit:'C01',shoes:'F01',hat:'none',weapon:'none',accessory:'none'};
 let equipped;
 const rendered=Inventory({character,completed:[],purchased:catalog.map(i=>i.id),quantities:{T04:1},onEquip:c=>{equipped=c;},onUse:()=>{}});
 const controls=new Map(buttons(rendered).map(b=>[b.key,b.props]));
 for(const item of catalog.filter(i=>i.slot!=='tool')){
  const button=controls.get(item.id);assert.ok(button,item.id);assert.equal(button.disabled,false,item.id);
  button.onClick();assert.deepEqual(equipped,{...character,[item.slot]:item.id});
 }
 assert.equal(controls.get('T01').disabled,true,'key is used at the gate');
 assert.equal(controls.get('T03').disabled,true,'empty consumable remains disabled');
 assert.equal(controls.get('T04').disabled,false,'owned consumable remains usable');
});
