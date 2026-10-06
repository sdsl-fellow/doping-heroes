import type {Character} from './character';
import {faceFit} from './face-fit.mjs';

type Point=[number,number];
const ink='#182634';
function polygon(ctx:CanvasRenderingContext2D,points:Point[],fill:string){
 ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fillStyle=fill;ctx.fill();
}
function line(ctx:CanvasRenderingContext2D,points:Point[],color:string,width:number){
 ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineJoin='round';ctx.lineCap='round';ctx.stroke();
}
function shade(color:string,amount:number){
 return '#'+[1,3,5].map(i=>Math.round(parseInt(color.slice(i,i+2),16)*amount).toString(16).padStart(2,'0')).join('');
}
// Use the same horizontal body transform as the front-facing LPC frame.
function bodyX(c:Character,x:number,y:number){
 const waist=Math.max(0,1-Math.abs(y-42)/9),upper=Math.max(0,1-Math.abs(y-38)/12);
 const width=(c.body==='sturdy'?70:56)*(c.gender==='female'?.91-.16*upper-.035*waist:1);
 return 32+(x-32)*width/64;
}
function hands(c:Character):{left:Point;right:Point;wrist:Point;skin:string;scale:number}{
 if(c.gender==='neutral')return c.species==='dog'
  ?{left:[26,53],right:[36.5,53],wrist:[36.5,50.5],skin:'#f5f6f5',scale:.85}
  :{left:[28,48],right:[36,51],wrist:[36,48.5],skin:c.hairColor,scale:.7};
 return {left:[bodyX(c,20.5,47),47],right:[bodyX(c,43,47),47],wrist:[bodyX(c,44,43),43.5],skin:c.skin,scale:c.body==='agile'?.85:1};
}

function goggles(ctx:CanvasRenderingContext2D,c:Character){
 const fit=faceFit(c,2,0),center=(fit.eyes[0]+fit.eyes[fit.eyes.length-1])/2;
 const eyeDistance=fit.eyes[fit.eyes.length-1]-fit.eyes[0];
 ctx.save();ctx.translate(center,fit.y);ctx.scale(eyeDistance/8,1);
 // Front view: equal lenses, a central nose bridge, and short temples.
 // The strap disappears behind the head instead of showing an oblique rear loop.
 polygon(ctx,[[-11,-2.2],[-9,-2.8],[9,-2.8],[11,-2.2],[11,.9],[9,1.5],[-9,1.5],[-11,.9]],ink);
 polygon(ctx,[[-10,-1.4],[-8.5,-1.8],[-8.5,.4],[-10,.7]],'#4a6874');
 polygon(ctx,[[10,-1.4],[8.5,-1.8],[8.5,.4],[10,.7]],'#4a6874');
 const frame:Point[]=[[-9,-3.4],[-7.8,-4],[7.8,-4],[9,-3.4],[9,2],[7.5,3.5],[2,3.5],[0,1.8],[-2,3.5],[-7.5,3.5],[-9,2]];
 polygon(ctx,frame,ink);
 polygon(ctx,[[-8,-3],[-7,-3.3],[7,-3.3],[8,-3],[8,1.7],[7,2.5],[2.3,2.5],[0,.8],[-2.3,2.5],[-7,2.5],[-8,1.7]],'#47d8ee');
 for(const side of [-1,1]){
  ctx.save();ctx.scale(side,1);
  polygon(ctx,[[1,-2],[6.8,-2],[7.2,-1.5],[7.2,1.3],[6.5,2],[2.6,2],[1,.4]],'#edf8fb');
  polygon(ctx,[[1.8,-1.4],[6.5,-1.4],[6.5,1.1],[6,1.5],[3,1.5],[1.8,.2]],'#174b66');
  polygon(ctx,[[2,-1.2],[4,-1.2],[2.8,1.1],[2,.2]],'#60b7ce');
  line(ctx,[[4.8,-1.1],[3.7,.6]],'#b7f4f9',.55);
  ctx.restore();
 }
 line(ctx,[[-7.3,-2.8],[-2,-2.8]],'#b9faff',.65);line(ctx,[[2,-2.8],[7.3,-2.8]],'#b9faff',.65);
 ctx.restore();
}

function bracelet(ctx:CanvasRenderingContext2D,wrist:Point,scale:number){
 ctx.save();ctx.translate(...wrist);ctx.scale(scale,scale);
 // Narrow sides curve behind the wrist; the blue band and silver snap cross its front.
 polygon(ctx,[[-2.8,-1.2],[-2,-1.8],[2,-1.8],[2.8,-1.2],[2.8,1],[2,1.8],[-2,1.8],[-2.8,1]],ink);
 polygon(ctx,[[-2.1,-.9],[-1.5,-1.2],[1.5,-1.2],[2.1,-.9],[2.1,.9],[1.5,1.1],[-1.5,1.1],[-2.1,.9]],'#2468c4');
 line(ctx,[[-1.9,-.8],[1.9,-.8]],'#67baff',.55);
 polygon(ctx,[[-.8,-.7],[.6,-.7],[1.1,-.2],[1.1,.7],[.5,1.1],[-.8,.7]],'#d4e6ec');
 ctx.fillStyle='#ffffff';ctx.fillRect(-.45,-.5,.7,.5);
 // A thin coiled lead hangs from the snap, not a second detached bracelet.
 line(ctx,[[1,1],[2.8,2],[3,4.2],[2.4,5.2]],ink,1.4);
 line(ctx,[[1,1],[2.8,2],[3,4.2],[2.4,5.2]],'#8eafb8',.6);
 for(let y=2.2;y<4.6;y+=.8)line(ctx,[[2.5,y],[3.35,y+.3]],'#dce9e9',.4);
 ctx.restore();
}

function fingers(ctx:CanvasRenderingContext2D,hand:Point,skin:string,scale:number,mirror=false){
 ctx.save();ctx.translate(...hand);ctx.scale((mirror?-1:1)*scale,scale);
 // Thumb and two finger segments cover the tool, with a dark crease at the grip.
 polygon(ctx,[[-2,-1.7],[-.7,-2],[1,-1],[1.4,.2],[.8,2],[-1.3,2],[-2,1]],shade(skin,.55));
 polygon(ctx,[[-1.6,-1.3],[-.6,-1.6],[.8,-.6],[.9,.4],[-1.1,.5]],shade(skin,.96));
 polygon(ctx,[[-1.6,1],[-.2,.7],[.8,1.1],[.6,1.7],[-1.2,1.7]],shade(skin,.83));
 line(ctx,[[-1.1,.55],[.2,.55]],shade(skin,.55),.4);
 ctx.restore();
}

function tweezers(ctx:CanvasRenderingContext2D,hand:Point,skin:string,scale:number){
 ctx.save();ctx.translate(...hand);ctx.scale(scale,scale);
 // Two tapered gold tines meet at a spring end below the thumb.
 const tines:Point[][]=[[[1.4,2.7],[-1,-1],[-5.5,-9]],[ [1.4,2.7],[.2,-1],[-3.1,-9.7]]];
 for(const tine of tines)line(ctx,tine,'#352b26',2);
 for(const tine of tines)line(ctx,tine,'#c48c3e',1.2);
 for(const tine of tines)line(ctx,tine,'#ffe29a',.45);
 ctx.restore();
 fingers(ctx,hand,skin,scale);
}

export function paintLabEquipment(ctx:CanvasRenderingContext2D,c:Character,prepared:string[],wafer?:HTMLCanvasElement){
 const {left,right,wrist,skin,scale}=hands(c);
 ctx.save();ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
 if(prepared.includes('T09'))tweezers(ctx,left,skin,scale);
 // Draw the wrist band before the carried fragment; fingers remain above the fragment.
 if(prepared.includes('A03'))bracelet(ctx,wrist,scale);
 if(prepared.includes('T06')&&wafer){
  ctx.save();ctx.translate(right[0]+3*scale,right[1]-1.5*scale);ctx.rotate(-.18);
  ctx.drawImage(wafer,-3.5*scale,-3.8*scale,8*scale,7*scale);ctx.restore();
  fingers(ctx,right,skin,scale,true);
 }
 if(prepared.includes('A04'))goggles(ctx,c);
 ctx.restore();
}
