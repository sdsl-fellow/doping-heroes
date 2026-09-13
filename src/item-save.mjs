import {catalogItem,migrateItemId} from './catalog.mjs';

export const ITEM_SCHEMA=3;
export const oldCodes={F02:'F04',F03:'F02',F04:'F05',F05:'F03',H03:'H05',H04:'H03',H05:'H04'};
export const swappedHats={H06:'H07',H07:'H06'};
// Accept old saves without mutating them; all gameplay and new writes use codes.
export function normalizeItemSave(save){
 if(!save||typeof save!=='object')return save;
 const convert=id=>{
  const v2=Number(save.item_schema)>=2?id:(oldCodes[id]??id);
  return migrateItemId(Number(save.item_schema)>=3?v2:(swappedHats[v2]??v2));
 };
 const character={...save.character};
 for(const slot of ['outfit','shoes','hat','weapon','accessory']){
  if(character[slot])character[slot]=convert(character[slot]);
 }
 const quantities={};
 for(const [key,value] of Object.entries(save.quantities??{})){
  const id=convert(key);
  if(catalogItem(id))quantities[id]=Math.max(quantities[id]??0,Number.isInteger(value)?Math.max(0,Math.min(9999,value)):0);
 }
 return {...save,item_schema:ITEM_SCHEMA,character,purchased:[...new Set((save.purchased??[]).map(convert).filter(id=>catalogItem(id)))],quantities};
}

// Runtime IDs are already schema 3; never downgrade IDs on the wire.
export function toCloudItemSave(save){
 return normalizeItemSave({...save,item_schema:ITEM_SCHEMA});
}
