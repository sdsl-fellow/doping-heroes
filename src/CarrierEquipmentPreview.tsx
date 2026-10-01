import {useEffect,useRef,useState} from 'react';
import {characterSheet,type Character} from './character';
import {loadGear,paintCatalogEquipment} from './catalog-wear';

// Compose the lab's simultaneous equipment locally; the saved outfit stays intact.
export function CarrierEquipmentPreview({character,prepared,name}:{character:Character;prepared:string[];name:string}){
 const ref=useRef<HTMLCanvasElement>(null),[error,setError]=useState('');
 useEffect(()=>{
  let cancelled=false;setError('');
  const tools=prepared.includes('T09')||prepared.includes('T06');
  const preview={...character,weapon:tools?'none':character.weapon,accessory:prepared.includes('A04')?'A04':character.accessory};
  const gearCharacter={...character,hat:'none',shoes:'none',outfit:'T06',weapon:'T09',accessory:'A03'};
  Promise.all([characterSheet(preview),loadGear(gearCharacter)]).then(([base,gear])=>{
   if(cancelled)return;
   const sheet=document.createElement('canvas');sheet.width=576;sheet.height=256;
   const ctx=sheet.getContext('2d')!;ctx.drawImage(base,0,0);
   if(prepared.includes('A03')&&preview.accessory!=='A03')paintCatalogEquipment(ctx,{...preview,accessory:'A03'},{accessory:gear.accessory});
   const out=ref.current?.getContext('2d');if(!out)return;
   out.clearRect(0,0,64,64);out.imageSmoothingEnabled=false;out.drawImage(sheet,0,128,64,64,0,0,64,64);
   const animal=character.gender==='neutral';
   if(prepared.includes('T09')&&gear.weapon){
    out.save();out.translate(animal?22:19,animal?47:44);out.rotate(-.35);out.drawImage(gear.weapon,-5,-7,10,17);out.restore();
   }
   if(prepared.includes('T06')&&gear.outfit){
    out.save();out.translate(animal?46:49,animal?46:44);out.rotate(.2);out.drawImage(gear.outfit,-5,-5,11,10);out.restore();
   }
  }).catch(e=>{if(!cancelled)setError(e instanceof Error?e.message:'캐릭터를 불러오지 못했습니다.');});
  return()=>{cancelled=true;};
 },[character,prepared]);
 return <><canvas ref={ref} width="64" height="64" aria-label={`${name}의 실험 장비 착용 모습 · ${prepared.length}/4 착용`}/>{error&&<small role="alert">{error}</small>}</>;
}
