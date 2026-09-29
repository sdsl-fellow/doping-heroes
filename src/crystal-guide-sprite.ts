import {characterSheet,defaultCharacter} from './character';

// Draw the approved crystal regalia directly on the normal 64×64, four-way
// character sheet so the guide keeps the proportions and walk cycle of NPCs.
export async function crystalGuideSprite():Promise<HTMLCanvasElement>{
 const sheet=await characterSheet({...defaultCharacter,gender:'female',body:'agile',hair:'bob',hairColor:'#b298d1',outfit:'C03',shoes:'F07',hat:'none',accessory:'none'});
 const canvas=document.createElement('canvas');canvas.width=576;canvas.height=256;
 const ctx=canvas.getContext('2d')!;ctx.imageSmoothingEnabled=false;ctx.drawImage(sheet,0,0);
 const rect=(x:number,y:number,w:number,h:number,color:string)=>{ctx.fillStyle=color;ctx.fillRect(x,y,w,h);};
 const poly=(points:number[][],color:string)=>{ctx.fillStyle=color;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();};
 const crystal=(x:number,y:number)=>{
  poly([[x,y-3],[x+3,y],[x,y+4],[x-3,y]],'#184b70');
  poly([[x,y-2],[x+2,y],[x,y+3],[x-2,y]],'#39b6d8');
  rect(x-1,y-2,1,3,'#d0faff');
 };
 for(let row=0;row<4;row++)for(let frame=0;frame<9;frame++){
  const bob=row===2?(frame===3||frame===7?1:0):(frame===1||frame===5?1:0);
  ctx.save();ctx.translate(frame*64,row*64+bob);
  if(row===2||row===0){
   // The cloak and split skirt fit the existing 64-pixel humanoid outline.
   poly([[24,35],[28,36],[36,36],[40,35],[43,42],[43,49],[45,54],[37,55],[32,52],[27,55],[19,54],[21,49],[21,42]],'#251f4a');
   poly([[26,37],[38,37],[40,45],[42,53],[35,52],[32,49],[29,52],[22,53],[24,45]],row===2?'#4a337c':'#43316a');
   poly([[29,41],[35,41],[35,53],[32,50],[29,53]],'#a481ce');
   rect(24,49,2,4,'#d7a45d');rect(38,49,2,4,'#d7a45d');
   rect(31,44,2,8,'#d7a45d');rect(31,49,2,3,'#7651a3');
   poly([[24,35],[27,36],[29,40],[25,43],[21,41]],'#65458f');
   poly([[40,35],[37,36],[35,40],[39,43],[43,41]],'#65458f');
   rect(23,39,3,1,'#e5b96c');rect(38,39,3,1,'#e5b96c');
   rect(27,42,10,1,'#d7a45d');
   if(row===2){crystal(32,39);crystal(24,41);crystal(40,41);rect(31,44,2,2,'#86dff0');}
   else{crystal(32,41);rect(28,35,8,1,'#d7a45d');}
   // Thin circlet above the eyes, leaving the face and bob uncovered.
   rect(28,23,8,1,'#d7a45d');rect(27,24,1,1,'#f5d68f');rect(36,24,1,1,'#f5d68f');
   if(row===2)crystal(32,23);
  }else{
   const left=row===1?25:28;
   poly([[left,36],[left+9,36],[left+10,54],[left-1,54]],'#251f4a');
   rect(left+1,38,8,14,'#4a337c');
   rect(left+1,43,9,1,'#d7a45d');rect(left,52,10,1,'#d7a45d');
   rect(left+2,36,5,2,'#65458f');
   crystal(row===1?left+8:left+2,41);
   rect(left+2,23,7,1,'#d7a45d');
  }
  ctx.restore();
 }
 return canvas;
}
