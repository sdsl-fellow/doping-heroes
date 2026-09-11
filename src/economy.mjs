import {addDopants,progress,MAX_DOPING} from './progression.mjs';
export const bridgeUnlocked=s=>[0,1,2].every(i=>s.completed.includes(i));
export function grantReward(s,q){
 if(s.completed.includes(q.id))return s;
 if(q.id<3&&Array.from({length:q.id},(_,i)=>i).some(i=>!s.completed.includes(i)))return s;
 if(q.id>=3&&!bridgeUnlocked(s))return s;
 return {...s,completed:[...s.completed,q.id],doping:addDopants(s.doping,q.dose),coins:s.coins+q.coins};
}
export function purchase(s,item,alreadyOwned=false){
 if(alreadyOwned||s.purchased.includes(item.id)||s.coins<item.price)return s;
 if(item.id==='dopant'&&s.doping>=MAX_DOPING)return s;
 const xp=progress(s.doping);
 return {...s,coins:s.coins-item.price,doping:item.id==='dopant'?addDopants(s.doping,(xp.high-xp.low)/10):s.doping,purchased:item.id==='dopant'?s.purchased:[...s.purchased,item.id]};
}
