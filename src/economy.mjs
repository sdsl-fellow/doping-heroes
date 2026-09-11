import {stageForQuest,stageUnlocked} from './maps.mjs';
import {rollLevelLoot} from './loot.mjs';
import {addDopants,progress,MAX_DOPING} from './progression.mjs';
export const bridgeUnlocked=s=>[0,1,2].every(i=>s.completed.includes(i));
export function grantReward(s,q,random=Math.random){
 if(s.completed.includes(q.id))return s;
 if(q.id<3&&Array.from({length:q.id},(_,i)=>i).some(i=>!s.completed.includes(i)))return s;
 if(q.id>=3&&(!stageForQuest(q.id)||!stageUnlocked(s.completed,stageForQuest(q.id).index)))return s;
 return awardLevelLoot(s,{...s,completed:[...s.completed,q.id],doping:addDopants(s.doping,q.dose),coins:s.coins+q.coins},random);
}
export function purchase(s,item,alreadyOwned=false,random=Math.random){
 if(alreadyOwned||s.purchased.includes(item.id)||s.coins<item.price)return s;
 if(item.id==='dopant'&&s.doping>=MAX_DOPING)return s;
 const xp=progress(s.doping);
 return awardLevelLoot(s,{...s,coins:s.coins-item.price,doping:item.id==='dopant'?addDopants(s.doping,(xp.high-xp.low)/10):s.doping,purchased:item.id==='dopant'?s.purchased:[...s.purchased,item.id]},random);
}

function awardLevelLoot(before,after,random){
 const count=Math.max(0,progress(after.doping).stage-progress(before.doping).stage);
 const owned=after.purchased??[];return {...after,purchased:[...owned,...rollLevelLoot(owned,count,random)]};
}
