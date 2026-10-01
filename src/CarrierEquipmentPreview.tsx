import {useEffect,useRef,useState} from 'react';
import {characterSheet,type Character} from './character';
import {loadGear} from './catalog-wear';
import {paintLabEquipment} from './carrier-lab-appearance';

// Compose the lab's simultaneous equipment locally; the saved outfit stays intact.
export function CarrierEquipmentPreview({character,prepared,name}:{character:Character;prepared:string[];name:string}){
 const ref=useRef<HTMLCanvasElement>(null),[error,setError]=useState('');
 useEffect(()=>{
  let cancelled=false;setError('');
  const tools=prepared.includes('T09')||prepared.includes('T06');
  const replaceAccessory=prepared.includes('A04')||prepared.includes('A03')&&character.accessory==='A03';
  const preview={...character,weapon:tools?'none':character.weapon,accessory:replaceAccessory?'none':character.accessory};
  const gearCharacter={...character,hat:'none',shoes:'none',outfit:'T06',weapon:'none',accessory:'none'};
  Promise.all([characterSheet(preview),loadGear(gearCharacter)]).then(([base,gear])=>{
   if(cancelled)return;
   const out=ref.current?.getContext('2d');if(!out)return;
   out.clearRect(0,0,256,256);out.imageSmoothingEnabled=false;out.drawImage(base,0,128,64,64,0,0,256,256);
   out.save();out.scale(4,4);
   paintLabEquipment(out,character,prepared,gear.outfit);
   out.restore();
  }).catch(e=>{if(!cancelled)setError(e instanceof Error?e.message:'캐릭터를 불러오지 못했습니다.');});
  return()=>{cancelled=true;};
 },[character,prepared]);
 return <><canvas ref={ref} width="256" height="256" aria-label={`${name}의 실험 장비 착용 모습 · ${prepared.length}/4 착용`}/>{error&&<small role="alert">{error}</small>}</>;
}
