import {shopCatalog,isConsumable,migrateItemId} from './catalog.mjs';

export const SALE_RATE=70;
const slots=['outfit','shoes','hat','weapon','accessory'];
export const labEquipmentIds=['A03','A04','T09','T06'];
export const salePrice=id=>{
 const item=shopCatalog.find(item=>item.id===id);
 return item&&!isConsumable(id)?Math.floor(item.price*SALE_RATE/100):0;
};
export const equippedForSale=(save,id)=>slots.some(slot=>migrateItemId(save?.character?.[slot])===id);
export function saleBlockReason(save,id){
 if(!salePrice(id))return '판매할 수 없는 아이템입니다.';
 if(!(save?.purchased??[]).some(owned=>migrateItemId(owned)===id))return '실제로 보유한 아이템만 판매할 수 있습니다.';
 if(equippedForSale(save,id))return '착용 해제 후 판매 가능';
 if(!Number.isSafeInteger(save.coins)||save.coins<0||save.coins+salePrice(id)>1000000000)return '보유 코인 한도를 초과하여 판매할 수 없습니다.';
 return '';
}
export const saleItems=save=>shopCatalog.filter(item=>!isConsumable(item.id)&&(save?.purchased??[]).some(id=>migrateItemId(id)===item.id));
export function sellItem(save,id){
 if(saleBlockReason(save,id))return save;
 // Keep rewards, quest progress, and consumable history intact.
 const quantities={...save.quantities};delete quantities[id];
 return {...save,coins:save.coins+salePrice(id),purchased:save.purchased.filter(owned=>migrateItemId(owned)!==id),quantities};
}

// Retrying an uncertain write must resend the same snapshot AND revision.
// The server's revision check then permits only one committed sale.
export function createSaleTransaction(){
 let pending=null;
 return {
  get pending(){return pending;},
  begin(save,revision,id){
   if(pending){if(pending.id!==id)throw new Error('이전 판매 결과를 먼저 확인해 주세요.');return pending;}
   const reason=saleBlockReason(save,id);if(reason)throw new Error(reason);
   pending={id,revision,candidate:sellItem(save,id)};return pending;
  },
  clear(){pending=null;}
 };
}
