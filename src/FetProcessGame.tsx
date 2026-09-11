import {useEffect,useState} from 'react';
import {checkProcessOrder,processSteps,shuffleSteps} from './fet-process.mjs';
import './fet-game.css';

export function MosfetSection({step,on=false,animate=false}:{step:number;on?:boolean;animate?:boolean}){
 const active=step>=4,finished=step===5;
 return <svg viewBox={finished?"0 0 600 530":"0 160 600 310"} role="img" fontFamily="Arial, sans-serif" aria-label={finished?`완성된 nMOS 단면 · ${on?'ON · 채널 형성':'OFF'}`:processSteps[step].title}>
  <rect width="600" height="530" rx="10" fill="white"/>
  <g stroke="#151515" strokeWidth="3" strokeLinejoin="round">
   <rect x="55" y="280" width="490" height="170" fill="#ffb600"/>
   <path d="M55 260h40v20H55zM505 260h40v20h-40z" fill="#fff"/>
   {step>=1&&<rect x="175" y="258" width="250" height="22" fill="#fff"/>}
   {step>=2&&<path d="M205 258v-32q0-10 10-10h170q10 0 10 10v32z" fill="#383838"/>}
   {step>=3&&[95,390].map(x=><path key={x} d={`M${x} 280h115v48q0 12-12 12h-91q-12 0-12-12z`} fill={active?'#009ff0':'#9bcee8'} strokeDasharray={active?undefined:'5 4'}/>)}
   {finished&&<>
    {on&&<rect x="210" y="281" width="180" height="15" fill="#ffeb44" strokeWidth="1.5"/>}
    <path d="M130 280v-8h45v8M425 280v-8h45v8" fill="#383838"/>
    <rect x="245" y="442" width="110" height="25" rx="8" fill="#383838"/>
    <path d="M150 272V45h120m60 0h120v227M150 125h80m60 0h10v91M150 245H30v245h270v-23" fill="none"/>
    <path d="M270 28v34m12-48v62m18-48v34m12-48v62M230 112v26m12-42v58m18-42v26m12-42v58" fill="none"/>
    <path d="M312 45h18M272 125h18" fill="none"/>
    {[{x:150,y:195},{x:300,y:183},{x:450,y:195},{x:300,y:490}].map(p=><circle key={p.x+','+p.y} cx={p.x} cy={p.y} r="7" fill="white"/>)}
   </>}
  </g>
  <g textAnchor="middle" fill="#111">
   <text x="300" y="407" fontSize="25" fontWeight="700">P-Type Si Substrate</text>
   {step>=1&&<text x="300" y="274" fontSize="14" fontWeight="700">SiO₂ Gate Oxide</text>}
   {step>=2&&<text x="300" y="243" fontSize="18" fill="white">Poly-Si Gate</text>}
   {step>=3&&[152,448].map(x=><text key={x} x={x} y="321" fontSize="30" fontWeight="700">{active?'N⁺':'P ions'}</text>)}
   {!finished&&<text x="300" y="188" fontSize="20" fill={step===4?'#b93818':'#333'}>{['Active Area','Gate Oxidation','Gate Patterning','Donor Implantation','Anneal / Activation'][step]}</text>}
   {step===3&&[120,150,450,480].map(x=><g key={x}><text x={x} y="218" fontSize="17" fill="#006eac">P⁺</text><path d={`M${x} 226v33m-5-7 5 7 5-7`} fill="none" stroke="#006eac" strokeWidth="2"/></g>)}
   {step===4&&[145,455].map(x=><path key={x} d={`M${x} 250q-12-10 0-20t0-20`} stroke="#d63b1d" strokeWidth="4" fill="none"/>)}
   {finished&&<>
    <text x="370" y="27" fontSize="16">VDS = 1 V</text>
    <text x="354" y="113" fontSize="16">VGS = {on?'3':'0'} V</text>
    <text x="255" y="22" fontSize="22">−</text><text x="327" y="22" fontSize="22">+</text>
    <text x="217" y="101" fontSize="22">−</text><text x="285" y="101" fontSize="22">+</text>
    <text x="125" y="183" fontSize="22">S</text><text x="280" y="174" fontSize="22">G</text><text x="475" y="183" fontSize="22">D</text>
    <text x="300" y="520" fontSize="18">Substrate / Body · 0 V</text>
    <text x="300" y="369" fontSize="18" fontWeight="700">{on?'N-Channel · ON':'No Channel · OFF'}</text>
    {on&&<>
     {[225,255,285,315,345,375].map(x=><text key={x} x={x} y="212" fontSize="22">+</text>)}
     {[228,260,292,324,356,380].map(x=><text key={x} x={x} y="324" fontSize="18" fill="#544600">−</text>)}
     <text x="300" y="344" fontSize="12">Depletion: fixed acceptor ions (−)</text>
     {[0,1,2,3,4,5].map(i=><text key={i} x={218+i*32} y="294" fontSize="20" fontWeight="700">−{animate&&<animate attributeName="x" from="212" to="382" dur="1.6s" begin={`${-i*1.6/6}s`} repeatCount="indefinite"/>}</text>)}
    </>}
   </>}
  </g>
 </svg>;
}

function WorkingMosfet(){
 const [on,setOn]=useState(false),[auto,setAuto]=useState(()=>!window.matchMedia('(prefers-reduced-motion: reduce)').matches);
 const [reduced,setReduced]=useState(()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches);
 useEffect(()=>{const media=window.matchMedia('(prefers-reduced-motion: reduce)');const change=()=>{setReduced(media.matches);if(media.matches)setAuto(false);};media.addEventListener('change',change);return()=>media.removeEventListener('change',change);},[]);
 useEffect(()=>{if(!auto||reduced)return;const timer=setInterval(()=>setOn(v=>!v),2000);return()=>clearInterval(timer);},[auto,reduced]);
 return <section className="fet-working"><div className="fet-state"><h3>MOSFET 동작 시험</h3><strong className={on?'is-on':''}>{on?'ON · 채널 형성':'OFF · 채널 없음'}</strong></div><MosfetSection step={5} on={on} animate={on&&!reduced}/><p>{on?'양의 게이트 전압으로 표면에 전자가 모여 반전 채널이 형성됩니다. 드레인 전압에 의해 전자가 소스에서 드레인으로 이동합니다.':'게이트 전압이 문턱전압보다 낮으면 소스와 드레인을 잇는 반전 채널이 형성되지 않습니다.'}</p><div className="fet-controls"><button aria-pressed={!on} onClick={()=>{setAuto(false);setOn(false);}}>게이트 0 V · 끄기</button><button aria-pressed={on} onClick={()=>{setAuto(false);setOn(true);}}>게이트 3 V · 켜기</button><button disabled={reduced} aria-pressed={auto} onClick={()=>setAuto(v=>!v)}>{auto?'자동 재생 멈춤':'자동 ON/OFF'}</button></div><small>문턱전압 1 V를 가정한 개념 애니메이션입니다. 실제 전류와 누설전류의 정량 계산은 생략했습니다.</small></section>;
}

export function FetProcessGame({completed,onComplete}:{completed:boolean;onComplete:()=>void}){
 const [bank,setBank]=useState<string[]>(shuffleSteps),[order,setOrder]=useState<string[]>([]),[result,setResult]=useState<{correct:boolean;index:number;message:string}|null>(null),[solved,setSolved]=useState(false);
 const edit=(next:string[])=>{setOrder(next);setResult(null);};
 const move=(i:number,d:number)=>{const next=[...order];[next[i],next[i+d]]=[next[i+d],next[i]];edit(next);};
 const check=()=>{const answer=checkProcessOrder(order);setResult(answer);if(answer.correct){setSolved(true);onComplete();}};
 return <div className="fet-game"><p className="fet-intro">p형 실리콘에서 출발하는 <strong>평면형 nMOS 공정 퍼즐</strong>입니다. 그림을 공정 순서대로 선택해 제작 라인을 완성하세요.</p>{completed&&<p className="fet-record">✓ 이전 완성 기록이 저장되어 있습니다. 다시 도전할 수 있어요.</p>}
 {!solved?<><div className="fet-order-heading"><h3>나의 제작 라인</h3><span>{order.length} / 6 배치</span></div><ol className="fet-order">{Array.from({length:6},(_,i)=>{const id=order[i],step=processSteps.findIndex(s=>s.id===id);return <li key={i} className={result?.index===i?'incorrect':''}><span className="fet-slot-number">{i+1}</span>{step<0?<span className="fet-empty">아래 그림을 선택하세요</span>:<><MosfetSection step={step}/><strong>{processSteps[step].title}</strong><div className="fet-slot-actions"><button disabled={i===0} aria-label={`${i+1}번째 공정 앞으로`} onClick={()=>move(i,-1)}>←</button><button disabled={i===order.length-1} aria-label={`${i+1}번째 공정 뒤로`} onClick={()=>move(i,1)}>→</button><button aria-label={`${processSteps[step].title} 배치 취소`} onClick={()=>edit(order.filter((_,n)=>n!==i))}>빼기</button></div></>}</li>;})}</ol>
 <div className="fet-bank">{bank.filter(id=>!order.includes(id)).map(id=>{const i=processSteps.findIndex(s=>s.id===id),s=processSteps[i];return <button key={id} className="fet-card" onClick={()=>edit([...order,id])}><MosfetSection step={i}/><strong>{s.title}</strong><span>{s.detail}</span><b>제작 라인에 넣기 ＋</b></button>;})}</div>
 <div className="fet-controls"><button className="primary" disabled={order.length!==6} onClick={check}>공정 순서 확인</button><button disabled={!order.length} onClick={()=>edit([])}>배치 비우기</button></div>{result&&<p className="fet-feedback" role="status">{result.message}</p>}</>:<><p className="fet-success" role="status">공정 순서 완성! 소자가 준비되었습니다.</p><WorkingMosfet/><button onClick={()=>{setSolved(false);setOrder([]);setResult(null);setBank(shuffleSteps());}}>퍼즐 다시 도전</button></>}
 <details className="fet-notes"><summary>이 퍼즐의 공정 범위</summary><p>자기정렬 폴리실리콘 게이트를 사용하는 기본 nMOS 공정입니다. 세정·포토·식각의 반복, LDD·스페이서·실리사이드 등 세부 단계는 생략했습니다. 첨단 공정의 전체 제조 순서를 뜻하지 않습니다.</p><a href="https://ocw.mit.edu/courses/6-004-computation-structures-spring-2017/resources/mosfet-physical-view-7-59-/" target="_blank" rel="noreferrer">MOSFET 구조와 동작 · MIT OCW ↗</a></details></div>;
}
