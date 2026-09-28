export const FET_GAME_ID='fet-process-v1';
export const FET_GAME_POINT={x:768,y:920};
// Simplified planar, self-aligned nMOS flow. Isolation is grouped with substrate preparation.
export const processSteps=[
 {id:'substrate',title:'기판 준비·소자 분리',detail:'p형 실리콘 기판을 준비하고 소자 양옆의 분리 영역을 만듭니다.',hint:'소자를 만들 실리콘 기판과 활성 영역을 먼저 준비하세요.'},
 {id:'oxide',title:'게이트 산화막 형성',detail:'실리콘 표면에 얇은 SiO₂ 절연막을 형성합니다.',hint:'게이트와 실리콘 사이에는 먼저 얇은 절연막이 필요합니다.'},
 {id:'gate',title:'폴리실리콘 게이트 패터닝',detail:'폴리실리콘을 증착하고 패터닝해 게이트를 남깁니다.',hint:'소스·드레인의 자기정렬 주입에 사용할 게이트를 먼저 만드세요.'},
 {id:'implant',title:'소스·드레인 이온 주입',detail:'게이트를 마스크로 사용해 양옆에 도너를 주입합니다.',hint:'게이트가 준비되면 양옆에 도너를 주입할 수 있습니다.'},
 {id:'anneal',title:'열처리·도펀트 활성화',detail:'주입 손상을 회복하고 도너를 활성화해 n⁺ 소스·드레인을 만듭니다.',hint:'주입한 도펀트를 활성화하는 열처리가 필요합니다.'},
 {id:'contacts',title:'층간 절연막·콘택트·배선',detail:'절연막을 덮고 접촉 구멍을 연 뒤 금속으로 단자를 연결합니다.',hint:'고온 활성화 공정을 마친 뒤 단자와 배선을 연결하세요.'}
];
export function checkProcessOrder(order){
 if(order.length!==processSteps.length||new Set(order).size!==processSteps.length)return {correct:false,index:-1,message:'그림 6장을 모두 한 번씩 배치해 주세요.'};
 const index=processSteps.findIndex((step,i)=>step.id!==order[i]);
 return index<0?{correct:true,index:-1,message:'공정 순서 완성! MOSFET 동작을 확인해 보세요.'}:{correct:false,index,message:`${index+1}번째 공정을 다시 살펴보세요. ${processSteps[index].hint}`};
}
export function shuffleSteps(random=Math.random){
 const ids=processSteps.map(s=>s.id);
 for(let i=ids.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[ids[i],ids[j]]=[ids[j],ids[i]];}
 if(ids.every((id,i)=>id===processSteps[i].id))ids.reverse();
 return ids;
}
