import {lootVariant} from './loot.mjs';
export type Character={gender:'male'|'female'|'neutral';species:'dog'|'cat';body:'sturdy'|'agile';shoes:string;hat:string;weapon:string;hair:string;hairColor:string;skin:string;outfit:string;outfitColor:string;accessory:'none'|'glasses'|'headband'};
export const hairStyles=[['bedhead','내추럴 쇼트'],['bangs','앞머리'],['bob','단발'],['bangslong','롱 헤어'],['curly_long','웨이브'],['afro','컬리 볼륨']];
export const hairColors=['#392b36','#77452f','#bf803e','#f1d37e','#df839c','#679abc','#b298d1','#dae0e5'];
export const skinColors=['#ffe1be','#eaba90','#c58f64','#976647','#6b4736'];
export const outfitColors=['#e6e9e5','#456fa7','#438674','#bd555f','#c99746','#695c98','#3f4654'];
export const outfits=[['tshirt','세미 마을 티셔츠'],['longsleeve','긴팔 셔츠'],['cardigan','여행자 가디건']];
export const defaultCharacter:Character={gender:'male',species:'dog',body:'sturdy',shoes:'basic',hat:'none',weapon:'none',hair:'bedhead',hairColor:hairColors[1],skin:skinColors[0],outfit:'tshirt',outfitColor:outfitColors[0],accessory:'none'};
export function validCharacter(raw:unknown):Character{
 const r=(raw&&typeof raw==='object'?raw:{}) as Partial<Character>;
 return {gender:['male','female','neutral'].includes(r.gender??'')?r.gender!:defaultCharacter.gender,species:r.species==='cat'?'cat':'dog',body:r.body==='agile'||String(r.body)==='female'?'agile':'sturdy',shoes:lootVariant(r.shoes)?.slot==='shoes'?r.shoes!:r.shoes==='snowboots'?'snowboots':r.shoes==='boots'?'boots':'basic',hat:lootVariant(r.hat)?.slot==='hat'?r.hat!:r.hat==='trailcap'?'trailcap':r.hat==='cap'?'cap':'none',weapon:lootVariant(r.weapon)?.slot==='weapon'?r.weapon!:r.weapon==='sword'?'sword':'none',hair:hairStyles.some(s=>s[0]===r.hair)?r.hair!:defaultCharacter.hair,hairColor:hairColors.includes(r.hairColor??'')?r.hairColor!:defaultCharacter.hairColor,skin:skinColors.includes(r.skin??'')?r.skin!:defaultCharacter.skin,outfit:lootVariant(r.outfit)?.slot==='outfit'?r.outfit!:outfits.some(s=>s[0]===r.outfit)?r.outfit!:defaultCharacter.outfit,outfitColor:outfitColors.includes(r.outfitColor??'')?r.outfitColor!:defaultCharacter.outfitColor,accessory:r.accessory==='glasses'?'glasses':r.accessory==='headband'?'headband':'none'};
}
const base='./lpc/';
export function layers(c:Character){const outfit=lootVariant(c.outfit),shoes=lootVariant(c.shoes),hat=lootVariant(c.hat),weapon=lootVariant(c.weapon);const clothesId=outfit?.base??c.outfit;if(c.gender==='neutral')return [{path:`animals/${c.species}/walk.png`,color:c.species==='dog'?'#dae0e5':c.hairColor},...(c.hat!=='none'?[{path:'hat/cloth/leather_cap/adult/walk.png',color:hat?.color??(c.hat==='trailcap'?'#b9dbe4':'#6b8c56')}]:[])];const clothes=clothesId==='cardigan'?'longsleeve/longsleeve2_cardigan':clothesId==='longsleeve'?'longsleeve/formal':'shortsleeve/tshirt';return [
 ...((weapon?.base??c.weapon)==='sword'?[{path:'weapon/sword/arming/universal/bg/walk/steel.png',color:weapon?.color??'#e1e8ee'}]:[]),
 {path:'body/bodies/male/walk.png',color:c.skin},
 {path:`head/heads/human/${c.gender}/walk.png`,color:c.skin},
 {path:'legs/pants/male/walk.png',color:'#38455c'},
 {path:`feet/${c.shoes!=='basic'?'boots':'shoes'}/basic/male/walk.png`,color:shoes?.color??(c.shoes==='snowboots'?'#d6dfe3':c.shoes==='boots'?'#b88450':'#564433')},
 {path:`torso/clothes/${clothes}/male/walk.png`,color:outfit?.color??c.outfitColor},
 {path:`hair/${c.hair}/adult/walk.png`,color:c.hairColor},
 ...(c.accessory==='headband'?[{path:'hat/headband/thick/adult/walk.png',color:'#d87569'}]:[]),
 ...(c.hat!=='none'?[{path:'hat/cloth/leather_cap/adult/walk.png',color:hat?.color??(c.hat==='trailcap'?'#b9dbe4':'#6b8c56')}]:[]),
 ...((weapon?.base??c.weapon)==='sword'?[{path:'weapon/sword/arming/universal/fg/walk/steel.png',color:weapon?.color??'#e1e8ee'}]:[])
 ];}
const cached=new Map<string,Promise<HTMLCanvasElement>>();
const images=new Map<string,Promise<HTMLImageElement>>();
function load(path:string){if(!images.has(path))images.set(path,new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>{images.delete(path);reject(new Error('캐릭터 이미지를 불러오지 못했습니다. 새로고침해 주세요.'));};img.src=base+path;}));return images.get(path)!;}
export function characterSheet(c:Character):Promise<HTMLCanvasElement>{
 const key=JSON.stringify(c);if(cached.has(key))return cached.get(key)!;
 const result=Promise.all(layers(c).map(async l=>({image:await load(l.path),color:l.color,bodyLayer:/^(body|legs|feet|torso)\//.test(l.path),animalHat:c.gender==='neutral'&&l.path.startsWith('hat/'),shadeRange:255}))).then(parts=>{
  const out=document.createElement('canvas');out.width=576;out.height=256;const ctx=out.getContext('2d')!;
  parts.forEach(({image,color,shadeRange,bodyLayer,animalHat})=>{const layer=document.createElement('canvas');layer.width=576;layer.height=256;const lc=layer.getContext('2d')!;lc.drawImage(image,0,0);const pixels=lc.getImageData(0,0,576,256);const rgb=[1,3,5].map(i=>parseInt(color.slice(i,i+2),16));for(let i=0;i<pixels.data.length;i+=4){if(!pixels.data[i+3])continue;const max=Math.max(pixels.data[i],pixels.data[i+1],pixels.data[i+2]);const shade=Math.min(1,max/shadeRange);for(let j=0;j<3;j++)pixels.data[i+j]=Math.round(rgb[j]*shade);}lc.putImageData(pixels,0,0);if(animalHat){ctx.imageSmoothingEnabled=false;for(let row=0;row<4;row++)for(let f=0;f<9;f++){const hx=row===1?21:row===3?43:32;ctx.drawImage(layer,f*64,row*64,64,40,f*64+hx-22,row*64+(row===2?27:row===0?15:19),44,28);}}else if(bodyLayer){const baseWidth=c.body==='sturdy'?70:56;ctx.imageSmoothingEnabled=false;for(let row=0;row<4;row++)for(let f=0;f<9;f++){if(c.gender!=='female'){ctx.drawImage(layer,f*64,row*64,64,64,f*64+(64-baseWidth)/2,row*64,baseWidth,64);continue;}for(let y=0;y<64;y++){const waist=Math.max(0,1-Math.abs(y-42)/9);const feminine=c.gender==='female'?(0.91-0.055*waist):1;const w=baseWidth*feminine;ctx.drawImage(layer,f*64,row*64+y,64,1,f*64+(64-w)/2,row*64+y,w,1);}}}else ctx.drawImage(layer,0,0);});
  // Glasses are an optional functional overlay aligned to the head's eye line.
  if(c.accessory==='glasses'){
   ctx.strokeStyle='#25334a';ctx.fillStyle='#25334a';ctx.lineWidth=1;
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
  return out;
 });cached.set(key,result);result.catch(()=>cached.delete(key));if(cached.size>40)cached.delete(cached.keys().next().value!);return result;
}

