import {useRef,useState} from 'react';
import {correctBandGap,lightResult,materials,PLANCK_EV_PER_THZ} from './stage-two-light.mjs';
import './stage-two-light.css';

type Visits=Record<string,{below:boolean;above:boolean}>;
const blankVisits=():Visits=>Object.fromEntries(materials.map(material=>[material.id,{below:false,above:false}]));

export function StageTwoLightExperiment({completed,onComplete}:{completed:boolean;onComplete:()=>void}){
 const [selected,setSelected]=useState(0);
 const [frequency,setFrequency]=useState(140);
 const [visits,setVisits]=useState<Visits>(blankVisits);
 const [reviewed,setReviewed]=useState(false);
 const [answers,setAnswers]=useState<Record<string,string>>({});
 const [feedback,setFeedback]=useState('');
 const [justFinished,setJustFinished]=useState(false);
 const awarded=useRef(false);
 const material=materials[selected];
 const result=lightResult(material,frequency);
 const observed=materials.every(item=>visits[item.id].below&&visits[item.id].above);
 const absorption=Math.round(result.absorbed*1000)/10;
 const transmission=Math.round(result.transmitted*1000)/10;
 const percent=(value:number)=>value>0&&value<.1?'<0.1%':`${value.toFixed(1)}%`;
 const changeFrequency=(value:number)=>{
  setFrequency(value);
  const seen=lightResult(material,value).excited?'above':'below';
  setVisits(old=>({...old,[material.id]:{...old[material.id],[seen]:true}}));
 };
 const check=()=>{
  if(!reviewed||!observed)return;
  const wrong=materials.filter(item=>!correctBandGap(item,answers[item.id]??''));
  if(wrong.length){setFeedback(`${wrong.map(item=>item.id).join(', ')}의 밴드갭을 다시 확인하세요. 300 K에서 측정된 대표값을 eV 단위로 소수 둘째 자리까지 입력하세요.`);return;}
  setFeedback('정답! 세 재료의 밴드갭을 확인했습니다. Stage 2 실험 과제 완료!');
  setJustFinished(true);
  if(!completed&&!awarded.current){awarded.current=true;onComplete();}
 };
 return <section className="light-experiment" aria-label="Stage 2 빛과 에너지 밴드갭 실험">
  {(completed||justFinished)&&<p className="light-complete">실험 과제 완료 ✓ · 다시 조절하며 복습할 수 있습니다.</p>}
  <p>재료와 빛의 주파수를 바꾸며 투과와 흡수, 가전자대에서 전도대로 여기된 전자를 관찰하세요.</p>
  <div className="light-materials" role="group" aria-label="반도체 재료 선택">
   {materials.map((item,i)=><button key={item.id} type="button" aria-pressed={selected===i} onClick={()=>{setSelected(i);setFeedback('');}}>{item.name} <small>{item.id}</small><span aria-label="관찰 상태">{visits[item.id].below&&visits[item.id].above?' ✓':''}</span></button>)}
  </div>
  <div className="light-controls">
   <label htmlFor="light-frequency">빛의 주파수 <strong>{frequency} THz</strong></label>
   <input id="light-frequency" type="range" min="120" max="480" step="1" value={frequency} onChange={e=>changeFrequency(Number(e.target.value))}/>
   <div className="light-scale"><span>낮은 에너지 · 적외선</span><span>높은 에너지 · 가시광선</span></div>
   <p>광자 에너지 <strong>{result.energy.toFixed(2)} eV</strong> · 파장 <strong>{Math.round(result.wavelength)} nm</strong> · E = hν</p>
  </div>
  <div className="light-visuals">
   <div className="light-beam-panel">
    <div className="light-beam" role="img" aria-label={`${material.id}에 입사한 빛의 ${percent(transmission)}가 투과하고 ${percent(absorption)}가 흡수되는 교육용 모형`}>
     <span className="light-source">빛<br/>⇢</span>
     <span className="light-incoming"/>
     <span className="light-sample" style={{boxShadow:`0 0 ${10+absorption/3}px rgba(255,192,94,${result.absorbed*.7})`}}>{material.id}<span className="light-carriers" style={{opacity:result.absorbed}}>e⁻ ↑</span></span>
     <span className="light-outgoing" style={{opacity:result.transmitted}}/>
     <span className="light-detector">투과광</span>
    </div>
    <div className="light-meters"><div>투과 <strong>{percent(result.transmitted*100)}</strong><span className="light-meter"><i style={{width:`${transmission}%`}}/></span></div><div>흡수·여기 <strong>{percent(result.absorbed*100)}</strong><span className="light-meter"><i style={{width:`${absorption}%`}}/></span></div></div>
   </div>
   <div className="light-bands" aria-label={`${material.id} 에너지 밴드 모형: ${result.excited?'전자 여기 가능':'밴드 간 전자 여기 없음'}`}>
    <span className="light-band-label">에너지 ↑</span>
    <div className="light-band conduction">전도대 {result.excited&&<span className="light-electron" style={{opacity:Math.max(.25,result.absorbed)}}>e⁻</span>}</div>
    <div className="light-gap">밴드갭 E<sub>g</sub>{result.excited?<span className="light-transition">↑ 광자 흡수</span>:<span>전자 여기 없음</span>}</div>
    <div className="light-band valence">가전자대 {result.excited&&<span className="light-hole">h⁺</span>}</div>
   </div>
  </div>
  <p className="light-result" role="status">{result.excited?`${material.name}: 광자 에너지가 밴드갭을 넘어 전자–정공 쌍이 생성됩니다. 주파수를 더 높이면 모형의 흡수율이 증가합니다.`:`${material.name}: 광자 에너지가 밴드갭보다 낮아 이 모형에서는 밴드 간 흡수 없이 빛이 통과합니다.`}</p>
  <p className="light-note">300 K, 같은 두께의 이상적인 시료를 가정한 개념 모형입니다. 표시된 투과·흡수 비율은 실측값이 아니며 표면 반사, 결함, 자유 캐리어 흡수 등을 생략했습니다. Si와 Ge는 간접 밴드갭, GaAs는 직접 밴드갭입니다.</p>
  <div className="light-observations" aria-label="관찰 기록">{materials.map(item=><span key={item.id}>{item.id}: 낮을 때 {visits[item.id].below?'✓':'○'} · 높을 때 {visits[item.id].above?'✓':'○'}</span>)}</div>
  {!reviewed?<button type="button" className="primary" disabled={!observed} onClick={()=>setReviewed(true)}>세 재료의 실험 결과 확인</button>:<div className="light-answers">
   <h3>실험 결과 · 에너지 밴드갭 입력</h3>
   <p>이 모형에서 처음으로 밴드 간 흡수가 나타나는 주파수입니다. 경계에서 E<sub>g</sub> ≈ hν, h ≈ 0.004136 eV/THz를 이용해 밴드갭을 입력하세요. (eV, 소수 둘째 자리)</p>
   <div className="light-thresholds">{materials.map(item=><span key={item.id}>{item.id} · 약 {Math.ceil(item.gap/PLANCK_EV_PER_THZ)} THz</span>)}</div>
   <div className="light-answer-grid">{materials.map(item=><label key={item.id}>{item.name} ({item.id})<span><input type="text" inputMode="decimal" aria-label={`${item.id} 에너지 밴드갭 eV`} value={answers[item.id]??''} onChange={e=>{setAnswers(a=>({...a,[item.id]:e.target.value}));setFeedback('');}}/> eV</span></label>)}</div>
   <button type="button" className="primary" onClick={check}>밴드갭 확인 · 실험 완료</button>
  </div>}
  {feedback&&<p className="light-feedback" role="status">{feedback}</p>}
 </section>;
}
