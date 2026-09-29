import {characterSheet,defaultCharacter} from './character';

// Merchant En keeps the village character proportions and the normal
// four-direction walk cycle. Paint the approved apron at native sprite size.
export async function merchantSprite():Promise<HTMLCanvasElement>{
 const sheet=await characterSheet({...defaultCharacter,gender:'male',body:'sturdy',hair:'bedhead',hairColor:'#77452f',outfit:'C02',outfitColor:'#f4e8d5',shoes:'F01'});
 const canvas=document.createElement('canvas');canvas.width=576;canvas.height=256;
 const ctx=canvas.getContext('2d')!;ctx.imageSmoothingEnabled=false;ctx.drawImage(sheet,0,0);
 const rect=(x:number,y:number,w:number,h:number,color:string)=>{ctx.fillStyle=color;ctx.fillRect(x,y,w,h);};
 const poly=(points:number[][],color:string)=>{ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fillStyle=color;ctx.fill();};
 for(let row=0;row<4;row++)for(let frame=0;frame<9;frame++){
  const bob=row===2?(frame===3||frame===7?1:0):(frame===1||frame===5?1:0);
  ctx.save();ctx.translate(frame*64,row*64+bob);
  if(row===2){
   poly([[24,33],[27,33],[29,39],[27,41],[23,34]],'#23393c');
   poly([[40,33],[37,33],[35,39],[37,41],[41,34]],'#23393c');
   poly([[25,36],[28,36],[29,40],[28,41],[24,38]],'#326b67');
   poly([[39,36],[36,36],[35,40],[36,41],[40,38]],'#326b67');
   rect(25,38,15,15,'#23393c');rect(27,39,11,5,'#326b67');
   rect(26,44,13,8,'#326b67');rect(27,45,1,6,'#5c9790');
   rect(26,44,13,2,'#a77949');
   rect(31,47,6,4,'#9b6741');rect(31,47,6,1,'#d6aa62');
   rect(31,40,3,3,'#e4bc6e');
  }else if(row===0){
   // The apron wraps around the back without a front-facing badge or pocket.
   rect(25,38,14,14,'#23393c');rect(27,39,10,12,'#326b67');
   rect(24,44,16,2,'#a77949');rect(30,45,4,3,'#9b6741');
  }else{
   const left=row===1?27:29;
   rect(left,36,9,16,'#23393c');rect(left+1,38,7,13,'#326b67');
   rect(left,44,9,2,'#a77949');rect(left+4,47,3,4,'#9b6741');
   rect(row===1?left+2:left+5,35,2,6,'#326b67');
  }
  ctx.restore();
 }
 return canvas;
}
