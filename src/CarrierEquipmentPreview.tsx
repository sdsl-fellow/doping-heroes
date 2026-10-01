import {useEffect,useRef,useState} from 'react';
import {characterSheet,type Character} from './character';
import {loadGear} from './catalog-wear';
import {faceFit} from './face-fit.mjs';

// Compose the lab's simultaneous equipment locally; the saved outfit stays intact.
export function CarrierEquipmentPreview({character,prepared,name}:{character:Character;prepared:string[];name:string}){
 const ref=useRef<HTMLCanvasElement>(null),[error,setError]=useState('');
 useEffect(()=>{
  let cancelled=false;setError('');
  const tools=prepared.includes('T09')||prepared.includes('T06');
  const replaceAccessory=prepared.includes('A04')||prepared.includes('A03')&&character.accessory==='A03';
  const preview={...character,weapon:tools?'none':character.weapon,accessory:replaceAccessory?'none':character.accessory};
  const gearCharacter={...character,hat:'none',shoes:'none',outfit:'T06',weapon:'T09',accessory:'A03'};
  Promise.all([characterSheet(preview),loadGear(gearCharacter),loadGear({...gearCharacter,outfit:'none',weapon:'none',accessory:'A04'})]).then(([base,gear,goggles])=>{
   if(cancelled)return;
   const out=ref.current?.getContext('2d');if(!out)return;
   out.clearRect(0,0,256,256);out.imageSmoothingEnabled=false;out.drawImage(base,0,128,64,64,0,0,256,256);
   // Keep the character's pixel art sharp, but give the actual item artwork
   // enough backing pixels to retain its frame, strap, clasp and coiled lead.
   out.save();out.scale(4,4);out.imageSmoothingEnabled=true;out.imageSmoothingQuality='high';
   const animal=character.gender==='neutral';
   if(prepared.includes('T09')&&gear.weapon){
    out.save();out.translate(animal?22:19,animal?47:44);out.rotate(-.35);out.drawImage(gear.weapon,-5,-7,10,17);out.restore();
   }
   if(prepared.includes('T06')&&gear.outfit){
    out.save();out.translate(animal?46:49,animal?46:44);out.rotate(.2);out.drawImage(gear.outfit,-5,-5,11,10);out.restore();
   }
   if(prepared.includes('A04')&&goggles.accessory){
    const fit=faceFit(character,2,0),center=(fit.eyes[0]+fit.eyes[fit.eyes.length-1])/2;
    const width=animal&&character.species==='dog'?20:19,height=9.5;
    out.drawImage(goggles.accessory,center-width/2,fit.y-5.5,width,height);
   }
   if(prepared.includes('A03')&&gear.accessory){
    const wristX=animal?39:character.body==='agile'?41:character.gender==='female'?42:44;
    const wristY=animal?51:46;
    out.drawImage(gear.accessory,wristX-3.3,wristY-2.5,10.5,6.9);
   }
   out.restore();
  }).catch(e=>{if(!cancelled)setError(e instanceof Error?e.message:'캐릭터를 불러오지 못했습니다.');});
  return()=>{cancelled=true;};
 },[character,prepared]);
 return <><canvas ref={ref} width="256" height="256" aria-label={`${name}의 실험 장비 착용 모습 · ${prepared.length}/4 착용`}/>{error&&<small role="alert">{error}</small>}</>;
}
