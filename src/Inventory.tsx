import {useState} from 'react';
import {Avatar} from './Avatar';
import type {Character} from './character';
import {slotNames} from './equipment';
import {ItemIcon} from './ItemIcon';
import {catalog,inventoryIds,isConsumable,itemDescription} from './catalog.mjs';
export function InventoryControls({character,completed,purchased,quantities={},onEquip,onUse,saveControl,busy=false}:{character:Character;completed:number[];purchased:string[];quantities?:Record<string,number>;onEquip:(c:Character)=>void;onUse:(id:string)=>void;saveControl?:import('react').ReactNode;busy?:boolean}){
 const ids=inventoryIds({completed,purchased,quantities});
 const owned=catalog.filter(item=>ids.includes(item.id));
 return <div className="inventory"><div className="inventory-preview"><Avatar character={character} size={128}/><div className="equipped-icons">{['outfit','shoes','hat','weapon','accessory'].map(slot=><ItemIcon key={slot} id={character[slot as keyof Character]}/>)}</div><p>장비 선택은 미리보기에만 적용됩니다. 저장을 눌러 착용을 확정하세요.</p></div>
 {saveControl}
 {character.gender==='neutral'&&<p>동물도 의복·신발·모자·무기·액세서리를 착용할 수 있습니다.</p>}
 {Object.entries(slotNames).map(([slot,label])=><fieldset key={slot}><legend>{label}</legend><div className="inventory-grid">{owned.filter(item=>item.slot===slot).map(item=>{
 const tool=slot==='tool',selected=!tool&&character[slot as keyof Character]===item.id;
 const quantity=quantities[item.id]??0;
 return <button key={item.id} type="button" aria-pressed={tool?undefined:selected} disabled={busy||(tool&&(!isConsumable(item.id)||quantity<1))} onClick={()=>tool?onUse(item.id):onEquip({...character,[slot]:item.id})}><ItemIcon id={item.id}/><span className="catalog-code">{item.code}</span><strong>{item.name}</strong>{tool&&<small>{isConsumable(item.id)?quantity+'개 · 사용':item.id==='T01'?'관문에서 사용':item.id==='T02'?'스테이지에서 읽기':'수집품'}</small>}{tool&&<small>{itemDescription(item)}</small>}</button>;
 })}{slot!=='tool'&&<button type="button" key={'none-'+slot} disabled={busy} aria-pressed={character[slot as keyof Character]==='none'} onClick={()=>onEquip({...character,[slot]:'none'})}><span className="catalog-icon empty-equipment">—</span><strong>없음</strong></button>}</div></fieldset>)}</div>;
}

export function Inventory({onSave,...props}:Omit<Parameters<typeof InventoryControls>[0],'onEquip'|'saveControl'>&{onSave:(c:Character)=>Promise<Character>}){
 const [draft,setDraft]=useState(()=>({...props.character})),[saved,setSaved]=useState(()=>({...props.character})),[saving,setSaving]=useState(false),[message,setMessage]=useState('');
 const dirty=JSON.stringify(draft)!==JSON.stringify(saved);
 const commit=async()=>{if(saving)return;setSaving(true);setMessage('');try{const next=await onSave(draft);setDraft(next);setSaved(next);setMessage('서버에 저장했습니다.');}catch(error){setMessage(error instanceof Error?error.message:'저장하지 못했습니다. 다시 시도해 주세요.');}finally{setSaving(false);}};
 return <InventoryControls {...props} busy={saving} onUse={id=>{if(!saving)props.onUse(id);}} character={draft} onEquip={c=>{if(!saving){setDraft(c);setMessage('');}}} saveControl={<div className="inventory-save"><button type="button" className="primary" disabled={saving||!dirty} onClick={commit}>{saving?'저장 중…':'저장'}</button><small role="status">{message||(dirty?'저장하지 않은 착용 변경이 있습니다.':'아이템을 선택한 뒤 저장하세요.')}</small></div>}/>;
}
