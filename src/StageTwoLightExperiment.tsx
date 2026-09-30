import {useRef,useState} from 'react';
import {correctBandGap,lightResult,materials,PLANCK_EV_PER_THZ} from './stage-two-light.mjs';
import './stage-two-light.css';
import {OpticalAbsorptionBench} from './OpticalAbsorptionBench';

type Visits=Record<string,{below:boolean;above:boolean}>;
const blankVisits=():Visits=>Object.fromEntries(materials.map(material=>[material.id,{below:false,above:false}]));

export function StageTwoLightExperiment({completed,onComplete}:{completed:boolean;onComplete:()=>void}){
 const [selected,setSelected]=useState(0);
 const [frequency,setFrequency]=useState(140);
 const [thickness,setThickness]=useState(100);
 const [visits,setVisits]=useState<Visits>(blankVisits);
 const [reviewed,setReviewed]=useState(false);
 const [answers,setAnswers]=useState<Record<string,string>>({});
 const [feedback,setFeedback]=useState('');
 const [justFinished,setJustFinished]=useState(false);
 const awarded=useRef(false);
 const material=materials[selected];
 const result=lightResult(material,frequency,thickness);
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
   <input id="light-frequency" type="range" min="120" max="800" step="1" value={frequency} onChange={e=>changeFrequency(Number(e.target.value))}/>
   <div className="light-scale"><span>낮은 에너지 · 적외선</span><span>높은 에너지 · 가시광선</span></div>
   <p>광자 에너지 <strong>{result.energy.toFixed(2)} eV</strong> · 파장 <strong>{Math.round(result.wavelength)} nm</strong> · E = hν = hc/λ</p>
   <label htmlFor="light-thickness">시편 두께 l <strong>{thickness} µm</strong></label>
   <input id="light-thickness" type="range" min="10" max="500" step="10" value={thickness} onChange={e=>setThickness(Number(e.target.value))}/>
   <div className="light-scale"><span>얇은 시편 · 10 µm</span><span>두꺼운 시편 · 500 µm</span></div>
  </div>
  <div className="light-visuals">
   <div className="light-beam-panel">
    <OpticalAbsorptionBench material={material} frequency={frequency} thickness={thickness}/>
    <div className="light-meters"><div>투과 <strong>{percent(result.transmitted*100)}</strong><span className="light-meter"><i style={{width:`${transmission}%`}}/></span></div><div>흡수 <strong>{percent(result.absorbed*100)}</strong><span className="light-meter"><i style={{width:`${absorption}%`}}/></span></div></div>
   </div>

  </div>
  <p className="light-result" role="status">{result.excited?`${material.name}: 광자 에너지가 밴드갭을 넘어 전자–정공 쌍이 생성됩니다. 주파수를 더 높이면 모형의 흡수율이 증가합니다.`:`${material.name}: 광자 에너지가 밴드갭보다 낮아 이 모형에서는 밴드 간 흡수 없이 빛이 통과합니다.`}</p>
  <div className="light-theory">
   <h3>시편 안에서 빛은 어떻게 줄어들까요?</h3>
   <p><strong>−dI/dx = αI · I(x) = I₀ exp(−αx) · Iₜ = I₀ exp(−αl)</strong></p>
   <p>α는 흡수계수(cm⁻¹), l은 시편 두께입니다. 같은 재료와 파장에서는 α가 같아도 두께가 커질수록 투과광이 줄어듭니다. I는 광자 플럭스(photons·cm⁻²·s⁻¹)이며, 위 그림은 입사광 I₀를 1로 정규화했습니다.</p>
   <p>광흡수로 생긴 전자·정공은 과잉 캐리어입니다. 밴드갭을 넘는 여분의 에너지는 산란을 통해 격자로 전달되고, 과잉 캐리어는 이후 재결합합니다. 흡수율은 정상상태 캐리어 농도와 같지 않으며, 농도에는 재결합 수명도 영향을 줍니다.</p>
   <p>Si는 밴드갭보다 에너지가 큰 가시광선도 흡수합니다. 반면 용융 실리카(SiO₂)는 밴드갭이 약 8~9 eV로 커 가시광선의 밴드 간 흡수가 작습니다. 투명성은 두께와 반사 등에도 영향을 받습니다.</p>
  </div>
  <p className="light-note">300 K 교육용 개념 모형입니다. α와 투과·흡수율은 실측값이 아니며, 실제 밴드갭 측정용 정량 데이터로 사용할 수 없습니다. 표면 반사, 결함, 자유 캐리어 흡수를 생략했습니다. Si·Ge의 간접 천이에는 포논이 관여하지만 여기서는 단순한 흡수 경계로 표현했습니다. GaAs는 직접 밴드갭입니다.</p>
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
