import {catalogItem} from './catalog.mjs';
import {faceFit} from './face-fit.mjs';
import type {Character} from './character';
type Art=HTMLCanvasElement;
export type Gear=Partial<Record<'outfit'|'shoes'|'hat'|'weapon'|'accessory',Art>>;
const cache=new Map<string,Promise<Art>>();
function canvas(w:number,h:number){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
// Use the catalogue pixels, including their original palette, as the source of truth.
async function icon(id:string):Promise<Art>{
 const item=catalogItem(id);if(!item)throw new Error('알 수 없는 장비');
 if(cache.has(item.id))return cache.get(item.id)!;
 const promise=new Promise<Art>((resolve,reject)=>{const im=new Image();im.onerror=()=>reject(new Error('장비 이미지를 불러오지 못했습니다. 새로고침해 주세요.'));im.onload=()=>{
  const c=canvas(im.width,im.height),ctx=c.getContext('2d')!;ctx.drawImage(im,0,0);
  const data=ctx.getImageData(0,0,c.width,c.height),seen=new Uint8Array(c.width*c.height);let largest:number[]=[];const components:number[][]=[];
  // Exclude isolated extraction specks without cutting the actual item silhouette.
  for(let p=0;p<seen.length;p++){if(seen[p]||data.data[p*4+3]<32)continue;const component=[p];seen[p]=1;
   for(let k=0;k<component.length;k++){const n=component[k],x=n%c.width,y=Math.floor(n/c.width);for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,q=ny*c.width+nx;if(nx<0||nx>=c.width||ny<0||ny>=c.height||seen[q]||data.data[q*4+3]<32)continue;seen[q]=1;component.push(q);}}
   components.push(component);if(component.length>largest.length)largest=component;
  }
  if(!largest.length){reject(new Error('빈 장비 이미지'));return;}
  largest=components.filter(points=>points.length>=largest.length*.08).flat();
  const xs=largest.map(p=>p%c.width),ys=largest.map(p=>Math.floor(p/c.width));
  const x=Math.min(...xs),y=Math.min(...ys),w=Math.max(...xs)-x+1,h=Math.max(...ys)-y+1;
  const out=canvas(w,h),oc=out.getContext('2d')!;oc.drawImage(c,x,y,w,h,0,0,w,h);if(item.id==='C01'){const p=oc.getImageData(0,0,w,h);for(let i=0;i<p.data.length;i+=4){const value=Math.max(p.data[i],p.data[i+1],p.data[i+2]);p.data[i]=p.data[i+1]=p.data[i+2]=value;}oc.putImageData(p,0,0);}resolve(out);
 };im.src='./item-icons/'+item.assetCode+'.png?v=3';});cache.set(item.id,promise);promise.catch(()=>cache.delete(item.id));return promise;
}
export async function loadGear(c:Character):Promise<Gear>{const result:Gear={};await Promise.all((['outfit','shoes','hat','weapon','accessory'] as const).map(async s=>{if(catalogItem(c[s]))result[s]=await icon(c[s]);}));return result;}
function draw(ctx:CanvasRenderingContext2D,im:Art,x:number,y:number,w:number,h:number,mirror=false){ctx.save();ctx.imageSmoothingEnabled=false;if(mirror){ctx.translate(x+w,y);ctx.scale(-1,1);ctx.drawImage(im,0,0,w,h);}else ctx.drawImage(im,x,y,w,h);ctx.restore();}
function texture(ctx:CanvasRenderingContext2D,im:Art,x:number,y:number,w:number,h:number){ctx.drawImage(im,im.width*.25,im.height*.2,im.width*.5,im.height*.78,x,y,w,h);}
const hoodWindows=new WeakMap<Art,Art>();
function openHood(im:Art){
 if(hoodWindows.has(im))return hoodWindows.get(im)!;
 const c=canvas(im.width,im.height),ctx=c.getContext('2d')!;ctx.drawImage(im,0,0);
 ctx.globalCompositeOperation='destination-out';ctx.beginPath();ctx.ellipse(im.width*.51,im.height*.57,im.width*.24,im.height*.29,0,0,Math.PI*2);ctx.fill();hoodWindows.set(im,c);return c;
}
function bob(row:number,f:number){return row===2?(f===3||f===7?1:0):(f===1||f===5?1:0);}
// Human clothing retains the animated sleeve/torso mask, with the original item design.
export function paintCatalogLayer(ctx:CanvasRenderingContext2D,path:string,c:Character,g:Gear){
 if(c.gender==='neutral')return;
 if(path.startsWith('torso/')&&c.outfit==='none'){
  ctx.clearRect(0,0,576,256);
  for(let r=0;r<4;r++)for(let f=0;f<9;f++){
   ctx.save();ctx.translate(f*64,r*64+bob(r,f));const side=r===1||r===3;
   const points=c.gender==='female'
    ?side?[[21,34],[22,33],[23,33],[25,35],[28,36],[36,36],[38,35],[40,33],[41,33],[42,34],[40,40],[39,47],[25,47],[23,40]]
      :[[21,34],[22,32],[23,32],[25,35],[28,r===0?35:37],[36,r===0?35:37],[38,35],[40,32],[41,32],[43,34],[41,40],[39,47],[25,47],[23,40]]
    :side?[[29,35],[31,35],[32,38],[35,38],[36,35],[38,35],[36,45],[29,45]]
      :[[26,35],[29,35],[30,r===0?37:38],[34,r===0?37:38],[35,35],[38,35],[37,45],[27,45]];
   ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fillStyle='#f5f6f8';ctx.fill();ctx.strokeStyle='#cbd2dc';ctx.lineWidth=1;ctx.stroke();ctx.restore();
  }
 }else if(path.startsWith('torso/')&&g.outfit){
  for(let r=0;r<4;r++)for(let f=0;f<9;f++){
   const frame=canvas(64,64),fc=frame.getContext('2d')!;fc.imageSmoothingEnabled=false;fc.drawImage(ctx.canvas,f*64,r*64,64,64,0,0,64,64);
   fc.globalCompositeOperation='source-atop';const side=r===1||r===3;
   texture(fc,g.outfit,side?25:19,34+bob(r,f),side?15:27,20);
   ctx.clearRect(f*64,r*64,64,64);ctx.drawImage(frame,f*64,r*64);
  }
 }
 if(path.startsWith('hat/cloth/')&&g.hat){
  ctx.clearRect(0,0,576,256);
  for(let r=0;r<4;r++)for(let f=0;f<9;f++){const side=r===1||r===3,id=catalogItem(c.hat)!.id,high=['H06','H07','H08','H10'].includes(id),hood=id==='H09';const w=hood?29:side?26:30,h=hood?29:high?27:18;
   draw(ctx,hood&&r!==0?openHood(g.hat):g.hat,f*64+32-w/2,r*64+(hood?12:high?0:9)+bob(r,f),w,h,r===3);
  }
 }
 if(path.startsWith('feet/')&&g.shoes){
  const source=ctx.getImageData(0,0,576,256);ctx.clearRect(0,0,576,256);
  for(let r=0;r<4;r++)for(let f=0;f<9;f++)for(const [left,right] of [[0,32],[32,64]]){
   let minX=64,minY=64,maxX=-1,maxY=-1;
   for(let y=45;y<64;y++)for(let x=left;x<right;x++)if(source.data[((r*64+y)*576+f*64+x)*4+3]>60){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}
   if(maxX<0)continue;const im=g.shoes;ctx.drawImage(im,im.width*.48,0,im.width*.52,im.height,f*64+minX,r*64+minY,Math.max(5,maxX-minX+1),maxY-minY+1);
  }
 }
}
export function paintCatalogEquipment(ctx:CanvasRenderingContext2D,c:Character,g:Gear){
 const animal=c.gender==='neutral',dog=c.species==='dog';
 for(let r=0;r<4;r++)for(let f=0;f<9;f++){
  ctx.save();ctx.translate(f*64,r*64);ctx.beginPath();ctx.rect(0,0,64,64);ctx.clip();ctx.imageSmoothingEnabled=false;
  const side=r===1||r===3,b=bob(r,f),headX=animal?(r===1?21:r===3?43:32):32;
  if(animal){
   const raw=canvas(64,64),rc=raw.getContext('2d')!;rc.drawImage(ctx.canvas,f*64,r*64,64,64,0,0,64,64);
   if(g.outfit){
    const vest=canvas(64,64),vc=vest.getContext('2d')!;vc.imageSmoothingEnabled=false;
    // Fit a vest to the torso, leaving the face, tail and lower legs exposed.
    vc.save();vc.beginPath();if(side){vc.moveTo(27,35+b);vc.lineTo(43,35+b);vc.lineTo(44,47+b);vc.lineTo(27,48+b);}else if(r===0){vc.rect(25,33+b,15,18);}else{vc.rect(25,dog?44+b:45+b,14,8);}vc.closePath();vc.clip();
    texture(vc,g.outfit,side?26:24,side?34+b:r===0?33+b:43+b,side?20:17,side?16:r===0?19:12);vc.restore();
    vc.globalCompositeOperation='destination-in';vc.drawImage(raw,0,0);ctx.drawImage(vest,0,0);
    if(r===0)ctx.drawImage(raw,29,43+b,7,10,29,43+b,7,10);
   }
   if(g.shoes){
    const pixels=rc.getImageData(0,0,64,64).data;
    // Each visible paw follows its own animated bottom edge rather than a fixed bob.
    for(const [lo,hi] of (side?[[19,30],[30,38],[38,47]]:[[23,32],[32,42]])){
     let bottom=-1,min=64,max=-1;
     for(let y=49;y<61;y++)for(let x=lo;x<hi;x++)if(pixels[(y*64+x)*4+3]>100){if(y>bottom){bottom=y;min=x;max=x;}else if(y===bottom){min=Math.min(min,x);max=Math.max(max,x);}}
     if(bottom<51)continue;const im=g.shoes;ctx.drawImage(im,im.width*.48,0,im.width*.52,im.height,min-1,bottom-5,Math.max(5,max-min+3),6);
    }
   }
   if(g.weapon){const shield=catalogItem(c.weapon)?.base==='shield';draw(ctx,g.weapon,side?(r===1?33:18):r===0?32:38,side?29+b:32+b,shield?17:20,shield?17:24,r===3);}

  }else if(g.weapon){const base=catalogItem(c.weapon)?.base,shield=base==='shield';draw(ctx,g.weapon,r===1?(shield?8:4):39,shield?35+b:20+b,shield?19:24,shield?19:28,r===1);}
  if(g.accessory){const a=catalogItem(c.accessory)!,im=g.accessory,eyeY=animal?(dog?(side?33:38):(side?36:40)):29+b,bodyY=animal?44+b:39+b;
   const fit=faceFit(c,r,f);
   if(a.base==='glasses'&&r!==0){
    const tint=a.id==='A04'?'#66dbee':'#253344';ctx.lineWidth=1;
    for(const x of fit.eyes){ctx.beginPath();ctx.ellipse(x,fit.y,fit.lens/2,Math.max(1.5,fit.lens/2-.5),0,0,Math.PI*2);ctx.fillStyle=a.id==='A04'?'#82dfe950':'#b1d6e325';ctx.fill();ctx.strokeStyle=tint;ctx.stroke();ctx.fillStyle='#e9fcff';ctx.fillRect(Math.floor(x-1),Math.floor(fit.y-1),1,1);}
    ctx.fillStyle=tint;if(!side)ctx.fillRect(fit.eyes[0]+fit.lens/2,fit.y,fit.eyes[1]-fit.eyes[0]-fit.lens,1);else ctx.fillRect(r===1?fit.eyes[0]+3:fit.eyes[0]-7,fit.y-1,4,1);
   }
   if(a.base==='headband'){
    ctx.fillStyle='#982d32';ctx.fillRect(fit.bandX,fit.bandY,fit.bandWidth,3);ctx.fillStyle='#f04c49';ctx.fillRect(fit.bandX+1,fit.bandY,fit.bandWidth-2,2);ctx.fillStyle='#ff8a70';ctx.fillRect(fit.bandX+2,fit.bandY,fit.bandWidth-4,1);
    if(side||r===0){const knot=r===1?fit.bandX+fit.bandWidth-2:fit.bandX;ctx.fillStyle='#b72c39';ctx.fillRect(knot,fit.bandY+1,3,3);ctx.fillRect(knot+1,fit.bandY+4,2,4);}
   }
   if(a.base==='bracelet'||a.base==='ring')draw(ctx,im,animal?(r===1?25:36):(r===1?22:40),animal?50:45+b,a.base==='ring'?4:6,4,r===3);
   if(a.base==='badge'&&r!==0)draw(ctx,im,side?34:35,bodyY,6,6);
   if(a.base==='necklace'&&r!==0)draw(ctx,im,headX-6,bodyY-2,12,12);
   if(a.base==='earrings'&&r!==0){ctx.drawImage(im,0,0,im.width*.5,im.height,headX+(side?-5:7),eyeY+3,4,8);if(!side)ctx.drawImage(im,im.width*.5,0,im.width*.5,im.height,headX-11,eyeY+3,4,8);}
   if(a.base==='backpack'){if(r===0||side)draw(ctx,im,side?(r===1?34:19):25,animal?34+b:33+b,side?10:16,18,r===3);else{ctx.fillStyle='#a16d3d';ctx.fillRect(25,bodyY-3,2,12);ctx.fillRect(38,bodyY-3,2,12);}}
  }
  if(g.hat){
   if(animal){
   if(g.hat){const id=catalogItem(c.hat)!.id,high=['H06','H07','H08','H10'].includes(id),hood=id==='H09';const w=hood?24:23,h=hood?24:high?23:14;const y=(dog?(r===0?12:r===2?22:18):(r===0?17:r===2?(hood?27:22):(hood?23:18)))+b;
    draw(ctx,hood&&r!==0?openHood(g.hat):g.hat,headX-w/2,y-(high?9:0),w,h,r===3);
   }
   }else{const id=catalogItem(c.hat)!.id,high=['H06','H07','H08','H10'].includes(id),hood=id==='H09',w=hood?29:side?26:30,h=hood?29:high?27:18;
    draw(ctx,hood&&r!==0?openHood(g.hat):g.hat,32-w/2,(hood?12:high?0:9)+b,w,h,r===3);
   }
  }
  ctx.restore();
 }
}
