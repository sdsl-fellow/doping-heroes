import {Avatar} from './Avatar';
import type {Character} from './character';
import {equipment,slotNames,unlocked} from './equipment';
const iconIds=['tshirt','longsleeve','cardigan','basic','boots','cap','sword','trailcap','snowboots'];
export function Inventory({character,completed,purchased,onEquip}:{character:Character;completed:number[];purchased:string[];onEquip:(c:Character)=>void}){
 const owned=equipment.filter(item=>unlocked(item,completed,purchased));
 return <div className="inventory"><div className="inventory-preview"><Avatar character={character} size={128}/><p>아이콘을 누르면 바로 착용됩니다.<br/><small>착용 상태도 자동으로 저장됩니다.</small></p></div>
 {character.gender==='neutral'&&<p>동물은 모자와 액세서리를 착용합니다. 복장·신발·검은 인간 외형에서 사용할 수 있어요.</p>}
 {(Object.keys(slotNames) as (keyof typeof slotNames)[]).map(slot=><fieldset key={slot}><legend>{slotNames[slot]}</legend><div className="inventory-grid">{owned.filter(item=>item.slot===slot).map(item=>{const selected=character[slot]===item.id,compatible=character.gender!=='neutral'||slot==='hat';return <button key={item.id} type="button" aria-pressed={selected} disabled={!compatible} onClick={()=>onEquip({...character,[slot]:item.id})}>{item.id==='none'?<span className="empty-equipment" aria-hidden="true">—</span>:<span className="item-icon" aria-hidden="true" style={{backgroundImage:'url(./items.png)',backgroundPosition:`-${iconIds.indexOf(item.id)*64}px 0`}}/>}<strong>{item.name}</strong><small>{!compatible?'인간 외형 전용':selected?'착용 중':item.quest===-1?'기본 보유':'착용하기'}</small></button>;})}</div>{!owned.some(item=>item.slot===slot&&item.quest!==-1)&&slot!=='outfit'&&<p className="equipment-note">퀘스트를 완료하거나 도너 상점에서 새 장비를 얻을 수 있어요.</p>}</fieldset>)}
 </div>;
}
