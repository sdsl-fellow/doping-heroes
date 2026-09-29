import {characterSheet,defaultCharacter} from './character';

// The guide uses the same 64 × 64 LPC body, palette and nearest-neighbor scale
// as the other village NPCs. Only his stationary front-facing frame is needed.
export async function doctorSprite():Promise<HTMLCanvasElement>{
 const sheet=await characterSheet({...defaultCharacter,gender:'male',body:'agile',hair:'bangs',hairColor:'#dae0e5',outfit:'C02',shoes:'F01'});
 const canvas=document.createElement('canvas');canvas.width=64;canvas.height=64;
 const ctx=canvas.getContext('2d')!;ctx.imageSmoothingEnabled=false;
 ctx.drawImage(sheet,0,128,64,64,0,0,64,64);
 const pixel=(color:string,x:number,y:number,w:number,h:number)=>{ctx.fillStyle=color;ctx.fillRect(x,y,w,h);};
 // Indigo vest and short research coat retain the existing sprite silhouette.
 pixel('#234d60',28,37,8,12);pixel('#347489',30,38,4,7);
 pixel('#80959d',21,36,7,16);pixel('#e4e9e5',23,36,5,15);
 pixel('#80959d',36,36,7,16);pixel('#e4e9e5',36,36,5,15);
 pixel('#f6f2e8',22,36,3,13);pixel('#f6f2e8',39,36,3,13);
 pixel('#c4d6d8',24,49,4,3);pixel('#c4d6d8',36,49,4,3);
 pixel('#d1ad65',28,37,1,10);pixel('#d1ad65',35,37,1,10);
 pixel('#69c6dc',32,40,1,2);
 // Taper the silver sideburns into a rounded chin, keeping the face clear.
 pixel('#8d9b9f',27,31,1,3);pixel('#c7d2d1',28,32,1,3);pixel('#f0f0e7',29,33,1,2);
 pixel('#8d9b9f',37,31,1,3);pixel('#c7d2d1',36,32,1,3);pixel('#f0f0e7',35,33,1,2);
 pixel('#c7d2d1',29,35,1,2);pixel('#dce3dd',30,36,5,2);pixel('#c7d2d1',35,35,1,2);
 pixel('#f4f3e8',31,37,3,1);pixel('#a9b6b4',29,33,1,1);pixel('#a9b6b4',35,33,1,1);
 pixel('#ffe1be',30,29,5,6);
 pixel('#c18d74',32,30,1,2);pixel('#f9d1ab',32,29,1,1);
 pixel('#c9d3d2',29,33,2,1);pixel('#c9d3d2',35,33,2,1);
 pixel('#9c6b61',31,34,3,1);pixel('#f3c4a8',32,35,2,1);
 // Thin frames and separate dark pupils preserve the expression at game scale.
 pixel('#f1f2e9',25,23,6,1);pixel('#f1f2e9',34,23,6,1);
 ctx.strokeStyle='#95764a';ctx.lineWidth=1;
 ctx.strokeRect(25.5,25.5,5,3);ctx.strokeRect(34.5,25.5,5,3);
 pixel('#95764a',31,26,3,1);pixel('#95764a',23,26,2,1);pixel('#95764a',40,26,2,1);
 pixel('#4b4c47',28,27,1,1);pixel('#4b4c47',37,27,1,1);
 // A single luminous silicon sample links him to the approved concept.
 pixel('#253e59',46,41,5,5);pixel('#57bada',47,40,3,5);
 pixel('#b3f2f6',48,41,1,2);pixel('#d6ad66',47,45,3,1);
 return canvas;
}
