import {isRootAccount} from './access.mjs';
const rows=[
 ['C','outfit',[
 ['tshirt','세미 마을 티셔츠',null,-1,'tshirt','#e6e9e5'],['longsleeve','여행자 셔츠',null,-1,'longsleeve','#e6e9e5'],['cardigan','별빛 가디건',null,-1,'cardigan','#456fa7'],['aurora-shirt','오로라 셔츠',100,-2,'longsleeve','#679abc'],['forest-shirt','숲빛 셔츠',100,-2,'longsleeve','#438674'],['ember-cardigan','불꽃 가디건',120,-2,'cardigan','#bd555f'],['gold-tshirt','황금빛 티셔츠',140,-2,'tshirt','#c99746'],['lab-coat','연구원 가운',160,-2,'cardigan','#edf2f6'],['cleanroom-suit','클린룸 방진복',200,-2,'longsleeve','#e5ffff'],['crystal-armor','결정 기사 갑옷',300,-2,'cardigan','#83cbdc']]],
 ['F','shoes',[
 ['basic','기본 신발',null,-1,'basic','#564433'],['boots','탐험 부츠',null,0,'boots','#b88450'],['sandals','사막 샌들',60,-2,'basic','#c59d62'],['snowboots','설산 부츠',80,-2,'boots','#d6dfe3'],['moss-boots','이끼 부츠',100,-2,'boots','#7caa73'],['violet-boots','보랏빛 부츠',120,-2,'boots','#aa83ca'],['crystal-boots','결정 부츠',140,-2,'boots','#81dce8'],['lab-shoes','연구실 안전화',150,-2,'basic','#45586a'],['cleanroom-shoes','클린룸 방진화',180,-2,'boots','#e4faff'],['electron-boots','전자 질주화',220,-2,'boots','#93dbed']]],
 ['H','hat',[
 ['cap','숲길 모자',null,1,'cap','#6b8c56'],['trailcap','푸른 탐험 모자',60,-2,'cap','#b9dbe4'],['forest-cap','깊은 숲 모자',80,-2,'cap','#438674'],['sun-cap','햇살 모자',100,-2,'cap','#efd075'],['miner-helmet','광부 안전모',100,-2,'cap','#e8b553'],['crystal-cap','결정 모자',120,-2,'cap','#83dce9'],['moon-cap','달빛 모자',120,-2,'cap','#bca6df'],['process-hat','공정 마법사 모자',180,-2,'cap','#526fbd'],['cleanroom-hood','클린룸 후드',200,-2,'cap','#e7f2ff'],['silicon-crown','실리콘 왕관',300,-2,'cap','#91cddd']]],
 ['W','weapon',[
 ['sword','새벽의 검',null,2,'sword','#e1e8ee'],['crystal-sword','결정의 검',180,-2,'sword','#83dce9'],['sun-sword','태양의 검',180,-2,'sword','#efd075'],['ember-sword','불꽃의 검',200,-2,'sword','#e18b63'],['lattice-hammer','격자 망치',200,-2,'hammer','#83dce9'],['donor-staff','도너 지팡이',220,-2,'staff','#53caff'],['acceptor-staff','억셉터 지팡이',220,-2,'staff','#d57dff'],['semiconductor-pen','반도체 만년필',230,-2,'pen','#ecd08a'],['wafer-shield','웨이퍼 방패',240,-2,'shield','#c2b0ef'],['photon-bow','광자 활',260,-2,'bow','#ffd56d']]],
 ['A','accessory',[
 ['glasses','안경',null,-1,'glasses','#25334a'],['headband','머리띠',null,-1,'headband','#d87569'],['grounding-bracelet','접지 팔찌',50,-2,'bracelet','#55a9dd'],['goggles','실험 고글',60,-2,'glasses','#55ddee'],['germanium-bracelet','저마늄 팔찌',100,-2,'bracelet','#d8a453'],['chip-ring','반도체 반지',120,-2,'ring','#e7c354'],['doping-backpack','도핑 배낭',120,-2,'backpack','#ab7949'],['research-badge','연구원 배지',130,-2,'badge','#e9c767'],['wafer-necklace','웨이퍼 목걸이',140,-2,'necklace','#bfb1ee'],['crystal-earrings','결정 귀걸이',160,-2,'earrings','#83dce9']]],
 ['T','tool',[
 ['gate-key','관문 열쇠',null,2,'key','#e6c56a'],['lecture-notes','낡은 책',null,-3,'book','#936949'],['dopant','불순물 꾸러미',10,-2,'pouch','#7bded5'],['donor-ampoule','도너 앰풀',20,-2,'vial','#58bbff'],['acceptor-ampoule','억셉터 앰풀',20,-2,'vial','#d674ec'],['wafer-fragment','웨이퍼 조각',30,-2,'material','#bdafe5'],['silicon-crystal','실리콘 결정',40,-2,'material','#6cd4ff'],['repair-kit','회로 수리 키트',50,-2,'tool','#8799aa'],['gold-tweezers','황금 트위져',60,-2,'tool','#eac357'],['process-blueprint','공정 설계도',80,-2,'tool','#548ecb']]]
];
// Keep artwork coordinates stable while catalogue codes follow display order.
const originalArtwork=new Map(rows.flatMap(([prefix,,items],row)=>items.map(([key],col)=>[key,{assetCode:prefix+String(col+1).padStart(2,'0'),icon:row*10+col}])));
const orders={F:['basic','sandals','moss-boots','boots','snowboots','violet-boots','crystal-boots','lab-shoes','cleanroom-shoes','electron-boots'],H:['cap','trailcap','sun-cap','miner-helmet','forest-cap','moon-cap','crystal-cap','process-hat','cleanroom-hood','silicon-crown']};
const prices={F:[null,60,80,null,100,120,140,150,180,220],H:[null,60,80,100,100,120,120,180,200,300]};
for(const [prefix,,items] of rows){if(!orders[prefix])continue;items.sort((a,b)=>orders[prefix].indexOf(a[0])-orders[prefix].indexOf(b[0]));items.forEach((item,i)=>item[2]=prices[prefix][i]);}
export const catalog=rows.flatMap(([prefix,slot,items],row)=>items.map(([legacyId,name,price,quest,base,color],col)=>({id:prefix+String(col+1).padStart(2,'0'),legacyId,name,price,quest,base,color,slot,code:prefix+String(col+1).padStart(2,'0'),row,col,...originalArtwork.get(legacyId)})));
export const catalogItem=id=>catalog.find(item=>item.id===id||item.legacyId===id);
export const slotNames={outfit:'의복 · Clothing',shoes:'신발 · Footwear',hat:'모자 · Headwear',weapon:'무기 · Weapons',accessory:'액세서리 · Accessories',tool:'도구·소모품 · Tools'};
export const migrateItemId=id=>catalogItem({'ember-boots':'lab-shoes','moon-sword':'semiconductor-pen'}[id]??id)?.id??id;
export const consumableIds=['T03','T04','T05'];
export const isConsumable=id=>consumableIds.includes(id);
export const itemDescription=item=>isConsumable(item.id)?(item.id==='T03'?'사용 시 현재 경험치 구간의 10% 증가':`사용 시 ${item.id==='T04'?'n형':'p형'} 시료로 전환하고 경험치 구간의 20% 증가`):item.id==='T01'?'첫걸음 완료 후 남쪽 관문을 여는 열쇠':item.id==='T02'?'각 스테이지에서 읽고 경험치를 받는 강의 노트':item.slot==='tool'?'수집용 연구 도구 · 추가 효과 없음':'외형 장비 · 능력치 추가 없음';
export const shopCatalog=catalog.filter(item=>item.price!==null).map(item=>({...item,price:item.price*3,description:itemDescription(item)}));
export function inventoryIds(s){
 const base=(s.purchased??[]).map(migrateItemId).filter(id=>catalogItem(id));
 if(isRootAccount(s))return catalog.map(i=>i.id);
 if((s.readBooks??[]).length)base.push('T02');
 for(const [id,count] of Object.entries(s.quantities??{}))if(count>0)base.push(migrateItemId(id));
 return catalog.filter(item=>item.quest===-1||(s.completed??[]).includes(item.quest)||base.includes(item.id)).map(item=>item.id);
}
