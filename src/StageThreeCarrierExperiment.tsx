import {useEffect,useRef,useState} from 'react';
import type {Save} from './save';
import {catalogItem} from './catalog.mjs';
import {ItemIcon} from './ItemIcon';
import {CarrierEquipmentPreview} from './CarrierEquipmentPreview';
import {carrierEquipment,carrierLabReady,equipmentOwned,carrierMeasurement,targetTemperatures,measurementsComplete,carrierQuestions,canCompleteCarrierLab} from './stage-three-carriers.mjs';
import './stage-three-carriers.css';

type Reading=ReturnType<typeof carrierMeasurement>;
const sci=(n:number)=>n===0?'0':n.toExponential(2).replace('e+','e');
const regionNames={freeze:'캐리어 동결 영역',extrinsic:'외인성 영역',intrinsic:'진성 영역'};

export function ProbeStation({loaded,contacted,temperature,reading,busy}:{loaded:boolean;contacted:boolean;temperature:number;reading:Reading|null;busy:boolean}){
 const hot=temperature>=500;
 return <svg className={`carrier-station${busy?' measuring':''}`} viewBox="0 0 600 310" role="img" aria-label={`4점 프로브 스테이션. ${loaded?'시편 배치 완료':'시편 없음'}. ${contacted?'프로브 접촉 완료':'프로브 올림'}. ${temperature} K.`}>
  <defs><linearGradient id="carrier-metal" x2="0" y2="1"><stop stopColor="#ecf4ed"/><stop offset=".55" stopColor="#beced0"/><stop offset="1" stopColor="#81979e"/></linearGradient><linearGradient id="carrier-wafer" x2="1" y2="1"><stop stopColor="#d8b7ee"/><stop offset=".45" stopColor="#766eb9"/><stop offset="1" stopColor="#394c73"/></linearGradient></defs>
  <rect x="2" y="2" width="596" height="306" rx="18" fill="#132f3d" stroke="#4f7886"/>
  <path d="M22 270H578" stroke="#5c7f87" strokeWidth="3"/>
  <path d="M162 244L410 244 445 270 127 270Z" fill="#759096"/><rect x="146" y="269" width="278" height="12" rx="4" fill="#4e646e"/>
  <rect x="205" y="75" width="18" height="163" fill="url(#carrier-metal)"/><rect x="215" y="75" width="140" height="18" rx="3" fill="url(#carrier-metal)"/>
  <ellipse cx="287" cy="230" rx="101" ry="33" fill="#6b7889"/><path d="M186 220V231C186 270 388 270 388 231V220" fill="#46596b"/><ellipse cx="287" cy="220" rx="101" ry="33" fill="url(#carrier-metal)"/>
  <ellipse cx="287" cy="214" rx="91" ry="26" fill={hot?'#bf6c42':'#377d95'} opacity=".8"/>
  {loaded&&<g className="carrier-wafer"><ellipse cx="287" cy="208" rx="77" ry="23" fill="url(#carrier-wafer)" stroke="#d8c8f7" strokeWidth="2"/><path d="M229 203L327 222M238 193L344 213M254 188L355 207M253 222L278 186M281 231L308 187M309 229L333 192" stroke="#d8d3f4" opacity=".35"/><path d="M218 211Q230 190 267 188" stroke="#f3e5ff" strokeWidth="3" fill="none" opacity=".7"/></g>}
  <g fill="none" strokeWidth="3"><path d="M167 85H185V130H242V150" stroke="#ffc66f"/><path d="M167 104H176V145H332V150" stroke="#ffc66f"/><path d="M435 86H390V117H272V150" stroke="#6dd9ef"/><path d="M435 104H404V129H302V150" stroke="#6dd9ef"/></g>
  <g className="carrier-probe-head" transform={contacted?'translate(0 23)':'translate(0 0)'}>
   <rect x="222" y="143" width="130" height="20" rx="4" fill="url(#carrier-metal)" stroke="#68818a"/>
   {[242,272,302,332].map((x,i)=><g key={x}><path d={`M${x} 162V180L${x-2} 185`} fill="none" stroke={i===0||i===3?'#f3c96b':'#a4eaff'} strokeWidth="3"/><text x={x} y="137" textAnchor="middle" fontSize="12" fill="#dcebee">{['I+','V+','V−','I−'][i]}</text></g>)}
  </g>
  <g><rect x="20" y="43" width="149" height="83" rx="8" fill="url(#carrier-metal)"/><rect x="30" y="66" width="129" height="39" rx="4" fill="#0b2432"/><text x="95" y="59" textAnchor="middle" fontSize="12" fill="#233c48">정전류원 · CURRENT</text><text x="95" y="90" textAnchor="middle" fontSize="19" fill="#f5d285">{contacted?'10 µA':'OFF'}</text></g>
  <g><rect x="431" y="43" width="149" height="83" rx="8" fill="url(#carrier-metal)"/><rect x="441" y="66" width="129" height="39" rx="4" fill="#0b2432"/><text x="505" y="59" textAnchor="middle" fontSize="12" fill="#233c48">전압계 · VOLTAGE</text><text x="505" y="90" textAnchor="middle" fontSize="16" fill="#9aebf1">{busy?'READ…':reading?sci(reading.voltage*1000)+' mV':'— mV'}</text></g>
  <g><rect x="430" y="183" width="150" height="65" rx="7" fill="#e2e7de"/><text x="505" y="201" textAnchor="middle" fontSize="12" fill="#243e49">온도 제어 척 · 모형</text><rect x="441" y="209" width="129" height="29" rx="3" fill="#203747"/><text x="505" y="230" textAnchor="middle" fontSize="20" fill={hot?'#ffd19b':'#a7eaf3'}>{temperature} K</text><path d="M430 230H392" stroke="#ebbc76" strokeWidth="3"/></g>
  <circle className="carrier-status-light" cx="31" cy="20" r="5" fill={contacted?'#8ee1ac':'#8b9fa8'}/><text x="44" y="25" fontSize="13" fill="#c9e1e6">{busy?'측정 중':contacted?'접촉 완료 · 측정 준비':loaded?'프로브를 내려 접촉하세요':'트위져로 시편을 배치하세요'}</text>
  <text x="287" y="298" textAnchor="middle" fontSize="13" fill="#bad6da">n-Si · P 10¹⁵ cm⁻³ · 두께 100 µm</text>
 </svg>;
}

export function CarrierGraph({records}:{records:Reading[]}){
 const sorted=[...records].sort((a,b)=>a.temperature-b.temperature);
 const x=(T:number)=>65+(T-40)/760*475,y=(sigma:number)=>220-(Math.log10(sigma)+3)/4*180;
 return <svg className="carrier-graph" viewBox="0 0 600 275" role="img" aria-label="측정 온도에 따른 전도도 그래프. 세로축은 로그 눈금입니다.">
  <text x="65" y="22" fill="#dfedef" fontSize="15">전도도 σ (S/cm) · 로그 눈금</text>
  {[-3,-2,-1,0,1].map(p=><g key={p}><line x1="65" x2="540" y1={y(10**p)} y2={y(10**p)} stroke="#486775" strokeDasharray="4 5"/><text x="54" y={y(10**p)+5} textAnchor="end" fontSize="13" fill="#c2d8dc">{10**p}</text></g>)}
  {[40,200,400,600,800].map(t=><g key={t}><text x={x(t)} y="243" textAnchor="middle" fontSize="13" fill="#c2d8dc">{t}</text></g>)}
  <path d="M65 40V220H540" stroke="#acc8ce" fill="none"/>
  {sorted.length>1&&<polyline points={sorted.map(r=>`${x(r.temperature)},${y(r.sigma)}`).join(' ')} fill="none" stroke="#ecc780" strokeWidth="2"/>}
  {sorted.map(r=><circle key={r.temperature} cx={x(r.temperature)} cy={y(r.sigma)} r="5" fill="#8de9e1" stroke="#183645" strokeWidth="2"><title>{`${r.temperature} K · ${sci(r.sigma)} S/cm`}</title></circle>)}
  {!sorted.length&&<text x="300" y="126" textAnchor="middle" fill="#8eafb9" fontSize="15">측정하면 그래프에 점이 기록됩니다</text>}
  <text x="305" y="268" textAnchor="middle" fontSize="14" fill="#c2d8dc">온도 T (K)</text>
 </svg>;
}

export function StageThreeCarrierExperiment({save,completed,onComplete,onBusy}:{save:Save;completed:boolean;onComplete:()=>void;onBusy:(busy:boolean)=>void}){
 const [prepared,setPrepared]=useState<string[]>([]),[contacted,setContacted]=useState(false);
 const [equipping,setEquipping]=useState<string|null>(null);
 const [temperature,setTemperature]=useState(300),[records,setRecords]=useState<Reading[]>([]),[reading,setReading]=useState<Reading|null>(null);
 const [answers,setAnswers]=useState<Record<string,string>>({}),[feedback,setFeedback]=useState(''),[busy,setBusy]=useState(false),[finished,setFinished]=useState(false);
 const timer=useRef<ReturnType<typeof setTimeout>|null>(null),awarded=useRef(false);
 useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);onBusy(false);},[onBusy]);
 const owned=equipmentOwned(save),ready=carrierLabReady(save,prepared),observed=measurementsComplete(records);
 const prepare=(id:string)=>{if(!owned.includes(id)||prepared.includes(id)||busy)return;setPrepared(ids=>[...ids,id]);setEquipping(id);};
 const measure=()=>{
  if(!ready||!contacted||timer.current)return;
  const result=carrierMeasurement(temperature);setBusy(true);onBusy(true);setFeedback('');
  timer.current=setTimeout(()=>{setReading(result);setRecords(old=>[...old.filter(r=>r.temperature!==result.temperature),result].sort((a,b)=>a.temperature-b.temperature));setBusy(false);onBusy(false);timer.current=null;},650);
 };
 const check=()=>{
  if(!canCompleteCarrierLab(save,prepared,contacted,records,answers)){setFeedback('다섯 온도의 측정을 완료하고, 전자 농도와 이동도를 비교해 답을 다시 선택하세요.');return;}
  setFinished(true);setFeedback('관찰과 해석을 완료했습니다. Stage 3 실험 과제 완료!');
  if(!completed&&!awarded.current){awarded.current=true;onComplete();}
 };
 return <section className="carrier-lab" aria-label="Stage 3 온도에 따른 실리콘 전도도 실험">
  <div className="carrier-intro"><span>PROBE STATION / 03</span><h3>온도를 바꾸면 전류는 어떻게 달라질까?</h3><p>장비를 준비하고 다섯 온도에서 전도도를 측정하세요. 캐리어 농도와 이동도가 함께 만드는 변화를 찾아봅시다.</p></div>
  {(completed||finished)&&<p className="carrier-success">실험 과제 완료 ✓ · 장비를 다시 준비해 보상 없이 복습할 수 있습니다.</p>}
  <h3>1. 실험 장비 준비</h3>
  <div className={`carrier-equip-stage${ready?' ready':''}`}>
   <div className="carrier-avatar-holder">
    <CarrierEquipmentPreview character={save.character} prepared={prepared} name={save.name}/>
    <div className="carrier-avatar-platform" aria-hidden="true"/>
    {equipping&&<div key={equipping} className="carrier-equip-burst" aria-hidden="true"><i className="carrier-equip-ring"/><i className="carrier-equip-ring second"/>{Array.from({length:8},(_,i)=><i key={i} className="carrier-equip-spark" style={{transform:`rotate(${i*45}deg)`}}><b>✦</b></i>)}</div>}
   </div>
   <strong className="carrier-avatar-name">{save.name}</strong>
   <p className="carrier-equip-status" role="status">{ready?'장비 착용 완료 · 실험 준비 완료!':equipping?`${catalogItem(equipping)?.name} 착용 완료 · ${prepared.length}/4`:'아래 장비를 눌러 실험을 준비하세요 · 0/4'}</p>
  </div>
  <div className="carrier-equipment">{carrierEquipment.map(item=>{const have=owned.includes(item.id),done=prepared.includes(item.id);return <div key={item.id} className={done?'prepared':!have?'missing':''}><ItemIcon id={item.id}/><strong>{catalogItem(item.id)?.name}</strong><button disabled={!have||done||busy} aria-label={`${catalogItem(item.id)?.name} 착용`} aria-pressed={done} onClick={()=>prepare(item.id)}>착용</button><small>{done?'착용 완료 ✓':!have?'미보유':item.purpose}</small></div>;})}</div>
  <p className="carrier-note">팔찌와 고글을 함께 착용하고, 트위져와 웨이퍼 조각은 양손에 준비합니다. 네 아이템은 소모되지 않습니다.</p>
  {!carrierEquipment.every(item=>owned.includes(item.id))&&<p role="status" className="carrier-warning">미보유 장비는 세미 마을의 도너 상점에서 준비하세요. 네 가지를 모두 보유해야 실험할 수 있습니다.</p>}
  <h3>2. 프로브 접촉 · 온도별 측정</h3>
  <ProbeStation loaded={prepared.includes('T06')} contacted={ready&&contacted} temperature={temperature} reading={reading} busy={busy}/>
  <button className="primary" disabled={!ready||contacted||busy} onClick={()=>setContacted(true)}>{contacted?'4점 프로브 접촉 완료 ✓':'프로브 내리기 · 시편에 접촉'}</button>
  <fieldset className="carrier-controls" disabled={!ready||!contacted||busy}>
   <label htmlFor="carrier-temperature">시편 온도 <strong>{temperature} K <small>({(temperature-273.15).toFixed(1)} °C)</small></strong></label>
   <input id="carrier-temperature" type="range" min="40" max="800" step="10" value={temperature} onChange={e=>{setTemperature(Number(e.target.value));setReading(null);}}/>
   <div className="carrier-presets" aria-label="필수 측정 온도">{targetTemperatures.map(T=><button key={T} aria-pressed={temperature===T} onClick={()=>{setTemperature(T);setReading(null);}}>{T} K {records.some(r=>r.temperature===T)?'✓':''}</button>)}</div>
   <button className="primary" onClick={measure}>{busy?'온도 안정화 · 측정 중…':'현재 온도에서 측정·기록'}</button>
  </fieldset>
  <p className="carrier-note">바깥쪽 두 프로브로 전류를 흘리고 안쪽 두 프로브로 전압을 읽습니다. 얇고 넓은 균일 시편을 가정한 4점 프로브 모형입니다.</p>
  <div className="carrier-readings" aria-live="polite"><div><small>전도도 σ</small><strong>{reading?sci(reading.sigma):'—'} <small>S/cm</small></strong></div><div><small>전자 농도 n</small><strong>{reading?sci(reading.n):'—'} <small>cm⁻³</small></strong></div><div><small>전자 이동도 μₙ</small><strong>{reading?reading.muN.toFixed(1):'—'} <small>cm²/(V·s)</small></strong></div><div><small>정공 농도 p</small><strong>{reading?sci(reading.p):'—'} <small>cm⁻³</small></strong></div></div>
  {reading&&<p className="carrier-region" role="status">{regionNames[reading.regime as keyof typeof regionNames]} · 도너 이온화율 {(reading.ionized/1e15*100).toFixed(1)}%</p>}
  <CarrierGraph records={records}/>
  <p className="carrier-note">점은 기록한 값이며, 연결선은 측정점 사이를 잇는 안내선입니다. 필수 온도 {targetTemperatures.filter(T=>records.some(r=>r.temperature===T)).length}/5 완료</p>
  {records.length>0&&<div className="carrier-table-wrap"><table><caption>온도별 측정 기록</caption><thead><tr><th scope="col">T (K)</th><th scope="col">n (cm⁻³)</th><th scope="col">μₙ (cm²/V·s)</th><th scope="col">σ (S/cm)</th></tr></thead><tbody>{records.map(r=><tr key={r.temperature}><th scope="row">{r.temperature}</th><td>{sci(r.n)}</td><td>{r.muN.toFixed(1)}</td><td>{sci(r.sigma)}</td></tr>)}</tbody></table></div>}
  <div className="carrier-theory"><strong>σ = q(nμₙ + pμₚ)</strong><p>전도도는 캐리어의 수와 움직이기 쉬운 정도에 모두 영향을 받습니다. 이 실험의 도너 농도는 10¹⁵ cm⁻³로 고정되어 있으며, 캐릭터의 도핑 농도와는 별개입니다.</p></div>
  <h3>3. 측정 결과 해석</h3>
  {!observed?<p>60·150·300·500·800 K에서 각각 측정하면 결과 해석 문제가 열립니다.</p>:<div className="carrier-questions">{carrierQuestions.map(q=><fieldset key={q.id}><legend>{q.question}</legend>{q.options.map(o=><label key={o.id}><input type="radio" name={`carrier-${q.id}`} value={o.id} checked={answers[q.id]===o.id} onChange={()=>{setAnswers(a=>({...a,[q.id]:o.id}));setFeedback('');}}/>{o.text}</label>)}{finished&&<p>{q.explanation}</p>}</fieldset>)}<button className="primary" onClick={check}>해석 확인 · 실험 완료</button></div>}
  {feedback&&<p className="carrier-feedback" role="status">{feedback}</p>}
  <details className="carrier-note"><summary>교육용 모형과 측정식</summary><p>ρ = (π/ln 2)·t·V/I, σ = 1/ρ. t = 0.01 cm, I = 10 µA이며 시편 가장자리 보정은 생략했습니다. 도너 이온화와 전하 중성 조건으로 농도를 구하고, 불순물·격자 산란의 단순화된 이동도 모형을 사용합니다. 그래프는 실측 데이터가 아닙니다. 온도 제어·냉각·접촉 안정화 시간도 축약했습니다.</p><p><a href="https://www.ioffe.ru/SVA/NSM/Semicond/Si/bandstr.html" target="_blank" rel="noreferrer">실리콘 밴드 파라미터</a> · <a href="https://www.tek.com/en/documents/application-note/resistivity-measurements-using-model-2450-sourcemeter-smu-instrument-and-f" target="_blank" rel="noreferrer">4점 프로브 측정 원리</a></p></details>
 </section>;
}
