import type {Character} from './character';

// Shape overlays are painted into each source layer BEFORE body scaling, so
// body type, walking frames and the shared world/preview renderer stay aligned.
export function decorateWearable(ctx:CanvasRenderingContext2D,path:string,c:Character){
 const torso=path.startsWith('torso/'),feet=path.startsWith('feet/'),hat=path.startsWith('hat/cloth/');
 if(!torso&&!feet&&!hat)return;
 for(let row=0;row<4;row++)for(let frame=0;frame<9;frame++){
  const bob=row===2?(frame===3||frame===7?1:0):(frame===1||frame===5?1:0);
  ctx.save();ctx.translate(frame*64,row*64);
  const rect=(x:number,y:number,w:number,h:number,color:string)=>{ctx.fillStyle=color;ctx.fillRect(x,y+bob,w,h);};
  const poly=(points:number[][],fill:string,stroke='#263d50')=>{ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y+bob):ctx.moveTo(x,y+bob));ctx.closePath();ctx.fillStyle=fill;ctx.fill();ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke();};
  const side=row===1||row===3;
  if(torso&&c.outfit==='crystal-armor'){
   // A fitted breastplate and segmented pauldrons, not a tinted cardigan.
   ctx.globalCompositeOperation='source-atop';
   rect(12,33,40,20,'#405a70');rect(21,35,22,9,'#bedbe5');rect(24,44,16,5,'#668b9e');
   ctx.globalCompositeOperation='source-over';
   if(!side){
    poly([[24,34],[40,34],[39,44],[32,47],[25,44]],'#93bfce');
    poly([[20,34],[26,35],[24,40],[18,39]],'#cde9ef');
    poly([[38,35],[44,34],[46,39],[40,40]],'#cde9ef');
    poly([[25,46],[31,48],[29,52],[23,51]],'#8bb7c9');
    poly([[33,48],[39,46],[41,51],[35,52]],'#8bb7c9');
    if(row===2)poly([[32,36],[35,40],[32,44],[29,40]],'#39ddff','#e0ffff');
    else rect(31,36,2,10,'#d6edf0');
   }else{
    poly([[27,34],[36,34],[39,44],[32,48],[26,43]],'#91bdcc');
    poly([[29,34],[36,34],[38,39],[29,40]],'#d7edf0');
    rect(29,43,8,2,'#496478');rect(29,47,7,4,'#a5cbd7');
   }
  }
  if(torso&&c.outfit==='lab-coat'){
   if(!side){poly([[23,35],[40,35],[42,54],[34,54],[32,47],[30,54],[22,54]],'#edf3f4');
    rect(30,36,4,10,'#405b7f');poly([[25,35],[30,36],[30,43]],'#fff');poly([[38,35],[34,36],[34,43]],'#fff');
    rect(24,46,5,4,'#c5d9df');rect(36,46,4,4,'#c5d9df');
   }else{poly([[28,35],[37,36],[40,54],[26,54]],'#e4eef1');rect(30,45,6,4,'#bbd2de');}
  }
  if(torso&&c.outfit==='cleanroom-suit'){
   ctx.globalCompositeOperation='source-atop';rect(12,34,40,22,'#e8faff');
   rect(side?35:31,35,2,17,'#329ead');rect(23,44,18,2,'#bddde8');
   if(row===2)rect(35,38,4,4,'#53c4d7');ctx.globalCompositeOperation='source-over';
  }
  if(feet&&['electron-boots','crystal-boots','cleanroom-shoes','sandals','lab-shoes'].includes(c.shoes)){
   ctx.globalCompositeOperation='source-atop';
   if(c.shoes==='electron-boots'){
    rect(10,49,44,15,'#547386');rect(10,50,44,3,'#deeff4');rect(10,55,44,2,'#b8d6e4');rect(10,60,44,2,'#d7eef4');
    rect(side?30:24,52,2,8,'#49e8ff');if(!side)rect(37,52,2,8,'#49e8ff');
   }else if(c.shoes==='sandals'){
    rect(10,49,44,15,c.skin);rect(10,56,44,2,'#8f572e');rect(10,61,44,2,'#593b28');
   }else{rect(10,59,44,2,c.shoes==='lab-shoes'?'#6db4bf':'#c4f8ff');rect(10,52,44,1,'#eaffff');}
   ctx.globalCompositeOperation='source-over';
  }
  if(hat&&['miner-helmet','moon-cap','process-hat','cleanroom-hood','silicon-crown'].includes(c.hat)){
   ctx.clearRect(0,0,64,64);
   if(c.hat==='miner-helmet'){
    poly([[23,23],[23,18],[27,14],[37,14],[41,18],[41,23]],'#ebb93f');rect(21,23,22,3,'#ffce6c');
    if(row!==0){rect(side?(row===1?23:38):29,19,6,6,'#33485c');rect(side?(row===1?24:39):30,20,4,4,'#ffffde');}
   }else if(c.hat==='silicon-crown'){
    poly([[22,25],[21,16],[26,21],[28,14],[32,20],[36,14],[38,21],[43,16],[41,25]],'#d9e7ee');
    rect(24,24,16,3,'#7391ac');poly([[32,15],[35,21],[32,25],[29,21]],'#42dfff');
   }else if(c.hat==='cleanroom-hood'){
    poly([[21,31],[21,20],[25,15],[38,15],[43,20],[43,32],[38,34],[38,22],[26,22],[26,34]],'#edf7ff');
    rect(26,19,12,3,'#c0d8e7');if(row===0)rect(25,22,14,12,'#dfedf5');
   }else{
    const color=c.hat==='process-hat'?'#385f92':'#8460b8';
    poly([[23,24],[28,14],[32,5],[39,10],[35,11],[40,24]],color);
    poly([[19,24],[29,23],[43,24],[46,27],[18,27]],color);
    rect(27,22,12,2,'#ddc47f');rect(31,14,2,5,c.hat==='process-hat'?'#4ee4e8':'#ffe6a8');
   }
  }
  ctx.restore();
 }
}
