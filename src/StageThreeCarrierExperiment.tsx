import {useEffect,useRef,useState} from 'react';
import type {Save} from './save';
import {catalogItem} from './catalog.mjs';
import {ItemIcon} from './ItemIcon';
import {CarrierEquipmentPreview} from './CarrierEquipmentPreview';
import {carrierEquipment,carrierLabReady,equipmentOwned,carrierMeasurement,targetTemperatures,measurementsComplete,carrierQuestions,canCompleteCarrierLab,DONOR_DENSITY} from './stage-three-carriers.mjs';
import './stage-three-carriers.css';

type Reading=ReturnType<typeof carrierMeasurement>;
const sci=(n:number)=>n===0?'0':n.toExponential(2).replace('e+','e');
const regionNames={partial:'도너 부분 이온화 영역',extrinsic:'외인성 영역',intrinsic:'진성 영역'};
const waferFragmentImage=`./item-icons/${catalogItem('T06')!.assetCode}.png?v=3`;

export function ProbeStation({loaded,contacted,temperature,reading,busy}:{loaded:boolean;contacted:boolean;temperature:number;reading:Reading|null;busy:boolean}){
 const hot=temperature>=500;
 return <svg className={`carrier-station${busy?' measuring':''}`} viewBox="0 0 600 310" role="img" aria-label={`4점 프로브 스테이션. ${loaded?'시편 배치 완료':'시편 없음'}. ${contacted?'프로브 접촉 완료':'프로브 올림'}. ${temperature} K.`}>
  <defs><linearGradient id="carrier-metal" x2="0" y2="1"><stop stopColor="#ecf4ed"/><stop offset=".55" stopColor="#beced0"/><stop offset="1" stopColor="#81979e"/></linearGradient><linearGradient id="carrier-probe-metal" x1="0" y1="0" x2="1" y2="0"><stop stopColor="#737d88"/><stop offset=".4" stopColor="#e6ebef"/><stop offset=".65" stopColor="#a8b1ba"/><stop offset="1" stopColor="#606b76"/></linearGradient></defs>
  <rect x="2" y="2" width="596" height="306" rx="18" fill="#132f3d" stroke="#4f7886"/>
  <path d="M22 270H578" stroke="#5c7f87" strokeWidth="3"/>
  <path d="M162 244L410 244 445 270 127 270Z" fill="#759096"/><rect x="146" y="269" width="278" height="12" rx="4" fill="#4e646e"/>
  <rect x="205" y="75" width="18" height="163" fill="url(#carrier-metal)"/><rect x="215" y="75" width="140" height="18" rx="3" fill="url(#carrier-metal)"/>
  <ellipse cx="287" cy="230" rx="101" ry="33" fill="#6b7889"/><path d="M186 220V231C186 270 388 270 388 231V220" fill="#46596b"/><ellipse cx="287" cy="220" rx="101" ry="33" fill="url(#carrier-metal)"/>
  <ellipse cx="287" cy="214" rx="91" ry="26" fill={hot?'#bf6c42':'#377d95'} opacity=".8"/>
  {/* The carried T06 fragment lies flat on the chuck beneath all four tips. */}
  {loaded&&<g className="carrier-wafer"><title>지참한 웨이퍼 조각 시편</title><image href={waferFragmentImage} x="207" y="180" width="160" height="60" preserveAspectRatio="none"/></g>}
  <g fill="none" strokeWidth="3"><path d="M167 85H185V130H242V150" stroke="#ffc66f"/><path d="M167 104H176V145H332V150" stroke="#ffc66f"/><path d="M435 86H390V117H272V150" stroke="#6dd9ef"/><path d="M435 104H404V129H302V150" stroke="#6dd9ef"/></g>
  <g className="carrier-probe-head" transform={contacted?'translate(0 23)':'translate(0 0)'}>
   <rect x="222" y="143" width="130" height="20" rx="4" fill="url(#carrier-metal)" stroke="#68818a"/>
   {[242,272,302,332].map((x,i)=><g key={x}><path d={`M${x-3} 162H${x+3}V175L${x} 185L${x-3} 175Z`} fill="url(#carrier-probe-metal)" stroke="#65717c" strokeWidth=".8"/><path d={`M${x-1} 164V175L${x} 181`} fill="none" stroke="#f1f4f6" strokeWidth=".8"/><text x={x} y="137" textAnchor="middle" fontSize="12" fill="#dcebee">{['I+','V+','V−','I−'][i]}</text></g>)}
  </g>
  <g><rect x="20" y="43" width="149" height="83" rx="8" fill="url(#carrier-metal)"/><rect x="30" y="66" width="129" height="39" rx="4" fill="#0b2432"/><text x="95" y="59" textAnchor="middle" fontSize="12" fill="#233c48">정전류원 · CURRENT</text><text x="95" y="90" textAnchor="middle" fontSize="19" fill="#f5d285">{contacted?'10 µA':'OFF'}</text></g>
  <g><rect x="431" y="43" width="149" height="83" rx="8" fill="url(#carrier-metal)"/><rect x="441" y="66" width="129" height="39" rx="4" fill="#0b2432"/><text x="505" y="59" textAnchor="middle" fontSize="12" fill="#233c48">전압계 · VOLTAGE</text><text x="505" y="90" textAnchor="middle" fontSize="16" fill="#9aebf1">{busy?'READ…':reading?sci(reading.voltage*1000)+' mV':'— mV'}</text></g>
  <g><rect x="430" y="183" width="150" height="65" rx="7" fill="#e2e7de"/><text x="505" y="201" textAnchor="middle" fontSize="12" fill="#243e49">온도 제어 척(chuck)</text><rect x="441" y="209" width="129" height="29" rx="3" fill="#203747"/><text x="505" y="230" textAnchor="middle" fontSize="20" fill={hot?'#ffd19b':'#a7eaf3'}>{temperature} K</text><path d="M430 230H392" stroke="#ebbc76" strokeWidth="3"/></g>
  <circle className="carrier-status-light" cx="31" cy="20" r="5" fill={contacted?'#8ee1ac':'#8b9fa8'}/><text x="44" y="25" fontSize="13" fill="#c9e1e6">{busy?'측정 중':contacted?'접촉 완료 · 측정 준비':loaded?'프로브를 내려 접촉하세요':'트위져로 시편을 배치하세요'}</text>
  <text x="287" y="298" textAnchor="middle" fontSize="13" fill="#bad6da">p-Si 기판 · 표면 n-Si(P): 10¹⁶ cm⁻³ · 100 nm</text>
 </svg>;
}

export function CarrierGraph({records}:{records:Reading[]}){
 const sorted=[...records].sort((a,b)=>a.temperature-b.temperature);
 const x=(T:number)=>65+(T-40)/760*475,y=(sigma:number)=>220-(Math.log10(sigma)+1)/3*180;
 return <svg className="carrier-graph" viewBox="0 0 600 275" role="img" aria-label="측정 온도에 따른 전도도 그래프. 세로축은 로그 눈금입니다.">
  <text x="65" y="22" fill="#dfedef" fontSize="15">전도도 σ (S/cm) · 로그 눈금</text>
  {[-1,0,1,2].map(p=><g key={p}><line x1="65" x2="540" y1={y(10**p)} y2={y(10**p)} stroke="#486775" strokeDasharray="4 5"/><text x="54" y={y(10**p)+5} textAnchor="end" fontSize="13" fill="#c2d8dc">{10**p}</text></g>)}
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
  if(!canCompleteCarrierLab(save,prepared,contacted,records,answers)){setFeedback('여섯 온도의 측정을 완료하고, 전자 농도와 이동도를 비교해 답을 다시 선택하세요.');return;}
  setFinished(true);setFeedback('관찰과 해석을 완료했습니다. Stage 3 실험 과제 완료!');
  if(!completed&&!awarded.current){awarded.current=true;onComplete();}
 };
 return <section className="carrier-lab" aria-label="Stage 3 온도에 따른 실리콘 전도도 실험">
  <div className="carrier-intro"><span>PROBE STATION / 03</span><h3>온도를 바꾸면 면저항과 전도도는 어떻게 달라질까?</h3><p>장비를 준비하고 여섯 온도에서 전도도를 측정하세요. 캐리어 농도와 이동도가 함께 만드는 변화를 찾아봅시다.</p></div>
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
  <h3>2. 프로브 접촉 및 온도별 측정</h3>
  <ProbeStation loaded={prepared.includes('T06')} contacted={ready&&contacted} temperature={temperature} reading={reading} busy={busy}/>
  <p className="carrier-note">p-type Si 웨이퍼 조각의 표면에 P 도핑 농도 10¹⁶ cm⁻³, 두께 100 nm의 균일한 n-type 층이 형성되어 있다고 가정합니다. 바깥쪽 두 프로브로 표면층에 전류를 흘리고 안쪽 두 프로브로 전압을 읽어 면저항을 구합니다.</p>
  <button className="primary" disabled={!ready||contacted||busy} onClick={()=>setContacted(true)}>{contacted?'4점 프로브 접촉 완료 ✓':'프로브 내리기 · 시편에 접촉'}</button>
  <fieldset className="carrier-controls" disabled={!ready||!contacted||busy}>
   <label htmlFor="carrier-temperature">시편 온도 <strong>{temperature} K <small>({(temperature-273.15).toFixed(1)} °C)</small></strong></label>
   <input id="carrier-temperature" type="range" min="40" max="800" step="10" value={temperature} onChange={e=>{setTemperature(Number(e.target.value));setReading(null);}}/>
   <div className="carrier-presets" aria-label="필수 측정 온도">{targetTemperatures.map(T=><button key={T} aria-pressed={temperature===T} aria-label={`${T} K${records.some(r=>r.temperature===T)?' · 측정 완료':''}`} onClick={()=>{setTemperature(T);setReading(null);}}>{T} K{records.some(r=>r.temperature===T)&&<span className="carrier-temperature-check" aria-hidden="true">✓</span>}</button>)}</div>
   <button className="primary" onClick={measure}>{busy?'온도 안정화 · 측정 중…':'현재 온도에서 측정·기록'}</button>
  </fieldset>
  <div className="carrier-readings" aria-live="polite"><div className="carrier-sheet-reading"><small>면저항 Rₛ</small><strong>{reading?sci(reading.sheetResistance):'—'} <small>Ω/□</small></strong></div><div><small>전도도 σ</small><strong>{reading?sci(reading.sigma):'—'} <small>S/cm</small></strong></div><div><small>전자 농도 n</small><strong>{reading?sci(reading.n):'—'} <small>cm⁻³</small></strong></div><div><small>전자 이동도 μₙ</small><strong>{reading?reading.muN.toFixed(1):'—'} <small>cm²/(V·s)</small></strong></div><div><small>정공 농도 p</small><strong>{reading?sci(reading.p):'—'} <small>cm⁻³</small></strong></div></div>
  {reading&&<p className="carrier-region" role="status">{regionNames[reading.regime as keyof typeof regionNames]} · 도너 이온화율 {(reading.ionized/DONOR_DENSITY*100).toFixed(1)}%</p>}
  <CarrierGraph records={records}/>
  <p className="carrier-note">필수 온도 {targetTemperatures.filter(T=>records.some(r=>r.temperature===T)).length}/{targetTemperatures.length} 완료</p>
  {records.length>0&&<div className="carrier-table-wrap"><table><caption>온도별 측정 기록</caption><thead><tr><th scope="col">T (K)</th><th scope="col">Rₛ (Ω/□)</th><th scope="col">n (cm⁻³)</th><th scope="col">μₙ (cm²/V·s)</th><th scope="col">σ (S/cm)</th></tr></thead><tbody>{records.map(r=><tr key={r.temperature}><th scope="row">{r.temperature}</th><td>{sci(r.sheetResistance)}</td><td>{sci(r.n)}</td><td>{r.muN.toFixed(1)}</td><td>{sci(r.sigma)}</td></tr>)}</tbody></table></div>}
  <div className="carrier-theory"><strong>Rₛ = 1/(σt), σ = q(nμₙ + pμₚ)</strong><p>표면층의 전도도가 커지면 면저항은 작아집니다. 도너 농도 10¹⁶ cm⁻³와 표면층 두께 100 nm는 이 실험의 고정 조건이며, 캐릭터의 도핑 농도와는 별개입니다. n, p와 이동도는 모형에서 계산한 값이며, 전압 측정만으로 각각을 독립적으로 구할 수는 없습니다.</p></div>
  <h3>3. 측정 결과 해석</h3>
  {!observed?<p>40·60·150·300·500·800 K에서 각각 측정하면 결과 해석 문제가 열립니다.</p>:<div className="carrier-questions">{carrierQuestions.map(q=><fieldset key={q.id}><legend>{q.question}</legend>{q.options.map(o=><label key={o.id}><input type="radio" name={`carrier-${q.id}`} value={o.id} checked={answers[q.id]===o.id} onChange={()=>{setAnswers(a=>({...a,[q.id]:o.id}));setFeedback('');}}/>{o.text}</label>)}{finished&&<p>{q.explanation}</p>}</fieldset>)}<button className="primary" onClick={check}>해석 확인 · 실험 완료</button></div>}
  {feedback&&<p className="carrier-feedback" role="status">{feedback}</p>}
  <details className="carrier-note"><summary>교육용 모형과 측정식</summary><p><strong>시편 조건:</strong> p-type Si 기판 위에 P 도핑 농도 Nᴅ = 10¹⁶ cm⁻³의 균일한 n-type 표면층이 형성된 웨이퍼 조각입니다. 전류가 흐르는 유효 두께는 t = 100 nm = 10⁻⁵ cm로 고정합니다. p-type 기판의 두께는 이 t에 포함하지 않습니다.</p><p><strong>면저항:</strong> Rₛ = (π/ln 2)·(V/I)·k ≈ 4.532·(V/I)·k [Ω/□]. I = 10 µA이며, V는 안쪽 두 프로브 사이의 전압입니다. 등간격의 일렬 프로브, 두께 ≪ 프로브 간격, 시편 가장자리에서 충분히 떨어진 접촉을 가정하여 보정 계수 k = 1을 사용합니다. 면저항을 구하는 식에는 두께가 들어가지 않습니다.</p><p><strong>전도도 환산:</strong> ρ = Rₛt [Ω·cm], σ = 1/ρ = 1/(Rₛt) [S/cm]. 면저항 Rₛ와 전도도 σ를 구분하여 표시합니다. 실제 웨이퍼 조각 측정에서는 모양과 가장자리에 따른 보정이 필요할 수 있습니다.</p><p><strong>전류 경로 가정:</strong> 네 프로브는 n-type 표면층에만 접촉합니다. 기판과 척으로의 누설·병렬 전도, p–n 접합과 표면의 공핍층, 두께 방향 도핑 분포를 생략하여 100 nm 전체가 균일하게 전도한다고 가정합니다. 접합에 의한 기판 분리가 모든 온도에서 완벽하다는 뜻은 아닙니다.</p><p><strong>캐리어 모형:</strong> 표면층의 도너 이온화와 전하 중성 조건으로 n, p를 구하고, 격자·불순물 산란을 포함하는 Arora 이동도 모형을 사용합니다. 250–500 K 밖의 이동도는 교육용 외삽이며, 불순물 밴드·밴드갭 축소·축퇴 효과와 중성 불순물·표면 산란은 생략합니다. 그래프는 실측값이 아니며 온도 안정화 시간도 축약했습니다. 이 조건에서는 800 K의 진성 캐리어 농도가 약 7.1×10¹⁶ cm⁻³로 도너 농도보다 큽니다. 전자·정공 농도 증가가 이동도 감소보다 크게 작용해, 500 K보다 전도도가 커지고 면저항은 작아집니다.</p><p><a href="https://www.ioffe.ru/SVA/NSM/Semicond/Si/bandstr.html" target="_blank" rel="noreferrer">실리콘 밴드 파라미터</a> · <a href="https://doc.comsol.com/6.3/doc/com.comsol.help.semicond/semicond_ug_semiconductor.6.17.html" target="_blank" rel="noreferrer">Arora 이동도 모형</a> · <a href="https://www.tek.com/en/documents/application-note/resistivity-measurements-using-model-2450-sourcemeter-smu-instrument-and-f" target="_blank" rel="noreferrer">4점 프로브 측정 원리</a></p></details>
 </section>;
}
