import {catalogItem,migrateItemId} from './catalog.mjs';
import {lootVariant} from './loot.mjs';
import {decorateWearable} from './wearables.ts';
export type Character={gender:'male'|'female'|'neutral';species:'dog'|'cat';body:'sturdy'|'agile';shoes:string;hat:string;weapon:string;hair:string;hairColor:string;skin:string;outfit:string;outfitColor:string;accessory:string};
export const hairStyles=[['bedhead','내추럴 쇼트'],['bangs','앞머리'],['bob','단발'],['bangslong','롱 헤어'],['curly_long','웨이브'],['afro','컬리 볼륨']];
export const hairColors=['#392b36','#77452f','#bf803e','#f1d37e','#df839c','#679abc','#b298d1','#dae0e5'];
export const skinColors=['#ffe1be','#eaba90','#c58f64','#976647','#6b4736'];
export const outfitColors=['#e6e9e5','#456fa7','#438674','#bd555f','#c99746','#695c98','#3f4654'];
export const outfits=[['C01','세미 마을 티셔츠'],['C02','긴팔 셔츠'],['C03','여행자 가디건']];
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
 {path:`torso/clothes/${clothes}/male/walk.png`,color:outfit&&outfit.quest!==-1?outfit.color:c.outfitColor},
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
 const result=Promise.all(layers(c).map(async l=>({image:await load(l.path),path:l.path,color:l.color,bodyLayer:/^(body|legs|feet|torso)\//.test(l.path),animalHat:c.gender==='neutral'&&l.path.startsWith('hat/'),shadeRange:255}))).then(parts=>{
  const out=document.createElement('canvas');out.width=576;out.height=256;const ctx=out.getContext('2d')!;
  parts.forEach(({image,path,color,shadeRange,bodyLayer,animalHat})=>{const layer=document.createElement('canvas');layer.width=576;layer.height=256;const lc=layer.getContext('2d')!;lc.drawImage(image,0,0);const pixels=lc.getImageData(0,0,576,256);const rgb=[1,3,5].map(i=>parseInt(color.slice(i,i+2),16));for(let i=0;i<pixels.data.length;i+=4){if(!pixels.data[i+3])continue;const max=Math.max(pixels.data[i],pixels.data[i+1],pixels.data[i+2]);const shade=Math.min(1,max/shadeRange);for(let j=0;j<3;j++)pixels.data[i+j]=Math.round(rgb[j]*shade);}lc.putImageData(pixels,0,0);decorateWearable(lc,path,c);if(animalHat){ctx.imageSmoothingEnabled=false;for(let row=0;row<4;row++)for(let f=0;f<9;f++){const hx=row===1?21:row===3?43:32;ctx.drawImage(layer,f*64,row*64,64,40,f*64+hx-22,row*64+(row===2?27:row===0?15:19),44,28);}}else if(bodyLayer){const baseWidth=c.body==='sturdy'?70:56;ctx.imageSmoothingEnabled=false;for(let row=0;row<4;row++)for(let f=0;f<9;f++){if(c.gender!=='female'){ctx.drawImage(layer,f*64,row*64,64,64,f*64+(64-baseWidth)/2,row*64,baseWidth,64);continue;}for(let y=0;y<64;y++){const waist=Math.max(0,1-Math.abs(y-42)/9);const feminine=c.gender==='female'?(0.91-0.055*waist):1;const w=baseWidth*feminine;ctx.drawImage(layer,f*64,row*64+y,64,1,f*64+(64-w)/2,row*64+y,w,1);}}}else ctx.drawImage(layer,0,0);});
  // Glasses are an optional functional overlay aligned to the head's eye line.
  if(c.accessory==='glasses'||c.accessory==='goggles'){
   ctx.strokeStyle=c.accessory==='goggles'?'#55cbe8':'#25334a';ctx.fillStyle=ctx.strokeStyle;ctx.lineWidth=1;
   for(let f=0;f<9;f++){
    const x=f*64,animal=c.gender==='neutral',frontBob=f===3||f===7?1:0,sideBob=f===1||f===5?1:0;
    if(animal){
     const dog=c.species==='dog',bob=f===1||f===5?-1:0,frontY=dog?39:40-bob;
     const left=dog?27:29,right=dog?36:35,lens=dog?5:4;
     ctx.strokeRect(x+left-lens/2,128+frontY-lens/2,lens,lens);ctx.strokeRect(x+right-lens/2,128+frontY-lens/2,lens,lens);ctx.fillRect(x+left+Math.ceil(lens/2),128+frontY,right-left-lens,1);
     for(const row of [1,3]){const ex=dog?(row===1?17:46):(row===1?18:44),ey=34+bob;ctx.strokeRect(x+ex-lens/2,row*64+ey-lens/2,lens,lens);ctx.fillRect(x+(row===1?ex+3:ex-6),row*64+ey-1,3,1);}
    }else{
     const y=128+28+frontBob;ctx.strokeRect(x+25.5,y+.5,5,5);ctx.strokeRect(x+33.5,y+.5,5,5);ctx.fillRect(x+31,y+2,2,1);
     for(const row of [1,3]){const sy=row*64+28+sideBob;ctx.strokeRect(x+(row===1?26.5:32.5),sy+.5,5,5);ctx.fillRect(x+(row===1?32:28),sy+2,4,1);}
    }
   }
  }
  // Animal bands follow the brow rather than scaling the human forehead layer.
  if(c.gender==='neutral'&&c.accessory==='headband'){
   const dog=c.species==='dog';
   for(let row=0;row<4;row++)for(let f=0;f<9;f++){
    const bob=f===1||f===5?(row===2?1:-1):0;
    const cx=row===1?(dog?21:21):row===3?(dog?42:41):32;
    const y=(row===0?(dog?20:25):row===2?(dog?33:35):(dog?28:28))+bob;
    const width=row===0||row===2?(dog?18:12):(dog?13:10);
    ctx.fillStyle='#79394a';ctx.fillRect(f*64+cx-width/2,row*64+y,width,3);
    ctx.fillStyle='#efac9f';ctx.fillRect(f*64+cx-width/2+1,row*64+y,width-2,1);
    ctx.fillStyle='#d87569';ctx.fillRect(f*64+cx-width/2,row*64+y+1,width,1);
   }
  }
  drawCatalogGear(ctx,c);
  return out;
 });cached.set(key,result);result.catch(()=>cached.delete(key));if(cached.size>40)cached.delete(cached.keys().next().value!);return result;
}
// Compact pixel overlays share the existing walking frames and direction anchors.
function drawCatalogGear(ctx:CanvasRenderingContext2D,c:Character){
 const weapon=catalogItem(c.weapon),a=catalogItem(c.accessory);
 for(let row=0;row<4;row++)for(let f=0;f<9;f++){
  ctx.save();ctx.translate(f*64,row*64+(f===1||f===5?1:0));
  const rect=(x:number,y:number,w:number,h:number,color:string)=>{ctx.fillStyle=color;ctx.fillRect(x,y,w,h);};
  const animal=c.gender==='neutral',hand=row===1?20:43,bodyY=animal?44:39;
  if(weapon&&weapon.base!=='sword'&&!animal){
   const col=weapon.color;
   if(weapon.base==='staff'){rect(hand,25,2,31,'#96714c');rect(hand-3,18,8,8,col);rect(hand-1,16,4,12,col);rect(hand,19,2,3,'#ffffff');}
   if(weapon.base==='hammer'){rect(hand,32,3,23,'#98704d');rect(hand-6,26,15,8,col);rect(hand-4,27,11,2,'#ecffff');}
   if(weapon.base==='pen'){rect(hand,29,3,22,'#243d5e');rect(hand,31,3,2,col);rect(hand,49,3,4,col);rect(hand+1,53,1,3,col);}
   if(weapon.base==='shield'){rect(hand-5,34,12,15,col);rect(hand-3,31,8,21,col);for(let n=0;n<3;n++){rect(hand-3+n*3,34,1,15,'#66668f');rect(hand-4,36+n*4,10,1,'#66668f');}}
   if(weapon.base==='bow'){ctx.strokeStyle=col;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(hand,25);ctx.quadraticCurveTo(hand+15,40,hand,55);ctx.stroke();rect(hand,25,1,30,'#d9edff');rect(hand-3,39,16,1,col);}
  }
  if(a&&!['glasses','headband'].includes(a.base)){
   const col=a.color;
   if(a.base==='bracelet'||a.base==='ring')rect(animal?40:hand,animal?51:46,a.base==='ring'?2:4,2,col);
   if(a.base==='badge'&&row!==0){rect(34,bodyY,5,6,col);rect(35,bodyY+1,3,2,'#fff0b8');}
   if(a.base==='necklace'&&row!==0){rect(28,bodyY-2,1,4,col);rect(36,bodyY-2,1,4,col);rect(29,bodyY+2,7,1,col);rect(31,bodyY+3,4,4,col);}
   if(a.base==='earrings'){for(const x of (row===1?[25]:row===3?[39]:[24,39])){rect(x,animal?39:30,1,3,'#e9c663');rect(x-1,animal?42:33,3,4,col);}}
   if(a.base==='backpack'){if(row===0){rect(25,bodyY-4,15,15,col);rect(27,bodyY+4,11,5,'#745237');rect(28,bodyY-6,9,2,col);}else if(row===2){rect(25,bodyY-4,2,13,col);rect(38,bodyY-4,2,13,col);}else rect(row===1?37:23,bodyY-3,5,13,col);}
  }
  ctx.restore();
 }
}
