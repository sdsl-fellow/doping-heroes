type OutfitPalette={base:string;light:string;shade:string;trim:string;accent:string;kind:'tee'|'shirt'|'cardigan'|'coat'|'suit'|'armor'};

// The catalogue item keeps one ID and icon; only the fitted silhouette changes by species.
const palettes:Record<string,OutfitPalette>={
 C01:{base:'#f1f2ef',light:'#ffffff',shade:'#c9d4dc',trim:'#d9e1e8',accent:'#f9faf6',kind:'tee'},
 C02:{base:'#fff1da',light:'#fffaf0',shade:'#eab47c',trim:'#ed743d',accent:'#bb522d',kind:'shirt'},
 C03:{base:'#51447f',light:'#8477be',shade:'#292c59',trim:'#d4bc72',accent:'#f6db8a',kind:'cardigan'},
 C04:{base:'#2879d5',light:'#66baff',shade:'#184da7',trim:'#b8e7ff',accent:'#eefaff',kind:'shirt'},
 C05:{base:'#4f7a45',light:'#80a66c',shade:'#30563e',trim:'#c9ab62',accent:'#e4d08c',kind:'shirt'},
 C06:{base:'#e44b3f',light:'#ff8565',shade:'#a12630',trim:'#ffc275',accent:'#ffe0a0',kind:'cardigan'},
 C07:{base:'#f7ad27',light:'#ffdc65',shade:'#d3771f',trim:'#f5da74',accent:'#fff2a8',kind:'tee'},
 C08:{base:'#e9eff2',light:'#ffffff',shade:'#acbfc9',trim:'#a76ac9',accent:'#33afc0',kind:'coat'},
 C09:{base:'#e8f9fc',light:'#ffffff',shade:'#9bc8d4',trim:'#24a8ba',accent:'#58d1df',kind:'suit'},
 C10:{base:'#668da6',light:'#c6e7ef',shade:'#304c69',trim:'#41d8ee',accent:'#e0fbff',kind:'armor'},
};

function poly(ctx:CanvasRenderingContext2D,points:number[][],color:string){
 ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fillStyle=color;ctx.fill();
}
function line(ctx:CanvasRenderingContext2D,points:number[][],color:string,width=1){
 ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();
}
function dot(ctx:CanvasRenderingContext2D,x:number,y:number,color:string,size=1){ctx.fillStyle=color;ctx.fillRect(x,y,size,size);}

export function paintAnimalClothing(ctx:CanvasRenderingContext2D,raw:HTMLCanvasElement,id:string,species:'dog'|'cat',row:number,bob:number){
 const p=palettes[id];if(!p)return;
 const side=row===1||row===3,back=row===0,cat=species==='cat';
 const garment=document.createElement('canvas');garment.width=garment.height=64;
 const g=garment.getContext('2d')!;g.imageSmoothingEnabled=false;
 // Draw side views in a common orientation, then mirror the complete garment.
 if(row===3){g.translate(64,0);g.scale(-1,1);}
 g.translate(0,bob);
 let edge:number[][];
 if(side){
  edge=cat?[[28,34],[33,33],[42,33],[46,36],[47,41],[44,46],[40,47],[30,47],[26,45],[25,40],[26,36]]
          :[[27,35],[32,33],[40,33],[46,35],[48,39],[47,46],[44,50],[39,51],[28,50],[24,47],[23,42],[25,37]];
 }else if(back){
  edge=cat?[[26,33],[29,32],[37,32],[40,34],[42,39],[41,47],[36,49],[28,49],[23,46],[22,39],[24,35]]
          :[[25,35],[29,34],[35,34],[40,35],[44,39],[44,47],[40,52],[36,53],[27,53],[23,51],[20,45],[21,39]];
 }else{
  edge=cat?[[25,42],[29,40],[35,40],[39,42],[41,49],[39,53],[25,53],[23,49]]
          :[[25,42],[29,40],[35,40],[39,42],[41,48],[39,52],[25,52],[23,48]];
 }
 // Outline and shaped fabric panels follow the animal's body, rather than a rectangular crop.
 poly(g,edge,p.shade);g.save();g.beginPath();edge.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.clip();
 g.fillStyle=p.base;g.fillRect(side?(cat?25:23):20,32,side?(cat?23:26):25,22);
 if(side){
  if(cat){
   poly(g,[[27,36],[31,34],[33,37],[31,43],[26,44]],p.light);
   poly(g,[[42,34],[46,37],[46,43],[42,46],[40,43]],p.shade);
   line(g,[[28,36],[31,38],[31,44]],p.trim);
   line(g,[[30,44],[43,44]],p.trim);
   // Short fitted sleeves end above the forepaws and hind paws.
   poly(g,[[27,41],[31,42],[32,47],[29,48],[26,46]],p.base);
   poly(g,[[40,42],[44,42],[45,47],[41,48]],p.base);
   line(g,[[28,47],[31,47]],p.trim);line(g,[[41,47],[44,47]],p.trim);
  }else{
   poly(g,[[25,38],[30,35],[34,37],[32,47],[25,48]],p.light);
   poly(g,[[41,34],[47,38],[47,46],[43,50],[39,47]],p.shade);
   line(g,[[27,37],[31,40],[32,48]],p.trim);
   line(g,[[28,48],[44,49]],p.trim);
   // A loose sleeve follows the dog's fluffy foreleg without colouring the paw.
   poly(g,[[25,42],[29,43],[30,49],[27,51],[23,48]],p.base);
   poly(g,[[42,43],[47,42],[47,48],[44,51],[40,49]],p.base);
   line(g,[[24,48],[29,49]],p.trim);line(g,[[42,49],[46,49]],p.trim);
  }
 }else{
  if(back){
   poly(g,cat?[[23,38],[27,34],[29,38],[28,46],[24,46]]:[[21,40],[26,36],[29,40],[27,51],[23,50]],p.light);
   poly(g,cat?[[37,34],[41,38],[41,46],[37,48],[36,42]]:[[39,36],[44,40],[43,49],[39,52],[36,44]],p.shade);
   line(g,cat?[[25,45],[39,46]]:[[23,49],[40,50]],p.trim);
   line(g,cat?[[27,34],[38,34]]:[[27,36],[39,36]],p.trim);
  }else{
   poly(g,[[24,42],[28,39+(cat?1:0)],[29,48],[26,52]],p.light);
   poly(g,[[36,39+(cat?1:0)],[40,42],[39,52],[36,50]],p.shade);
   line(g,[[27,50],[37,50]],p.trim);
  }
 }
 if(p.kind==='shirt'||p.kind==='cardigan'||p.kind==='coat'){
  const y=side?38:back?35:42;
  if(!back){
   poly(g,side?[[29,y],[32,y+2],[33,y+5],[30,y+3]]:[[28,y],[32,y+3],[30,y+5],[27,y+2]],p.light);
   if(!side)poly(g,[[36,y],[32,y+3],[34,y+5],[38,y+2]],p.light);
   line(g,side?[[32,y+3],[34,49]]:[[32,y+3],[32,51]],p.trim);
   if(p.kind==='shirt'||p.kind==='cardigan'){
    dot(g,side?34:32,y+6,p.accent);dot(g,side?34:32,y+9,p.accent);
   }
  }
 }
 if(p.kind==='tee'){
  const y=back?35:side?38:41;
  line(g,side?[[29,y],[32,y+2],[36,y]]:[[28,y],[31,y+2],[34,y+2],[37,y]],p.trim,1.5);
 }
 if(p.kind==='coat'){
  line(g,side?[[32,41],[34,50]]:back?[[32,37],[32,51]]:[[32,45],[32,53]],p.trim);
  dot(g,side?38:36,back?44:47,p.accent,2);
  line(g,side?[[28,47],[30,47]]:[[26,49],[29,49]],p.trim);
  if(!side&&!back)line(g,[[36,49],[39,49]],p.trim);
 }
 if(p.kind==='suit'){
  line(g,side?[[30,39],[38,40]]:back?[[26,37],[38,37]]:[[28,43],[36,43]],p.trim,1.5);
  line(g,side?[[27,48],[42,49]]:[[25,50],[39,50]],p.trim);
  dot(g,side?33:32,back?40:46,p.accent,2);
 }
 if(p.kind==='armor'){
  poly(g,side?[[29,38],[39,38],[41,43],[35,45],[29,43]]
       :back?[[26,37],[38,37],[39,44],[32,46],[25,44]]
            :[[26,43],[38,43],[39,48],[32,51],[25,48]],p.light);
  line(g,side?[[30,44],[40,46],[38,50]]:[[26,48],[32,51],[38,48]],p.trim);
  if(!back)poly(g,side?[[34,40],[37,43],[34,46],[31,43]]:[[32,43],[35,46],[32,49],[29,46]],p.trim);
  dot(g,side?34:32,side?42:45,p.accent);
  line(g,side?[[28,39],[27,44]]:[[26,44],[24,47]],p.accent,1.5);
 }
 if(id==='C02'){line(g,side?[[28,40],[28,47]]:[[26,44],[26,50]],p.trim,2);}
 if(id==='C03'||id==='C06'){
  const stars=side?[[36,43],[30,45],[39,47]]:back?[[28,40],[35,42],[32,47]]:[[28,46],[36,46],[32,50]];
  stars.forEach(([x,y],i)=>{dot(g,x,y,p.accent,i===0?2:1);dot(g,x+2,y-2,p.trim);});
 }
 if(id==='C04'||id==='C05'){
  line(g,side?[[29,43],[29,49]]:[[30,45],[30,50]],p.light);
  dot(g,side?35:34,back?44:48,p.accent);
 }
 if(id==='C07')dot(g,side?38:35,back?43:47,p.light,2);
 g.restore();
 if(!back){
  // Reveal the original face after all collars, sleeves and decorations.
  // This runs in the mirrored/animated frame so it also protects right-facing walks.
  g.globalCompositeOperation='destination-out';
  const face=side
   ?cat?[[0,0],[27,0],[29,33],[32,36],[31,41],[29,43],[0,43]]
       :[[0,0],[27,0],[30,31],[34,36],[33,40],[30,44],[0,44]]
   :cat?[[27,0],[37,0],[40,34],[39,40],[38,45],[27,45],[25,41],[25,34]]
       :[[21,0],[43,0],[45,36],[41,41],[39,45],[25,45],[23,41],[19,36]];
  poly(g,face,'#000');
  g.globalCompositeOperation='source-over';
 }
 if(back&&!cat){
  // Cut a shaped tail opening. The underlying sprite supplies only the tail fur.
  g.globalCompositeOperation='destination-out';
  poly(g,[[31,39],[34,39],[37,45],[37,50],[34,53],[29,53],[27,49],[28,44]],'#000');
  g.globalCompositeOperation='source-over';
 }
 g.setTransform(1,0,0,1,0,0);
 // Keep exposed fur, face, paws and tail where the source sprite has no body.
 g.globalCompositeOperation='destination-in';g.drawImage(raw,0,0);
 ctx.drawImage(garment,0,0);
}
