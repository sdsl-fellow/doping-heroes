// Coordinates are in a 64×64 walking frame. Rear views have no visible lenses.
export function faceFit(c,row,frame){
 const side=row===1||row===3,animal=c.gender==='neutral',dog=c.species==='dog';
 const humanBob=row===2?(frame===3||frame===7?1:0):(frame===1||frame===5?1:0);
 const animalBob=frame===1||frame===5?-1:0;
 const eyes=animal?(dog?(side?[row===1?17:46]:[27,36]):(side?[row===1?18:44]:[29.5,35])):(side?[row===1?28.5:34.5]:[27.5,35.5]);
 const y=animal?(side?34.5+animalBob:dog?39.5:40-animalBob):29.5+humanBob;
 const lens=animal?(dog?5:4):5;
 const left=side?eyes[0]-(row===1?2:10):eyes[0]-3;
 return {eyes:row===0?[]:eyes,y,lens,bandX:row===0?(animal?24:23):left,bandY:Math.floor(row===0?(animal?24:23):y-6),bandWidth:row===0?(animal?16:18):side?13:eyes[1]-eyes[0]+7};
}
