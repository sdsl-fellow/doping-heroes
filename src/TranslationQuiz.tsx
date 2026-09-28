import {useRef,useState} from 'react';
import type {TranslationRound,TranslationRequest} from './translation-types';
import {scientific} from './progression.mjs';
import './translation-quiz.css';

export function TranslationQuiz({request,onBusy}:{request:TranslationRequest;onBusy:(value:boolean)=>void}){
 const [question,setQuestion]=useState<TranslationRound|null>(null),[selected,setSelected]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const pending=useRef(false);
 const run=async(work:()=>Promise<void>)=>{
  if(pending.current)return;
  pending.current=true;setBusy(true);onBusy(true);setError('');
  try{await work();}
  catch(e){const message=e instanceof Error?e.message:'연결을 확인하고 다시 시도하세요.';if(message.includes('만료')||message.includes('변경'))setQuestion(null);setError(message);}
  finally{pending.current=false;setBusy(false);onBusy(false);}
 };
 const start=()=>void run(async()=>{const next=await request('translationStart',{});setQuestion(next);setSelected('');});
 const q=question?.question,result=question?.result;
 return <section className="translation-quiz" aria-busy={busy}>
  <p>영문을 읽고 올바른 한국어 뜻을 고르세요. 한 문항씩 풀고, 처음 맞힌 문항에만 도핑과 코인을 받습니다.</p>
  {!q&&<button className="primary" disabled={busy} onClick={start}>{busy?'문제를 준비하고 있습니다…':'문제 시작'}</button>}
  {q&&<><div className="translation-meta"><span>{q.kind==='term'?'용어':'문장'} 번역{question.review?' · 복습 문제':''}</span><small>문제 {q.id}</small></div><blockquote lang="en">{q.english}</blockquote><div className="translation-options">{q.options.map((o,i)=><button key={o.id} disabled={busy||!!result} aria-pressed={selected===o.id} className={result?(o.id===result.correctOption?'translation-correct':o.id===result.selected?'translation-wrong':''):selected===o.id?'translation-selected':''} onClick={()=>setSelected(o.id)}><b>{i+1}</b><span>{o.text}</span></button>)}</div>
   {!result&&<button className="primary" disabled={busy||!selected} onClick={()=>void run(async()=>{const next=await request('translationAnswer',{questionToken:question.questionToken,optionId:selected});setQuestion({...question,result:next.result});})}>{busy?'정답 확인 및 저장 중…':'정답 확인'}</button>}
   {result&&<div className="translation-feedback" role="status"><strong>{result.correct?'정답입니다!':'정답을 확인해 보세요.'}</strong><p>정답: {result.correctText}</p><p>{result.explanation}</p><p>{result.correct?(result.repeat?'이미 맞힌 문항 · 보상 없는 복습':`최초 정답 보상 · 도핑 +${scientific(result.dose)} cm⁻³ · ${result.coins}코인`):'오답에는 보상이 없습니다. 다음에 다시 도전할 수 있습니다.'}</p><small>출처: {result.sourceId==='SE02-ATOMS-2026'?'[SE] 02. Atoms and Electrons':result.sourceTitle} · p. {result.sourcePage}</small><button className="primary" disabled={busy} onClick={start}>{busy?'다음 문제 준비 중…':'다음 문제'}</button></div>}
  </>}
  {error&&<p className="translation-error" role="alert">{error}</p>}
  {busy&&<p role="status">서버 응답을 기다리고 있습니다. 정답 보상은 문항별로 한 번만 지급됩니다.</p>}
 </section>;
}
