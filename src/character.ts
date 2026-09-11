export type Character={gender:'male'|'female'|'neutral';species:'dog'|'cat';body:'sturdy'|'agile';shoes:'basic'|'boots';hat:'none'|'cap';weapon:'none'|'sword';hair:string;hairColor:string;skin:string;outfit:string;outfitColor:string;accessory:'none'|'glasses'|'headband'};
export const hairStyles=[['bedhead','내추럴 쇼트'],['bangs','앞머리'],['bob','단발'],['bangslong','롱 헤어'],['curly_long','웨이브'],['afro','컬리 볼륨']];
export const hairColors=['#392b36','#77452f','#bf803e','#f1d37e','#df839c','#679abc','#b298d1','#dae0e5'];
export const skinColors=['#ffe1be','#eaba90','#c58f64','#976647','#6b4736'];
export const outfitColors=['#e6e9e5','#456fa7','#438674','#bd555f','#c99746','#695c98','#3f4654'];
export const outfits=[['tshirt','세미 마을 티셔츠'],['longsleeve','긴팔 셔츠'],['cardigan','여행자 가디건']];
export const defaultCharacter:Character={gender:'male',species:'dog',body:'sturdy',shoes:'basic',hat:'none',weapon:'none',hair:'bedhead',hairColor:hairColors[1],skin:skinColors[0],outfit:'tshirt',outfitColor:outfitColors[0],accessory:'none'};
export function validCharacter(raw:unknown):Character{
 const r=(raw&&typeof raw==='object'?raw:{}) as Partial<Character>;
 return {gender:['male','female','neutral'].includes(r.gender??'')?r.gender!:defaultCharacter.gender,species:r.species==='cat'?'cat':'dog',body:r.body==='agile'||String(r.body)==='female'?'agile':'sturdy',shoes:r.shoes==='boots'?'boots':'basic',hat:r.hat==='cap'?'cap':'none',weapon:r.weapon==='sword'?'sword':'none',hair:hairStyles.some(s=>s[0]===r.hair)?r.hair!:defaultCharacter.hair,hairColor:hairColors.includes(r.hairColor??'')?r.hairColor!:defaultCharacter.hairColor,skin:skinColors.includes(r.skin??'')?r.skin!:defaultCharacter.skin,outfit:outfits.some(s=>s[0]===r.outfit)?r.outfit!:defaultCharacter.outfit,outfitColor:outfitColors.includes(r.outfitColor??'')?r.outfitColor!:defaultCharacter.outfitColor,accessory:r.accessory==='glasses'?'glasses':r.accessory==='headband'?'headband':'none'};
}
const base='./lpc/';
export function layers(c:Character){const clothes=c.outfit==='cardigan'?'longsleeve/longsleeve2_cardigan':c.outfit==='longsleeve'?'longsleeve/longsleeve':'shortsleeve/tshirt';return [
 ...(c.weapon==='sword'?[{path:'weapon/sword/arming/universal/bg/walk/steel.png',color:'#e1e8ee'}]:[]),
 {path:'body/bodies/male/walk.png',color:c.gender==='neutral'?c.hairColor:c.skin},
 {path:c.gender==='neutral'?`head/heads/${c.species}/adult/walk.png`:`head/heads/human/${c.gender}/walk.png`,color:c.gender==='neutral'?c.hairColor:c.skin},
 {path:'legs/pants/male/walk.png',color:'#38455c'},
 {path:`feet/${c.shoes==='boots'?'boots':'shoes'}/basic/male/walk.png`,color:c.shoes==='boots'?'#b88450':'#564433'},
 {path:`torso/clothes/${clothes}/male/walk.png`,color:c.outfitColor},
 ...(c.gender==='neutral'?[]:[{path:`hair/${c.hair}/adult/walk.png`,color:c.hairColor}]),
 ...(c.accessory==='headband'?[{path:'hat/headband/thick/adult/walk.png',color:'#d87569'}]:[]),
 ...(c.hat==='cap'?[{path:'hat/cloth/leather_cap/adult/walk.png',color:'#6b8c56'}]:[]),
 ...(c.weapon==='sword'?[{path:'weapon/sword/arming/universal/fg/walk/steel.png',color:'#e1e8ee'}]:[])
 ];}
const cached=new Map<string,Promise<HTMLCanvasElement>>();
const images=new Map<string,Promise<HTMLImageElement>>();
function load(path:string){if(!images.has(path))images.set(path,new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>{images.delete(path);reject(new Error('캐릭터 이미지를 불러오지 못했습니다. 새로고침해 주세요.'));};img.src=base+path;}));return images.get(path)!;}
export function characterSheet(c:Character):Promise<HTMLCanvasElement>{
 const key=JSON.stringify(c);if(cached.has(key))return cached.get(key)!;
 const result=Promise.all(layers(c).map(async l=>({image:await load(l.path),color:l.color,bodyLayer:/^(body|legs|feet|torso)\//.test(l.path),shadeRange:255}))).then(parts=>{
  const out=document.createElement('canvas');out.width=576;out.height=256;const ctx=out.getContext('2d')!;
  parts.forEach(({image,color,shadeRange,bodyLayer})=>{const layer=document.createElement('canvas');layer.width=576;layer.height=256;const lc=layer.getContext('2d')!;lc.drawImage(image,0,0);const pixels=lc.getImageData(0,0,576,256);const rgb=[1,3,5].map(i=>parseInt(color.slice(i,i+2),16));for(let i=0;i<pixels.data.length;i+=4){if(!pixels.data[i+3])continue;const max=Math.max(pixels.data[i],pixels.data[i+1],pixels.data[i+2]);const shade=Math.min(1,max/shadeRange);for(let j=0;j<3;j++)pixels.data[i+j]=Math.round(rgb[j]*shade);}lc.putImageData(pixels,0,0);if(bodyLayer){const w=c.gender==='neutral'?58:c.body==='sturdy'?70:56;ctx.imageSmoothingEnabled=false;for(let row=0;row<4;row++)for(let f=0;f<9;f++)ctx.drawImage(layer,f*64,row*64,64,64,f*64+(64-w)/2,row*64,w,64);}else ctx.drawImage(layer,0,0);});
  // Glasses are an optional functional overlay aligned to the head's eye line.
  if(c.accessory==='glasses'){
   ctx.strokeStyle='#25334a';ctx.fillStyle='#25334a';ctx.lineWidth=1;
   // Eye pixels are at y=29..31, not y=24. Follow the head's per-frame bob.
   for(let f=0;f<9;f++){
    const x=f*64,frontBob=f===3||f===7?1:0,sideBob=f===1||f===5?1:0;
    const animalOffset=c.gender==='neutral'?(c.species==='cat'?-3:-2):0;
    const y=128+28+frontBob+animalOffset;
    ctx.strokeRect(x+25.5,y+.5,5,5);ctx.strokeRect(x+33.5,y+.5,5,5);
    ctx.fillRect(x+31,y+2,2,1);
    for(const row of [1,3]){const sy=row*64+28+sideBob+(c.gender==='neutral'?(c.species==='cat'?-3:-1):0);ctx.strokeRect(x+(row===1?26.5:32.5),sy+.5,5,5);ctx.fillRect(x+(row===1?32:28),sy+2,4,1);}
   }
  }
  return out;
 });cached.set(key,result);result.catch(()=>cached.delete(key));if(cached.size>40)cached.delete(cached.keys().next().value!);return result;
}
