import {useEffect,useRef,useState} from 'react';
import type {ContentData,ContentRequest} from './LearningContent';

// Scoped to this open panel: closing it discards questions and answer feedback.
export function TutorialReview({request,onBusy,onBack}:{request:ContentRequest;onBusy:(v:boolean)=>void;onBack:()=>void}){
 const [questions,setQuestions]=useState<ContentData[]>([]),[index,setIndex]=useState(0),[choices,setChoices]=useState<Record<number,string>>({}),[results,setResults]=useState<Record<number,ContentData>>({}),[busy,setBusy]=useState(true),[error,setError]=useState(''),[reload,setReload]=useState(0);
 const api=useRef(request),pending=useRef(false);api.current=request;
 useEffect(()=>{let alive=true;setBusy(true);onBusy(true);setError('');setQuestions([]);setChoices({});setResults({});setIndex(0);
 api.current('learningStart',{stage:0,kind:'tutorial'}).then(r=>{
  if(!r.questions||r.questions.length!==3||r.questions.some((q,i)=>q.questId!==i||!q.sessionId||!q.options))throw new Error('튜토리얼 3문제를 불러오지 못했습니다.');
  if(alive)setQuestions(r.questions);
 }).catch(e=>{if(alive)setError(e instanceof Error?e.message:'서버 연결 오류');}).finally(()=>{if(alive){setBusy(false);onBusy(false);}});
 return()=>{alive=false;onBusy(false);};},[reload]);
 const q=questions[index],result=results[index],choice=choices[index]||'';
 const answer=async()=>{
  if(!q||!choice||pending.current||result?.correct)return;
  pending.current=true;setBusy(true);onBusy(true);setError('');
  try{const response=await request('learningAnswer',{sessionId:q.sessionId,optionId:choice});setResults(previous=>({...previous,[index]:response}));}
  catch(e){setError(e instanceof Error?e.message:'서버 연결 오류');}
  finally{pending.current=false;setBusy(false);onBusy(false);}
 };
 return <section><p>튜토리얼 복습입니다. 완료 기록과 보상은 변경되지 않습니다.</p>
 <div className="choices" aria-label="튜토리얼 문제 선택">{[0,1,2].map(i=><button key={i} disabled={busy||!questions.length} aria-pressed={index===i} onClick={()=>setIndex(i)}>문제 {i+1}</button>)}</div>
 {q&&<><h3>{q.title}</h3><p className="question">{q.question}</p><div className="answers">{q.options?.map((option,i)=><button key={option.id} disabled={busy||result?.correct} aria-pressed={choice===option.id} onClick={()=>{setChoices(v=>({...v,[index]:option.id}));setResults(v=>{const next={...v};delete next[index];return next;});}}><b>{i+1}</b>{option.text}</button>)}</div><button className="primary" disabled={busy||!choice||result?.correct} onClick={()=>void answer()}>{busy?'서버 확인 중…':result?.correct?'정답입니다':'정답 확인'}</button>{result&&<p role="status">{result.explanation}</p>}</>}
 {busy&&!q&&<p role="status">튜토리얼 3문제를 불러오고 있습니다…</p>}
 {error&&<><p role="alert">{error}</p><button disabled={busy} onClick={()=>setReload(v=>v+1)}>3문제 다시 불러오기</button></>}
 <div className="choices"><button disabled={busy||!questions.length||index===0} onClick={()=>setIndex(i=>i-1)}>이전 문제</button><button disabled={busy||!questions.length} onClick={()=>{if(index<2)setIndex(i=>i+1);else onBack();}}>{index<2?'다음 문제':'Dr. 실리콘 메뉴로'}</button></div>
 </section>;
}
