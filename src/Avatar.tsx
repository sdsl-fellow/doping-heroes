import {useEffect,useRef,useState} from 'react';
import {Character,characterSheet} from './character';
export function Avatar({character,size=128,walking=false,direction=2}:{character:Character;size?:number;walking?:boolean;direction?:number}){
 const ref=useRef<HTMLCanvasElement>(null);const [error,setError]=useState('');
 useEffect(()=>{let stop=false,frame=0;setError('');characterSheet(character).then(sheet=>{if(stop)return;const draw=(time:number)=>{if(stop)return;const c=ref.current?.getContext('2d');if(c){c.clearRect(0,0,64,64);const step=walking?1+Math.floor(time/120)%8:0;c.drawImage(sheet,step*64,direction*64,64,64,0,0,64,64);}frame=requestAnimationFrame(draw);};frame=requestAnimationFrame(draw);}).catch(e=>{if(!stop)setError(e.message);});return()=>{stop=true;cancelAnimationFrame(frame);};},[character,walking,direction]);
 return <><canvas ref={ref} width={64} height={64} style={{width:size,height:size,imageRendering:'pixelated'}} aria-label="선택한 외형의 캐릭터 미리보기"/>{error&&<small role="alert">{error}</small>}</>;
}
