import {useRef,useState} from 'react';
import type {TranslationRound,TranslationRequest} from './translation-types';
import {scientific} from './progression.mjs';
import './translation-quiz.css';
export function TranslationQuiz({request,onBusy}:{request:TranslationRequest;onBusy:(value:boolean)=>void}){
 const [round,setRound]=useState<TranslationRound|null>(null),[index,setIndex]=useState(0),[selected,setSelected]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const pending=useRef(false),roundId=useRef('');
 const run=async(work:()=>Promise<void>)=>{if(pending.current)return;pending.current=true;setBusy(true);onBusy(true);setError('');try{await work();}catch(e){setError(e instanceof Error?e.message:'연결을 확인하고 다시 시도하세요.');}finally{pending.current=false;setBusy(false);onBusy(false);}};
 const start=()=>void run(async()=>{if(!roundId.current)roundId.current=crypto.randomUUID();const next=await request('translationStart',{roundId:roundId.current});setRound(next);setIndex(0);setSelected('');roundId.current='';});
 const q=round?.questions[index],result=q?round?.results[q.id]:undefined,finished=!!round&&index>=round.questions.length;
 return <section className="translation-quiz" aria-busy={busy}>
  <p>영문을 읽고 올바른 한국어 뜻을 고르세요. 매회 5문제와 보기 순서가 무작위로 정해집니다.</p>
  {!round&&<><p>문제별 최초 정답은 기본 경험치·코인, 이후 정답은 기본 보상의 1/10을 받습니다. 오답에는 보상이 없습니다.</p><button className="primary" disabled={busy} onClick={start}>{busy?'문제를 준비하고 있습니다…':'5문제 시작'}</button></>}
  {q&&<><div className="translation-meta"><span>{index+1} / {round!.questions.length} · {q.kind==='term'?'용어':'문장'} 번역</span><small>문제 {q.id}</small></div><blockquote lang="en">{q.english}</blockquote><div className="translation-options">{q.options.map((o,i)=><button key={o.id} disabled={busy||!!result} aria-pressed={selected===o.id} className={result?(o.id===result.correctOption?'translation-correct':o.id===result.selected?'translation-wrong':''):selected===o.id?'translation-selected':''} onClick={()=>setSelected(o.id)}><b>{i+1}</b><span>{o.text}</span></button>)}</div>
   {!result&&<button className="primary" disabled={busy||!selected} onClick={()=>void run(async()=>setRound(await request('translationAnswer',{roundId:round!.id,questionId:q.id,optionId:selected})))}>{busy?'정답 확인 및 저장 중…':'정답 확인'}</button>}
   {result&&<div className="translation-feedback" role="status"><strong>{result.correct?'정답입니다!':'정답을 확인해 보세요.'}</strong><p>정답: {result.correctText}</p><p>{result.explanation}</p><p>{result.correct?`${result.repeat?'복습':'최초 정답'} 보상 · 도핑 +${scientific(result.dose)} cm⁻³ · ${result.coins}코인`:'보상 없음 · 다음 회차에서 다시 도전할 수 있습니다.'}</p><small>출처: {result.sourceTitle} · p. {result.sourcePage}</small><button className="primary" disabled={busy} onClick={()=>{setIndex(i=>i+1);setSelected('');}}>{index===round!.questions.length-1?'결과 보기':'다음 문제'}</button></div>}
  </>}
  {finished&&<><h3>5문제 완료</h3><p>정답 {Object.values(round!.results).filter(r=>r.correct).length} / 5 · 획득 {Object.values(round!.results).reduce((n,r)=>n+r.coins,0)}코인</p><p>{round!.storageMode==='student-question'?'학생별·문제별 누적 기록과 보상이 저장되었습니다.':'학습 기록과 보상은 서버에 저장되었습니다.'}</p><button className="primary" disabled={busy} onClick={start}>{busy?'다음 회차 준비 중…':'새로운 5문제 도전'}</button></>}
  {error&&<p className="translation-error" role="alert">{error}</p>}
  {busy&&<p role="status">서버 응답을 기다리고 있습니다. 같은 요청을 다시 제출해도 보상은 한 번만 지급됩니다.</p>}
 </section>;
}
