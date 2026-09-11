import {catalog,slotNames as names} from './catalog.mjs';
import type {Character} from './character';
export const equipment=[...catalog,...['hat','weapon','accessory'].map(slot=>({slot,id:'none',name:'없음',quest:-1,code:'',price:null,base:'none',color:'#ffffff',row:0,col:0,icon:-1}))];
export const slotNames=names;
export const unlocked=(item:typeof equipment[number],completed:number[],purchased:string[]=[])=>item.quest===-1||completed.includes(item.quest)||purchased.includes(item.id);
export const rewardNames=(quest:number)=>equipment.filter(i=>i.quest===quest).map(i=>i.name).join(' · ');
export function availableCharacter(c:Character,completed:number[],purchased:string[]=[]):Character{
 const result={...c};
 for(const slot of ['outfit','shoes','hat','weapon','accessory'] as const){
 const item=equipment.find(i=>i.slot===slot&&i.id===c[slot]);
 if(!item||!unlocked(item,completed,purchased))result[slot]=equipment.find(i=>i.slot===slot&&i.quest===-1)!.id;
 }return result;
}
export const equipmentIcon=(id:string)=>catalog.find(i=>i.id===id)?.icon??-1;
