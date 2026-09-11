// Variants reuse the game's existing sprite layers with distinct palettes.
export const lootItems=[
 ['outfit','aurora-shirt','오로라 셔츠','longsleeve','#679abc',1],['outfit','ember-cardigan','불꽃 가디건','cardigan','#bd555f',2],['outfit','forest-shirt','숲빛 셔츠','longsleeve','#438674',1],['outfit','gold-tshirt','황금빛 티셔츠','tshirt','#c99746',0],
 ['shoes','crystal-boots','결정 부츠','boots','#81dce8',4],['shoes','ember-boots','불꽃 부츠','boots','#c26744',4],['shoes','moss-boots','이끼 부츠','boots','#7caa73',4],['shoes','violet-boots','보랏빛 부츠','boots','#aa83ca',4],
 ['weapon','crystal-sword','결정의 검','sword','#83dce9',6],['weapon','sun-sword','태양의 검','sword','#efd075',6],['weapon','ember-sword','불꽃의 검','sword','#e18b63',6],['weapon','moon-sword','달빛의 검','sword','#bca6df',6],
 ['hat','crystal-cap','결정 모자','cap','#83dce9',5],['hat','sun-cap','햇살 모자','cap','#efd075',5],['hat','forest-cap','깊은 숲 모자','cap','#438674',5],['hat','moon-cap','달빛 모자','cap','#bca6df',5]
].map(([slot,id,name,base,color,icon])=>({slot:String(slot),id:String(id),name:String(name),base:String(base),color:String(color),icon:Number(icon),quest:-2}));
export const lootVariant=id=>lootItems.find(item=>item.id===id);
export function rollLevelLoot(owned,count,random=Math.random){
 const result=[];const pool=lootItems.filter(item=>!owned.includes(item.id));
 for(let i=0;i<count&&pool.length;i++){const index=Math.min(pool.length-1,Math.floor(Math.max(0,random())*pool.length));result.push(pool.splice(index,1)[0].id);}
 return result;
}
