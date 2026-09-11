import type {Character} from './character';
export const equipment = [
 {slot:'outfit',id:'tshirt',name:'세미 마을 티셔츠',quest:-1},
 {slot:'outfit',id:'longsleeve',name:'여행자 셔츠',quest:0},
 {slot:'outfit',id:'cardigan',name:'별빛 가디건',quest:2},
 {slot:'shoes',id:'basic',name:'기본 신발',quest:-1},
 {slot:'shoes',id:'boots',name:'탐험 부츠',quest:0},
 {slot:'hat',id:'none',name:'없음',quest:-1},
 {slot:'hat',id:'cap',name:'숲길 모자',quest:1},
 {slot:'weapon',id:'none',name:'없음',quest:-1},
 {slot:'weapon',id:'sword',name:'새벽의 검',quest:2},
] as const;
export const slotNames={outfit:'복장',shoes:'신발',hat:'모자',weapon:'무기'};
export const unlocked=(item:typeof equipment[number],completed:number[])=>item.quest<0||completed.includes(item.quest);
export const rewardNames=(quest:number)=>equipment.filter(i=>i.quest===quest).map(i=>i.name).join(' · ');
export function availableCharacter(c:Character,completed:number[]):Character {
 const result={...c};
 for(const slot of ['outfit','shoes','hat','weapon'] as const){
  const item=equipment.find(i=>i.slot===slot&&i.id===c[slot]);
  if(!item||!unlocked(item,completed))Object.assign(result,{[slot]:equipment.find(i=>i.slot===slot&&i.quest===-1)!.id});
 }
 return result;
}
