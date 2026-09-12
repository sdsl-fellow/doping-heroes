import {catalogItem,migrateItemId} from './catalog.mjs';
import {lootVariant} from './loot.mjs';
import {decorateWearable} from './wearables.ts';
import {loadGear,paintCatalogLayer,paintCatalogEquipment} from './catalog-wear.ts';
export type Character={gender:'male'|'female'|'neutral';species:'dog'|'cat';body:'sturdy'|'agile';shoes:string;hat:string;weapon:string;hair:string;hairColor:string;skin:string;outfit:string;outfitColor:string;accessory:string};
export const hairStyles=[['bedhead','내추럴 쇼트'],['bangs','앞머리'],['bob','단발'],['bangslong','롱 헤어'],['curly_long','웨이브'],['afro','컬리 볼륨']];
export const hairColors=['#392b36','#77452f','#bf803e','#f1d37e','#df839c','#679abc','#b298d1','#dae0e5'];
export const skinColors=['#ffe1be','#eaba90','#c58f64','#976647','#6b4736'];
export const outfitColors=['#e6e9e5','#456fa7','#438674','#bd555f','#c99746','#695c98','#3f4654'];
export const outfits=[['C01','세미 마을 티셔츠'],['C02','여행자 셔츠'],['C03','별빛 가디건']];
export const defaultCharacter:Character={gender:'male',species:'dog',body:'sturdy',shoes:'F01',hat:'none',weapon:'none',hair:'bedhead',hairColor:hairColors[1],skin:skinColors[0],outfit:'C01',outfitColor:outfitColors[0],accessory:'none'};
export function validCharacter(raw:unknown):Character{
 const r={...(raw&&typeof raw==='object'?raw:{})} as Partial<Character>;for(const slot of ['outfit','shoes','hat','weapon','accessory'] as const)if(r[slot])r[slot]=migrateItemId(r[slot]);
 return {gender:['male','female','neutral'].includes(r.gender??'')?r.gender!:defaultCharacter.gender,species:r.species==='cat'?'cat':'dog',body:r.body==='agile'||String(r.body)==='female'?'agile':'sturdy',shoes:lootVariant(r.shoes)?.slot==='shoes'?r.shoes!:r.shoes==='F04'?'F04':r.shoes==='F02'?'F02':'F01',hat:lootVariant(r.hat)?.slot==='hat'?r.hat!:r.hat==='H02'?'H02':r.hat==='H01'?'H01':'none',weapon:lootVariant(r.weapon)?.slot==='weapon'?r.weapon!:r.weapon==='W01'?'W01':'none',hair:hairStyles.some(s=>s[0]===r.hair)?r.hair!:defaultCharacter.hair,hairColor:hairColors.includes(r.hairColor??'')?r.hairColor!:defaultCharacter.hairColor,skin:skinColors.includes(r.skin??'')?r.skin!:defaultCharacter.skin,outfit:lootVariant(r.outfit)?.slot==='outfit'?r.outfit!:outfits.some(s=>s[0]===r.outfit)?r.outfit!:defaultCharacter.outfit,outfitColor:outfitColors.includes(r.outfitColor??'')?r.outfitColor!:defaultCharacter.outfitColor,accessory:catalogItem(r.accessory)?.slot==='accessory'?r.accessory!:'none'};
}
const base='./lpc/';
// Legacy asset names are resolved only at the rendering boundary.
function renderCharacter(c:Character):Character{
 return {...c,...Object.fromEntries(['outfit','shoes','hat','weapon','accessory'].map(slot=>[slot,catalogItem(c[slot as keyof Character])?.legacyId??c[slot as keyof Character]]))};
}
export function layers(c:Character){c=renderCharacter(c);const outfit=lootVariant(c.outfit),shoes=lootVariant(c.shoes),hat=lootVariant(c.hat),weapon=lootVariant(c.weapon);const clothesId=outfit?.base??c.outfit;if(c.gender==='neutral')return [{path:`animals/${c.species}/walk.png`,color:c.species==='dog'?'#dae0e5':c.hairColor},...(c.hat!=='none'?[{path:'hat/cloth/leather_cap/adult/walk.png',color:hat?.color??(c.hat==='trailcap'?'#b9dbe4':'#6b8c56')}]:[])];const clothes=clothesId==='cardigan'?'longsleeve/longsleeve2_cardigan':clothesId==='longsleeve'?'longsleeve/formal':'shortsleeve/tshirt';return [
 ...((weapon?.base??c.weapon)==='sword'?[{path:'weapon/sword/arming/universal/bg/walk/steel.png',color:weapon?.color??'#e1e8ee'}]:[]),
 {path:'body/bodies/male/walk.png',color:c.skin},
 {path:`head/heads/human/${c.gender}/walk.png`,color:c.skin},
 {path:'legs/pants/male/walk.png',color:'#38455c'},
 {path:`feet/${(shoes?.base??c.shoes)!=='basic'?'boots':'shoes'}/basic/male/walk.png`,color:shoes?.color??(c.shoes==='snowboots'?'#d6dfe3':c.shoes==='boots'?'#b88450':'#564433')},
 {path:`torso/clothes/${clothes}/male/walk.png`,color:(({ 'C01':'#fff0de','C02':'#fff0df','C03':'#514a8c','C04':'#2779dc','C05':'#538047','C06':'#e24439','C07':'#f5ad25'} as Record<string,string>)[outfit?.id as string]??outfit?.color??c.outfitColor)},
 {path:`hair/${c.hair}/adult/walk.png`,color:c.hairColor},
 ...(c.accessory==='headband'?[{path:'hat/headband/thick/adult/walk.png',color:'#d87569'}]:[]),
 ...(c.hat!=='none'?[{path:'hat/cloth/leather_cap/adult/walk.png',color:hat?.color??(c.hat==='trailcap'?'#b9dbe4':'#6b8c56')}]:[]),
 ...((weapon?.base??c.weapon)==='sword'?[{path:'weapon/sword/arming/universal/fg/walk/steel.png',color:weapon?.color??'#e1e8ee'}]:[])
 ];}
const cached=new Map<string,Promise<HTMLCanvasElement>>();
const images=new Map<string,Promise<HTMLImageElement>>();
function load(path:string){if(!images.has(path))images.set(path,new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>{images.delete(path);reject(new Error('캐릭터 이미지를 불러오지 못했습니다. 새로고침해 주세요.'));};img.src=base+path;}));return images.get(path)!;}
export function characterSheet(c:Character):Promise<HTMLCanvasElement>{
 c=renderCharacter(c);
 const key=JSON.stringify(c);if(cached.has(key))return cached.get(key)!;
 const result=loadGear(c).then(gear=>Promise.all(layers(c).filter(l=>!l.path.startsWith('weapon/')&&!l.path.startsWith('hat/headband/')&&!(c.gender==='neutral'&&l.path.startsWith('hat/'))).map(async l=>({image:await load(l.path),path:l.path,color:l.color,bodyLayer:/^(body|legs|feet|torso)\//.test(l.path),animalHat:c.gender==='neutral'&&l.path.startsWith('hat/'),shadeRange:255}))).then(parts=>{
  const out=document.createElement('canvas');out.width=576;out.height=256;const ctx=out.getContext('2d')!;
  parts.forEach(({image,path,color,shadeRange,bodyLayer,animalHat})=>{const layer=document.createElement('canvas');layer.width=576;layer.height=256;const lc=layer.getContext('2d')!;lc.drawImage(image,0,0);const pixels=lc.getImageData(0,0,576,256);const rgb=[1,3,5].map(i=>parseInt(color.slice(i,i+2),16));for(let i=0;i<pixels.data.length;i+=4){if(!pixels.data[i+3])continue;const max=Math.max(pixels.data[i],pixels.data[i+1],pixels.data[i+2]);const shade=Math.min(1,max/shadeRange);for(let j=0;j<3;j++)pixels.data[i+j]=Math.round(rgb[j]*shade);}lc.putImageData(pixels,0,0);decorateWearable(lc,path,c);paintCatalogLayer(lc,path,c,gear);if(animalHat){ctx.imageSmoothingEnabled=false;for(let row=0;row<4;row++)for(let f=0;f<9;f++){const hx=row===1?21:row===3?43:32;ctx.drawImage(layer,f*64,row*64,64,40,f*64+hx-22,row*64+(row===2?27:row===0?15:19),44,28);}}else if(bodyLayer){const baseWidth=c.body==='sturdy'?70:56;ctx.imageSmoothingEnabled=false;for(let row=0;row<4;row++)for(let f=0;f<9;f++){if(c.gender!=='female'){ctx.drawImage(layer,f*64,row*64,64,64,f*64+(64-baseWidth)/2,row*64,baseWidth,64);continue;}for(let y=0;y<64;y++){const waist=Math.max(0,1-Math.abs(y-42)/9);const feminine=c.gender==='female'?(0.91-0.055*waist):1;const w=baseWidth*feminine;ctx.drawImage(layer,f*64,row*64+y,64,1,f*64+(64-w)/2,row*64+y,w,1);}}}else ctx.drawImage(layer,0,0);});
  paintCatalogEquipment(ctx,c,gear);
  return out;
 }));cached.set(key,result);result.catch(()=>cached.delete(key));if(cached.size>40)cached.delete(cached.keys().next().value!);return result;
}
