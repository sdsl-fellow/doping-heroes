import {useRef,useState} from 'react';
import type {Save} from './save';
import {shopItems} from './adventure';
import {inventoryIds,isConsumable,purchaseLimitReached,consumablePurchaseCount,purchasePrice,slotNames} from './catalog.mjs';
import {saleItems,salePrice,saleBlockReason,labEquipmentIds} from './shop-sale.mjs';
import {ItemIcon} from './ItemIcon';
import './shop.css';

export function Shop({save,pending,onBuy,onSell}:{save:Save;pending:boolean;onBuy:(id:string)=>void;onSell:(id:string)=>Promise<void>}){
 const [tab,setTab]=useState<'buy'|'sell'>('buy'),[selected,setSelected]=useState<string|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const running=useRef(false),ownedIds=inventoryIds(save),items=saleItems(save);
 const confirmItem=shopItems.find(item=>item.id===selected);
 const sell=async()=>{
  if(!selected||running.current)return;
  running.current=true;setBusy(true);setMessage('');
  try{await onSell(selected);setMessage(`${confirmItem?.name} 판매 완료 · +${salePrice(selected)}코인`);setSelected(null);}
  catch(error){setMessage(error instanceof Error?error.message:'판매 결과를 확인하지 못했습니다.');}
  finally{running.current=false;setBusy(false);}
 };
 return <section className="shop-panel">
  <p className="shop-balance">보유 코인 ◉ {save.coins.toLocaleString()}</p>
  <div className="shop-tabs" aria-label="상점 메뉴"><button disabled={busy||pending} aria-pressed={tab==='buy'} onClick={()=>{setTab('buy');setMessage('');}}>구매</button><button disabled={busy||pending} aria-pressed={tab==='sell'} onClick={()=>{setTab('sell');setMessage('');}}>판매</button></div>
  {message&&<p className="shop-message" role="status">{message}</p>}
  {tab==='buy'?<><p>소모품은 구입 후 인벤토리에서 사용하세요.</p>{Object.entries(slotNames).map(([slot,label])=><section className="catalog-shop" key={slot}><h3>{label}</h3><div className="shop-grid">{shopItems.filter(item=>item.slot===slot).map(item=>{const owned=!isConsumable(item.id)&&ownedIds.includes(item.id),limited=purchaseLimitReached(save,item.id),price=purchasePrice(save,item);return <article key={item.id}><ItemIcon id={item.id}/><span className="catalog-code">{item.code}</span><h3>{item.name}</h3><p>{item.description}</p>{isConsumable(item.id)&&<p>{consumablePurchaseCount(save,item.id)+1}회차 · {Number.isFinite(price)?price.toLocaleString():'—'} 코인</p>}<button disabled={busy||pending||owned||limited||!Number.isFinite(price)||save.coins<price} onClick={()=>onBuy(item.id)}>{(owned||limited)?(Number.isFinite(price)?price.toLocaleString():'—')+' 코인 · 보유 중':Number.isFinite(price)?price.toLocaleString()+' 코인 · 구매':'구매 불가'}</button></article>;})}</div></section>)}</>:<>
   <p>상점 구매 가격의 70%로 판매합니다. 소모품과 상점 가격이 없는 아이템은 판매할 수 없습니다.</p>
   {confirmItem&&<div className="shop-sale-confirm" role="group" aria-label="판매 확인">
    <strong>{confirmItem.name}을(를) {salePrice(confirmItem.id).toLocaleString()}코인에 판매할까요?</strong>
    {labEquipmentIds.includes(confirmItem.id)&&<p>이 장비를 다시 구매하기 전까지 Stage 3 실험을 진행할 수 없습니다. 기존 완료 기록은 유지됩니다.</p>}
    {pending&&!busy&&<p>통신 오류로 판매 결과가 확정되지 않았습니다. 아래 버튼으로 같은 거래의 결과를 확인해 주세요. 추가 판매는 진행하지 않습니다.</p>}
    <div><button className="primary" disabled={busy||(!pending&&!!saleBlockReason(save,confirmItem.id))} onClick={()=>void sell()}>{busy?'판매 저장 중…':pending?'판매 결과 재확인':'판매 확정'}</button><button disabled={busy||pending} onClick={()=>setSelected(null)}>취소</button></div>
   </div>}
   {!items.length&&<p>판매할 수 있는 보유 아이템이 없습니다.</p>}
   {Object.entries(slotNames).map(([slot,label])=>{const group=items.filter(item=>item.slot===slot);return group.length>0&&<section className="catalog-shop" key={slot}><h3>{label}</h3><div className="shop-grid">{group.map(item=>{const reason=saleBlockReason(save,item.id);return <article key={item.id}><ItemIcon id={item.id}/><span className="catalog-code">{item.code}</span><h3>{item.name}</h3><p>판매가 {salePrice(item.id).toLocaleString()} 코인</p>{reason&&<p>{reason}</p>}<button disabled={busy||pending||!!reason} onClick={()=>{setSelected(item.id);setMessage('');}}>{reason?'판매 불가':'판매'}</button></article>;})}</div></section>;})}
  </>}
 </section>;
}
