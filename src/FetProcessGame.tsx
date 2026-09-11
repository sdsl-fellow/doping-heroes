import {useEffect,useState} from 'react';
import {checkProcessOrder,processSteps,shuffleSteps} from './fet-process.mjs';
import './fet-game.css';

export function MosfetSection({step,on=false,animate=false}:{step:number;on?:boolean;animate?:boolean}){
 const active=step>=4,finished=step===5;
 return <svg viewBox="0 0 360 210" role="img" aria-label={finished?`완성된 nMOS 단면 · ${on?'ON · 채널 형성':'OFF'}`:processSteps[step].title}>
  <rect width="360" height="210" rx="12" fill="#102c36"/>
  <rect x="24" y="112" width="312" height="76" fill="#af7891"/>
  <text x="180" y="178" textAnchor="middle" fill="#fff" fontSize="16">p형 Si 기판 {finished?'· B = 0 V':''}</text>
  <path d="M24 96H57V143H24ZM303 96H336V143H303Z" fill="#b7d6db"/>
  {step>=1&&<rect x="57" y="104" width="246" height="8" fill="#f3d57b"/>}
  {step>=2&&<><rect x="132" y="72" width="96" height="32" fill="#5bb49c"/><text x="180" y="94" textAnchor="middle" fill="#092d29" fontSize="15">poly-Si</text></>}
  {step>=3&&<>{[57,228].map(x=><g key={x}><rect x={x} y="113" width="75" height="34" rx="7" fill={active?'#61c4ef':'#799eb0'} stroke="#c9f5ff" strokeDasharray={active?undefined:'3 3'}/><text x={x+37} y="138" textAnchor="middle" fill="#102d3c" fontSize="15">{active?'n⁺':'P'}</text></g>)}</>}
  {step===0&&<text x="180" y="70" textAnchor="middle" fill="#c4e3df" fontSize="16">활성 영역 준비</text>}
  {step===1&&<text x="180" y="72" textAnchor="middle" fill="#f3d57b" fontSize="16">얇은 게이트 산화막</text>}
  {step===3&&<>{[80,106,254,280].map(x=><g key={x} stroke="#8cdfff" strokeWidth="2"><path d={`M${x} 44v45m-5-7 5 7 5-7`}/><text x={x} y="34" textAnchor="middle" fill="#8cdfff" stroke="none" fontSize="14">P⁺</text></g>)}</>}
  {step===4&&<><path d="M80 83q-12-10 0-20t0-20 M280 83q-12-10 0-20t0-20" stroke="#ffad6f" fill="none" strokeWidth="4"/><text x="180" y="42" textAnchor="middle" fill="#ffad6f" fontSize="16">열처리 · 활성화</text></>}
  {finished&&<>
   <path d="M57 102V60H128V70H132V102ZM228 102V70H232V60H303V102Z" fill="#b7d6db" opacity=".7"/>
   {[94,180,266].map((x,i)=><g key={x}><rect x={x-5} y="40" width="10" height={i===1?32:73} fill="#dbe8ee" stroke="#6e929e"/><text x={x} y="26" textAnchor="middle" fill="#eefbff" fontSize="15">{i===0?'S · 0 V':i===1?`G · ${on?'3':'0'} V`:'D · 1 V'}</text></g>)}
   {on&&<><rect x="132" y="113" width="96" height="7" fill="#6effd9"/>{[0,1,2,3].map(i=><circle key={i} cx={100+i*45} cy="117" r="3" fill="#fff8bc">{animate&&<animate attributeName="cx" from="94" to="266" dur="1.6s" begin={`${-i*.4}s`} repeatCount="indefinite"/>}</circle>)}</>}
  </>}
  <text x="180" y="204" textAnchor="middle" fill="#bbd6db" fontSize="14">{finished?(on?'전자 이동 S → D · 관습적 전류 D → S':'반전 채널 없음 · 거의 흐르지 않는 전류'):'단면 개념도 · 축척과 세부 공정은 단순화'}</text>
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
