export const STAGE_RELEASE_KEY='doping-heroes:stage-releases:v1';
export const emptyStageReleases=()=>Array(12).fill(false);
export const normalizeStageReleases=value=>Array.from({length:12},(_,i)=>Array.isArray(value)&&value[i]===true);
export function nextGatewayKnock(state,index,now,windowMs=6000){
 const count=state?.index===index&&now<=state.deadline?state.count+1:1;
 return {index,count:count===7?0:count,deadline:now+windowMs,released:count===7};
}

export function readStageReleases(storage=globalThis.localStorage){
 try{return normalizeStageReleases(JSON.parse(storage?.getItem(STAGE_RELEASE_KEY)||'null'));}catch{return emptyStageReleases();}
}

export function releaseStage(index,storage=globalThis.localStorage){
 const next=readStageReleases(storage);
 if(!Number.isInteger(index)||index<0||index>=next.length)return next;
 next[index]=true;
 storage?.setItem(STAGE_RELEASE_KEY,JSON.stringify(next));
 globalThis.dispatchEvent?.(new CustomEvent('doping-stage-releases',{detail:next}));
 try{const channel=new BroadcastChannel('doping-stage-releases');channel.postMessage(next);channel.close();}catch{}
 return next;
}

export function subscribeStageReleases(listener){
 const emit=value=>listener(normalizeStageReleases(value));
 const storage=e=>{if(e.key===STAGE_RELEASE_KEY)try{emit(JSON.parse(e.newValue||'null'));}catch{emit(null);}};
 const local=e=>emit(e.detail);
 globalThis.addEventListener?.('storage',storage);
 globalThis.addEventListener?.('doping-stage-releases',local);
 let channel=null;
 try{channel=new BroadcastChannel('doping-stage-releases');channel.onmessage=e=>emit(e.data);}catch{}
 return()=>{globalThis.removeEventListener?.('storage',storage);globalThis.removeEventListener?.('doping-stage-releases',local);channel?.close();};
}

export const canEnterStage=(completed,index,root,released)=>Number.isInteger(index)&&index>=0&&index<12&&(root||(released===true&&stageUnlocked(completed,index)));
export const canContinueStage=(currentStage,completed,index,root,released)=>currentStage===index||canEnterStage(completed,index,root,released);
export function stageAccessBlock(completed,index,root,released){
 if(canEnterStage(completed,index,root,released))return null;
 if(Number.isInteger(index)&&index>=0&&index<12&&released!==true)return 'admin';
 return 'prerequisite';
}
import {stageUnlocked} from './maps.mjs';
