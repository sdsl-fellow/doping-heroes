import {Avatar} from './Avatar';
import type {Character} from './character';
import {equipment,slotNames,unlocked} from './equipment';
import {ItemIcon} from './ItemIcon';
import {isConsumable,itemDescription} from './catalog.mjs';
export function Inventory({character,completed,purchased,quantities={},onEquip,onUse}:{character:Character;completed:number[];purchased:string[];quantities?:Record<string,number>;onEquip:(c:Character)=>void;onUse:(id:string)=>void}){
 const owned=equipment.filter(item=>unlocked(item,completed,purchased));
 return <div className="inventory"><div className="inventory-preview"><Avatar character={character} size={128}/><div className="equipped-icons">{['outfit','shoes','hat','weapon','accessory'].map(slot=><ItemIcon key={slot} id={character[slot as keyof Character]}/>)}</div><p>장비를 눌러 착용하고, 소모품은 사용 버튼을 누르세요.</p></div>
 {character.gender==='neutral'&&<p>동물은 모자와 액세서리를 착용합니다.</p>}
 {Object.entries(slotNames).map(([slot,label])=><fieldset key={slot}><legend>{label}</legend><div className="inventory-grid">{owned.filter(item=>item.slot===slot).map(item=>{
 const tool=slot==='tool',selected=!tool&&character[slot as keyof Character]===item.id,compatible=character.gender!=='neutral'||['hat','accessory','tool'].includes(slot);
 const quantity=quantities[item.id]??0;
 return <button key={item.id} type="button" aria-pressed={tool?undefined:selected} disabled={!compatible||(tool&&(!isConsumable(item.id)||quantity<1))} onClick={()=>tool?onUse(item.id):onEquip({...character,[slot]:item.id})}><ItemIcon id={item.id}/><span className="catalog-code">{item.code}</span><strong>{item.name}</strong><small>{tool?(isConsumable(item.id)?quantity+'개 · 사용':item.id==='T01'?'관문에서 사용':item.id==='T02'?'스테이지에서 읽기':'수집품'):!compatible?'인간 외형 전용':selected?'착용 중':'착용하기'}</small>{tool&&<small>{itemDescription(item)}</small>}</button>;
 })}</div></fieldset>)}</div>;
}
