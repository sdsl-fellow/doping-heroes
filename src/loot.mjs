import {catalog,catalogItem} from './catalog.mjs';
export const lootItems=catalog.filter(i=>i.slot!=='tool'&&i.quest===-2);
export const lootVariant=id=>catalogItem(id);
export function rollLevelLoot(owned,count,random=Math.random){
 const result=[],pool=lootItems.filter(i=>!owned.includes(i.id));
 for(let i=0;i<count&&pool.length;i++){const index=Math.min(pool.length-1,Math.floor(Math.max(0,random())*pool.length));result.push(pool.splice(index,1)[0].id);}
 return result;
}
