import {useEffect,useRef,useState} from 'react';
import {questionsCloud,CloudError} from './cloud';
import {stageDefinitions} from './maps.mjs';
import './questions.css';
type QuestionCategory='일반 질문'|'제안'|'기타';
export type QuestionRecord={id:string;stage:number;category?:QuestionCategory;subject:string;question:string;status:string;createdAt:string;answer:string;answeredBy:string;answeredAt:string};
export type QuestionData={questions:QuestionRecord[];nextCursor:string};
type Props={token:string;studentId:string;onBusy:(busy:boolean)=>void;onBack:()=>void;onList:()=>void};
type Draft={subject:string;question:string;category:QuestionCategory;requestId:string};
const categories:QuestionCategory[]=['일반 질문','제안','기타'];
const emptyDraft=():Draft=>({subject:'',question:'',category:'일반 질문',requestId:''});
function loadDraft(key:string):Draft{try{const d=JSON.parse(sessionStorage.getItem(key)||'null');return d&&typeof d.subject==='string'&&typeof d.question==='string'&&typeof d.requestId==='string'?{subject:d.subject,question:d.question,requestId:d.requestId,category:categories.includes(d.category)?d.category:'일반 질문'}:emptyDraft();}catch{return emptyDraft();}}
const errorText=(e:unknown)=>e instanceof CloudError&&e.code==='TIMEOUT'?'서버 응답이 지연되고 있습니다. 질문은 유지됩니다. 다시 시도해주세요.':e instanceof CloudError&&e.code==='UNKNOWN_ACTION'?'질문 기능 준비 중입니다. 관리자가 Code_v20.gs를 배포해주세요.':e instanceof Error?e.message:'연결을 확인하고 다시 시도해주세요.';
export function AskQuestion({token,studentId,onBusy,onBack,onList}:Props){
 const key='doping-heroes:question-draft:'+studentId;
 const [draft,setDraft]=useState(()=>loadDraft(key)),[busy,setBusy]=useState(false),[error,setError]=useState(''),[sent,setSent]=useState(false);
 const pending=useRef(false);
 useEffect(()=>{try{if(sent)sessionStorage.removeItem(key);else sessionStorage.setItem(key,JSON.stringify(draft));}catch{/* In-memory draft remains usable. */}},[draft,key,sent]);
 const send=async()=>{if(pending.current||!draft.subject.trim()||!draft.question.trim())return;
  const next={...draft,requestId:draft.requestId||crypto.randomUUID()};setDraft(next);pending.current=true;setBusy(true);onBusy(true);setError('');
  try{await questionsCloud('qaCreate',token,next);setSent(true);}catch(e){setError(errorText(e));}finally{pending.current=false;setBusy(false);onBusy(false);}
 };
 return <section className="qa-panel">{sent?<><h3>질문을 등록했습니다.</h3><p>교수·조교가 답변하면 ‘내 질문·답변’에서 확인할 수 있습니다.</p><button className="primary" onClick={onList}>내 질문·답변 보기</button></>:<>
  <p>반도체공학 교과목을 학습하며 궁금한 내용을 남겨주세요. 질문과 답변은 본인과 교수•조교만 확인합니다. 개선을 위한 제안과 응원의 한마디도 환영합니다.</p>
  <form onSubmit={e=>{e.preventDefault();void send();}}>
   <fieldset className="qa-category"><legend>분류</legend><div className="qa-category-options">{categories.map(category=><button type="button" key={category} aria-pressed={draft.category===category} disabled={busy||!!draft.requestId} onClick={()=>setDraft({...draft,category})}>{category}</button>)}</div></fieldset>
   <label>제목<input required maxLength={80} value={draft.subject} disabled={busy||!!draft.requestId} onChange={e=>setDraft({...draft,subject:e.target.value})}/></label>
   <label>질문 내용<textarea required maxLength={2000} rows={6} value={draft.question} disabled={busy||!!draft.requestId} placeholder="어떤 부분이 궁금한지 구체적으로 적어주세요." onChange={e=>setDraft({...draft,question:e.target.value})}/></label>
   <small>{draft.question.length} / 2,000자</small>
   {error&&<p role="alert">{error}</p>}
   {!!draft.requestId&&!busy&&<p>같은 질문으로 다시 전송하면 중복 등록되지 않습니다.</p>}
   <button className="primary" disabled={busy||!draft.subject.trim()||!draft.question.trim()}>{busy?'질문 등록 중…':draft.requestId?'등록 결과 다시 확인':'질문 등록하기'}</button>
  </form>
 </>}<button disabled={busy} onClick={onBack}>Dr. 실리콘 메뉴로</button></section>;
}
export function MyQuestions({token,onBusy,onBack}:Pick<Props,'token'|'onBusy'|'onBack'>){
 const [items,setItems]=useState<QuestionRecord[]>([]),[cursor,setCursor]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[loaded,setLoaded]=useState(false);
 const pending=useRef(false),alive=useRef(true),busyCallback=useRef(onBusy);busyCallback.current=onBusy;
 const load=async(append=false)=>{if(pending.current)return;pending.current=true;setBusy(true);busyCallback.current(true);setError('');
  try{const r=await questionsCloud('qaList',token,{cursor:append?cursor:''});if(!r.qa)throw new Error('질문 목록 응답을 확인하지 못했습니다.');if(alive.current){setItems(prev=>append?[...new Map([...prev,...r.qa!.questions].map(q=>[q.id,q])).values()]:r.qa!.questions);setCursor(r.qa.nextCursor);setLoaded(true);}}
  catch(e){if(alive.current)setError(errorText(e));}finally{pending.current=false;if(alive.current){setBusy(false);busyCallback.current(false);}}
 };
 useEffect(()=>{alive.current=true;void load();return()=>{alive.current=false;busyCallback.current(false);};},[token]);
 return <section className="qa-panel"><p>최근 질문부터 표시합니다. 답변을 확인하려면 새로고침을 눌러주세요.</p><button disabled={busy} onClick={()=>void load()}>새로고침</button>
  {busy&&<p role="status">질문과 답변을 불러오는 중…</p>}{error&&<p role="alert">{error}</p>}
  {loaded&&!items.length&&<p>아직 등록한 질문이 없습니다.</p>}
  {items.map(q=><article className="qa-card" key={q.id}><small>{q.status} · {q.category||'일반 질문'}{q.stage>0&&` · ${stageDefinitions[q.stage-1]?.title||`Stage ${q.stage}`}`}</small><h3>{q.subject}</h3><small>질문 등록: {q.createdAt}</small><p className="qa-text">{q.question}</p>{q.answer?<div className="qa-answer"><strong>{q.answeredBy}의 답변</strong><p className="qa-text">{q.answer}</p>{q.answeredAt&&<small>답변 수정: {q.answeredAt}</small>}</div>:<p>교수·조교의 답변을 기다리고 있습니다.</p>}</article>)}
  {cursor&&<button disabled={busy} onClick={()=>void load(true)}>이전 질문 더 보기</button>}<button disabled={busy} onClick={onBack}>Dr. 실리콘 메뉴로</button>
 </section>;
}
