import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { World } from './World';
import { quests } from './quests';
import { stages, level } from './physics.mjs';
import './style.css';

type Save={name:string;color:string;completed:number[]};
const colors=['#60d9ff','#9ceda3','#ffb57d','#ceafff'];
const key='doping-heroes:v1';
function restore():Save|null{try{const s=JSON.parse(localStorage.getItem(key)||'null');if(!s||typeof s.name!=='string'||!s.name.trim()||s.name.length>20||!colors.includes(s.color)||!Array.isArray(s.completed))return null;const c=s.completed;if(c.length>3||!c.every((v:unknown,i:number)=>v===i))return null;return s;}catch{return null;}}
function App(){
 const [save,setSave]=useState<Save|null>(restore),[name,setName]=useState(''),[color,setColor]=useState(colors[0]);
 const [dialog,setDialog]=useState<number|null>(null),[started,setStarted]=useState(false),[choice,setChoice]=useState<number|null>(null),[feedback,setFeedback]=useState(''),[reward,setReward]=useState(false),[storageError,setStorageError]=useState(false);
 const [selected,setSelected]=useState(0);
 const completed=save?.completed??[];const current=stages[selected];const q=dialog===null?null:quests[dialog];
 useEffect(()=>{if(save){try{localStorage.setItem(key,JSON.stringify(save));setStorageError(false);}catch{setStorageError(true);}}},[save]);
 useEffect(()=>{
  const context=(document as Document & {modelContext?:{registerTool:(tool:unknown,options:unknown)=>Promise<void>}}).modelContext;
  if(!context)return; const lifecycle=new AbortController();
  Promise.resolve(context.registerTool({name:'read_learning_progress',description:'Read the current local character, completed quests, and conductivity-based level.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>({character:save?.name??null,completed:completed.map(i=>quests[i].title),level:level(completed)})},{signal:lifecycle.signal})).catch(()=>{});
  return()=>lifecycle.abort();
 },[save]);
 const open=(i:number)=>{setDialog(i);setStarted(false);setChoice(null);setFeedback('');setReward(false);};
 const answer=()=>{
  if(!q||dialog===null||choice===null||!save)return;
  if(choice!==q.answer){setFeedback('다시 생각해 보세요. '+(dialog===0?'P의 원자가전자는 몇 개일까요?':dialog===1?'σ = q(nμₙ + pμₚ)를 떠올려 보세요.':'B는 원자가전자가 3개인 억셉터입니다.'));return;}
  setFeedback(q.explanation);setReward(true);setSelected(dialog+1);
  if(!completed.includes(dialog))setSave({...save,completed:[...completed,dialog]});
 };
 return <div className="app">
  <header><a className="brand" href="./"><span className="brand-mark">D<span>H</span></span><span>DOPING HEROES<small>SEMICONDUCTOR QUEST</small></span></a><span className="version">CHAPTER 01 <b>실리콘 연구소</b></span></header>
  <main>
   <section className="play-column">
    <div className="section-top"><div><span className="eyebrow">EXPLORATION</span><h1>실리콘에서 시작하는 모험</h1></div><span className="chapter-count">{completed.length} / 3 <small>퀘스트</small></span></div>
    <div className="game-shell"><div className="map-bar"><span>Si 연구 캠퍼스</span><span>300 K · 입문 과정</span></div><World color={save?.color??color} completed={completed} active={!!save&&dialog===null} onTalk={open}/><div className="game-controls"><span><kbd>WASD</kbd> / 방향키 · 클릭/터치 이동</span><button disabled={!save||dialog!==null} onClick={()=>window.dispatchEvent(new Event('lab-talk'))}>가까운 NPC와 대화 <kbd>E</kbd></button></div></div>
    <div className="quest-list"><div className="section-top"><h2>연구 노트</h2><span>퀘스트는 순서대로 진행</span></div>{quests.map((quest,i)=><button className={'quest-row '+(completed.includes(i)?'done':'')} key={quest.title} disabled={!save} onClick={()=>open(i)}><span className="quest-number">{completed.includes(i)?'✓':`0${i+1}`}</span><span><strong>{quest.title.slice(5)}</strong><small>{quest.name} · {quest.region}</small></span><span className="quest-state">{completed.includes(i)?'완료':i===completed.length?'진행 가능':'잠김'}</span></button>)}</div>
   </section>
   <aside><section className="profile panel"><span className="eyebrow">RESEARCHER</span><div className="profile-line"><div className="avatar" style={{color:save?.color??color}}>◆</div><div><h2>{save?.name??'새로운 연구원'}</h2><span>Lv. {level(completed)} · {completed.length===3?'도핑 탐험가':'반도체 견습생'}</span></div></div><progress value={completed.length} max={3}/><p>{completed.length===3?'첫 연구 과정 완료! 시료별 전도도를 비교해 보세요.':'문제를 해결하고 반도체 시료를 성장시키세요.'}</p></section>
    <section className="panel conductivity"><span className="eyebrow">MATERIAL STATUS</span><h2>나의 반도체 시료</h2><label htmlFor="sample">관찰할 시료</label><select id="sample" value={selected} onChange={e=>setSelected(Number(e.target.value))}><option value={0}>순수 Si · 도핑 전</option>{completed.map(i=><option key={i} value={i+1}>{quests[i].reward}</option>)}</select><div className="sigma"><small>전도도 σ</small><strong>{current.sigma.toExponential(2)}</strong><span>S/cm</span></div><dl><div><dt>전자 농도 n</dt><dd>{current.n.toExponential(2)} <small>cm⁻³</small></dd></div><div><dt>정공 농도 p</dt><dd>{current.p.toExponential(2)} <small>cm⁻³</small></dd></div></dl><div className="equation">σ = q(nμₙ + pμₚ)</div><p className="model-note">300 K · 완전 이온화 · 고정 이동도 근사<br/>μₙ = 1350, μₚ = 480 cm²/(V·s)<br/>nᵢ = 10¹⁰ cm⁻³. 학습용 모델이며 실제 소자 시뮬레이션이 아닙니다.</p></section>
    <section className="panel note"><h2>성장의 기준</h2><p>보유 시료의 최고 전도도가 초기 Si 대비 10배가 될 때마다 레벨이 1 증가합니다. n형과 p형은 독립 시료로 보관합니다.</p></section>
    <p className="save-state" role="status">{storageError?'저장 불가: 브라우저 저장 공간을 확인하세요. 현재 탭에서는 계속 플레이할 수 있습니다.':save?'진행 상황은 이 브라우저에 자동 저장됩니다.':'캐릭터를 생성하면 탐험을 시작합니다.'}<br/>Google Sheets: 아직 연결되지 않음</p>
   </aside>
  </main>
  {!save&&<div className="overlay"><section className="modal welcome" role="dialog" aria-modal="true" aria-labelledby="welcome-title"><span className="eyebrow">NEW RESEARCHER</span><h2 id="welcome-title">연구원 등록</h2><p>작은 불순물이 만드는 큰 변화.<br/>당신의 첫 반도체를 만들어 보세요.</p><form onSubmit={e=>{e.preventDefault();if(name.trim())setSave({name:name.trim(),color,completed:[]});}}><label htmlFor="name">캐릭터 이름</label><input autoFocus id="name" maxLength={20} required value={name} onChange={e=>setName(e.target.value)} placeholder="연구원 이름을 입력하세요"/><fieldset><legend>캐릭터 색상</legend><div className="colors">{colors.map((c,i)=><label key={c} style={{color:c}}><input type="radio" name="color" aria-label={['하늘색','초록색','주황색','보라색'][i]} checked={color===c} onChange={()=>setColor(c)}/>◆</label>)}</div></fieldset><button className="primary" disabled={!name.trim()}>연구소 입장</button></form><small>로그인 없이 플레이 · 이름은 현재 브라우저에만 저장</small></section></div>}
  {q&&dialog!==null&&<div className="overlay"><section className="modal" role="dialog" aria-modal="true" aria-labelledby="quest-title"><div className="section-top"><span className="eyebrow">{q.name} / QUEST {dialog+1}</span><button className="close" autoFocus aria-label="대화 닫기" onClick={()=>setDialog(null)}>닫기 ×</button></div><h2 id="quest-title">{q.title}</h2>{dialog>completed.length?<><p>이전 퀘스트를 먼저 완료해 주세요.</p><button className="primary" onClick={()=>setDialog(null)}>연구소로 돌아가기</button></>:completed.includes(dialog)&&!reward?<><p>실험을 완료했습니다.</p><p>{q.explanation}</p><button className="primary" onClick={()=>{setSelected(dialog+1);setDialog(null);}}>시료 관찰하기</button></>:!started?<><p>“{q.question} 함께 실험으로 알아봅시다.”</p><div className="reward-tag">실험 보상: {q.reward}</div><button className="primary" onClick={()=>setStarted(true)}>퀘스트 수락</button></>:<><p className="question">{q.question}</p><div className="answers">{q.options.map((o,i)=><button disabled={reward} aria-pressed={choice===i} className={choice===i?'chosen':''} key={o} onClick={()=>{setChoice(i);setFeedback('');}}><span>{i+1}</span>{o}</button>)}</div>{feedback&&<p className={reward?'feedback success':'feedback'} role="status">{reward?'정답! ':''}{feedback}</p>}{reward?<><div className="doping" aria-label="Si 자리 하나를 도펀트가 치환하는 개념 애니메이션"><div className="lattice">{Array.from({length:12},(_,i)=><span key={i} className={i===5?'dopant':''}>{i===5?q.dopant:'Si'}</span>)}</div><p>{q.reward}<br/><strong>시료 저장 완료 · Lv. {level(completed)}</strong></p></div><small>결정구조를 단순화한 개념도 · 실제 원자 비율/축척과 다름</small><button className="primary" onClick={()=>setDialog(null)}>탐험 계속하기</button></>:<button className="primary" disabled={choice===null} onClick={answer}>정답 확인</button>}</>}</section></div>}
  <footer>DOPING HEROES · 0.1.0 <span>Learn the physics. Change the material.</span></footer>
 </div>;
}
createRoot(document.getElementById('root')!).render(<App/>);
