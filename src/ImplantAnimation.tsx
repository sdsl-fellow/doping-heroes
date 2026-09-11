import {useEffect,useRef,useState} from 'react';
import {characterSheet,type Character} from './character';
import {conductivity,scientific,sigmaLabel,progress,levelLabel} from './progression.mjs';
export function ImplantAnimation({character,before,after,type}:{character:Character;before:number;after:number;type:'n'|'p'}){
 const ref=useRef<HTMLCanvasElement>(null),[phase,setPhase]=useState(0),[error,setError]=useState('');
 const raised=progress(after).stage>progress(before).stage;
 useEffect(()=>{let stopped=false,frame=0,start=0,lastPhase=-1;const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 characterSheet(character).then(sheet=>{if(stopped)return;ref.current?.scrollIntoView({block:"center",behavior:reduced?"instant":"smooth"});const draw=(time:number)=>{if(stopped)return;start ||= time;const t=reduced?1:Math.min(1,(time-start)/3400),p=Math.min(3,Math.floor(t*4));if(p!==lastPhase){setPhase(p);lastPhase=p;}const ctx=ref.current?.getContext('2d');if(!ctx)return;
 ctx.clearRect(0,0,360,250);ctx.imageSmoothingEnabled=false;const hot=p===2,hue=hot?'#ff7438':type==='n'?'#72d9ff':'#ffce77';
 ctx.fillStyle=hot?'#521d16':'#102936';ctx.fillRect(0,0,360,250);
 const glow=ctx.createRadialGradient(180,166,10,180,166,125);glow.addColorStop(0,hot?'#ff632edc':t>.4?'#3b848a88':'#29465766');glow.addColorStop(1,'#10293600');ctx.fillStyle=glow;ctx.fillRect(0,0,360,250);
 ctx.save();if(t>.35){ctx.shadowColor=hue;ctx.shadowBlur=reduced?10:10+8*Math.sin(t*16);}ctx.drawImage(sheet,0,128,64,64,84,54,192,192);ctx.restore();
 if(!reduced&&t<.5){for(let i=0;i<14;i++){const flight=((t*2.8+i/14)%1),sx=48+(i*53)%264,sy=-40-i%3*20,tx=153+(i%5)*13,ty=142+(i%3)*12;const x=sx+(tx-sx)*flight,y=sy+(ty-sy)*flight;ctx.strokeStyle=hue+'66';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x-(tx-sx)*.08,y-(ty-sy)*.08);ctx.lineTo(x,y);ctx.stroke();ctx.shadowColor=hue;ctx.shadowBlur=8;ctx.fillStyle=hue;ctx.fillRect(x-3,y-3,6,6);ctx.shadowBlur=0;if(i<4){ctx.font='bold 12px sans-serif';ctx.fillText(type==='n'?'P⁺':'B⁺',x+6,y);}}}
 if(hot){ctx.fillStyle='#ff8c3238';ctx.fillRect(84,54,192,192);if(!reduced){ctx.strokeStyle='#ffcc7799';ctx.lineWidth=3;for(let i=0;i<5;i++){const x=96+i*42,y=210-((t*400+i*29)%150);ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x-12,y-12,x,y-25);ctx.quadraticCurveTo(x+12,y-38,x,y-50);ctx.stroke();}}}
 if(t>.5){ctx.strokeStyle=hue;ctx.lineWidth=2;ctx.globalAlpha=Math.min(1,(t-.5)*3);for(let i=0;i<3;i++){const y=145+i*16;ctx.beginPath();ctx.moveTo(130,y);ctx.lineTo(149,y-6);ctx.lineTo(165,y+5);ctx.lineTo(184,y-5);ctx.lineTo(203,y+4);ctx.lineTo(227,y);ctx.stroke();}ctx.globalAlpha=1;}
 if(raised&&t>.72&&!reduced){ctx.strokeStyle='#ffe8a0';ctx.globalAlpha=(1-t)*3;ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(180,168,40+(t-.72)*200,20+(t-.72)*100,0,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;}
 if(t<1)frame=requestAnimationFrame(draw);
 };frame=requestAnimationFrame(draw);}).catch(()=>{if(!stopped){setError('캐릭터 연출을 불러오지 못했습니다. 보상은 정상 저장되었습니다.');setPhase(3);}});
 return()=>{stopped=true;cancelAnimationFrame(frame);};},[character,before,after,type,raised]);
 return <section className="implant-animation" aria-label="불순물 주입과 전도도 상승"><div className="implant-phase">{['불순물 이온 가속','캐릭터에 불순물 주입','열처리 · 도펀트 활성화','주입 완료'][phase]}{phase===3&&raised?' · LEVEL UP!':''}</div><canvas ref={ref} width={360} height={250} aria-label="선택한 캐릭터로 이온 빔이 들어오고 전하가 흐르는 게임 애니메이션"/><div className="implant-stats"><p>도핑 농도 <strong>{scientific(before)} → {scientific(after)} cm⁻³</strong></p><p>캐릭터 전도도 레벨 <strong>{sigmaLabel(conductivity(before,type))} → {sigmaLabel(conductivity(after,type))} S/cm</strong></p></div>{error&&<p role="status">{error}</p>}<p className="reward-level" aria-live="polite">{phase===3&&raised?'LEVEL UP! · ':''}캐릭터 {levelLabel(phase===3?after:before,type)}{phase===3&&progress(after).max?' · MAX':''}</p></section>;
}
