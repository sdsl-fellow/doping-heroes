import {useEffect,useRef,useState} from 'react';
import {characterSheet,type Character} from './character';
import {conductivity,scientific,sigmaLabel,progress} from './progression.mjs';
export function ImplantAnimation({character,before,after,type}:{character:Character;before:number;after:number;type:'n'|'p'}){
 const ref=useRef<HTMLCanvasElement>(null),[phase,setPhase]=useState(0),[error,setError]=useState('');
 const raised=progress(after).stage>progress(before).stage;
 useEffect(()=>{let stopped=false,frame=0,start=0,lastPhase=-1;const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 characterSheet(character).then(sheet=>{if(stopped)return;ref.current?.scrollIntoView({block:"center",behavior:reduced?"instant":"smooth"});const draw=(time:number)=>{if(stopped)return;start ||= time;const t=reduced?1:Math.min(1,(time-start)/3400),p=Math.min(3,Math.floor(t*4));if(p!==lastPhase){setPhase(p);lastPhase=p;}const ctx=ref.current?.getContext('2d');if(!ctx)return;
 ctx.clearRect(0,0,360,250);ctx.imageSmoothingEnabled=false;const hue=type==='n'?'#72d9ff':'#ffce77';
 ctx.fillStyle='#102936';ctx.fillRect(0,0,360,250);
 const glow=ctx.createRadialGradient(180,166,10,180,166,125);glow.addColorStop(0,t>.4?'#3b848a88':'#29465766');glow.addColorStop(1,'#10293600');ctx.fillStyle=glow;ctx.fillRect(0,0,360,250);
 ctx.save();if(t>.35){ctx.shadowColor=hue;ctx.shadowBlur=reduced?10:10+8*Math.sin(t*16);}ctx.drawImage(sheet,0,128,64,64,84,54,192,192);ctx.restore();
 if(!reduced&&t<.78){for(let i=0;i<14;i++){const flight=((t*2.8+i/14)%1),sx=48+(i*53)%264,sy=-40-i%3*20,tx=153+(i%5)*13,ty=142+(i%3)*12;const x=sx+(tx-sx)*flight,y=sy+(ty-sy)*flight;ctx.strokeStyle=hue+'66';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x-(tx-sx)*.08,y-(ty-sy)*.08);ctx.lineTo(x,y);ctx.stroke();ctx.shadowColor=hue;ctx.shadowBlur=8;ctx.fillStyle=hue;ctx.fillRect(x-3,y-3,6,6);ctx.shadowBlur=0;if(i<4){ctx.font='bold 12px sans-serif';ctx.fillText(type==='n'?'P⁺':'B⁺',x+6,y);}}}
 if(t>.5){ctx.strokeStyle=hue;ctx.lineWidth=2;ctx.globalAlpha=Math.min(1,(t-.5)*3);for(let i=0;i<3;i++){const y=145+i*16;ctx.beginPath();ctx.moveTo(130,y);ctx.lineTo(149,y-6);ctx.lineTo(165,y+5);ctx.lineTo(184,y-5);ctx.lineTo(203,y+4);ctx.lineTo(227,y);ctx.stroke();}ctx.globalAlpha=1;}
 if(raised&&t>.72&&!reduced){ctx.strokeStyle='#ffe8a0';ctx.globalAlpha=(1-t)*3;ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(180,168,40+(t-.72)*200,20+(t-.72)*100,0,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;}
 if(t<1)frame=requestAnimationFrame(draw);
 };frame=requestAnimationFrame(draw);}).catch(()=>{if(!stopped){setError('캐릭터 연출을 불러오지 못했습니다. 보상은 정상 저장되었습니다.');setPhase(3);}});
 return()=>{stopped=true;cancelAnimationFrame(frame);};},[character,before,after,type,raised]);
 return <section className="implant-animation" aria-label="불순물 주입과 전도도 상승"><div className="implant-phase">{['불순물 이온 가속','캐릭터에 불순물 주입','도펀트 활성화 · 전하 이동','주입 완료'][phase]}{phase===3&&raised?' · LEVEL UP!':''}</div><canvas ref={ref} width={360} height={250} aria-label="선택한 캐릭터로 이온 빔이 들어오고 전하가 흐르는 게임 애니메이션"/><div className="implant-stats"><p>도핑 농도 <strong>{scientific(before)} → {scientific(after)} cm⁻³</strong></p><p>시료 전도도 <strong>{sigmaLabel(conductivity(before,type))} → {sigmaLabel(conductivity(after,type))} S/cm</strong></p></div>{error&&<p role="status">{error}</p>}<small>주입·활성화 과정을 단순화한 게임 연출입니다.</small></section>;
}
