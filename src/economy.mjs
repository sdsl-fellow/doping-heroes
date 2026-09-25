import {bookSources,firstBookSource,hasReadSource} from './book-progress.mjs';
import {stageForQuest,stageUnlocked} from './maps.mjs';
import {isRootAccount} from './access.mjs';
import {isConsumable,catalogItem} from './catalog.mjs';
import {rollLevelLoot} from './loot.mjs';
import {addDopants,progress,MAX_DOPING,stageDose} from './progression.mjs';
export const bridgeUnlocked=s=>[0,1,2].every(i=>s.completed.includes(i));
export function grantReward(s,q,random=Math.random){
 if(s.completed.includes(q.id))return s;
 if(q.id<3&&Array.from({length:q.id},(_,i)=>i).some(i=>!s.completed.includes(i)))return s;
 if(q.id>=3&&(!stageForQuest(q.id)||!stageUnlocked(s.completed,stageForQuest(q.id).index,isRootAccount(s))))return s;
 return awardLevelLoot(s,{...s,completed:[...s.completed,q.id],doping:addDopants(s.doping,q.dose),coins:s.coins+q.coins},random);
}
export function purchase(s,item,alreadyOwned=false,random=Math.random){
 if(!Number.isFinite(item.price)||item.price<0||alreadyOwned||(!isConsumable(item.id)&&s.purchased.includes(item.id))||s.coins<item.price)return s;
 if(isConsumable(item.id)&&((s.quantities?.[item.id]??0)>=9999||s.doping>=MAX_DOPING))return s;
 if(isConsumable(item.id))return {...s,coins:s.coins-item.price,purchased:[...new Set([...s.purchased,item.id])],quantities:{...s.quantities,[item.id]:(s.quantities?.[item.id]??0)+1}};
 return {...s,coins:s.coins-item.price,purchased:[...s.purchased,item.id]};
}

export function useConsumable(s,id,random=Math.random){
 if(!isConsumable(id)||!catalogItem(id)||s.doping>=MAX_DOPING||(!isRootAccount(s)&&(s.quantities?.[id]??0)<1))return s;
 const xp=progress(s.doping),fraction=id==='T03'?.1:.2;
 return awardLevelLoot(s,{...s,type:id==='T04'?'n':id==='T05'?'p':s.type,doping:addDopants(s.doping,(xp.high-xp.low)*fraction),quantities:{...s.quantities,[id]:Math.max(0,(s.quantities?.[id]??0)-1)}},random);
}

function awardLevelLoot(before,after,random){
 const count=Math.max(0,progress(after.doping).stage-progress(before.doping).stage);
 const owned=after.purchased??[];return {...after,purchased:[...owned,...rollLevelLoot(owned,count,random)]};
}


export const bookDose=index=>stageDose(index)*.02;
export function grantBookReward(s,index,random=Math.random,sourceId=firstBookSource(index)){
 const allowed=index===0?[firstBookSource(0),'SE02-ATOMS-2026']:[firstBookSource(index)];
 if(!allowed.includes(sourceId)||!stageUnlocked(s.completed,index,isRootAccount(s))||hasReadSource(s,index,sourceId))return s;
 return awardLevelLoot(s,{...s,readBookSources:[...bookSources(s),sourceId],readBooks:[...new Set([...(s.readBooks??[]),index])],doping:addDopants(s.doping,bookDose(index))},random);
}
