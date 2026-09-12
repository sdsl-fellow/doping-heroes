import {catalogItem,migrateItemId} from './catalog.mjs';

// Accept old saves without mutating them; all gameplay and new writes use codes.
export function normalizeItemSave(save){
 if(!save||typeof save!=='object')return save;
 const character={...save.character};
 for(const slot of ['outfit','shoes','hat','weapon','accessory']){
  if(character[slot])character[slot]=migrateItemId(character[slot]);
 }
 const quantities={};
 for(const [key,value] of Object.entries(save.quantities??{})){
  const id=migrateItemId(key);
  if(catalogItem(id))quantities[id]=Math.max(quantities[id]??0,Number.isInteger(value)?Math.max(0,Math.min(9999,value)):0);
 }
 return {...save,character,purchased:[...new Set((save.purchased??[]).map(migrateItemId).filter(id=>catalogItem(id)))],quantities};
}
