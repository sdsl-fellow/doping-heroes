import {useEffect,useRef,useState} from 'react';
import type {ContentData,ContentRequest} from './LearningContent';
import './numeric-quiz.css';

type Props={load:(refresh?:boolean)=>Promise<ContentData>;request:ContentRequest;answered:string[];onSolved:(id:string)=>void;onComplete?:(result:ContentData)=>void;onBusy:(busy:boolean)=>void;practice?:boolean};

export function StageLearningQuiz({load,request,answered,onSolved,onComplete,onBusy,practice=false}:Props){
 const [batch,setBatch]=useState<ContentData|null>(null),[index,setIndex]=useState(0),[choice,setChoice]=useState(''),[feedback,setFeedback]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[retry,setRetry]=useState(0);
 const pending=useRef(false),loadRef=useRef(load);loadRef.current=load;
 useEffect(()=>{let alive=true;setBusy(true);onBusy(true);setError('');
  loadRef.current(retry>0).then(data=>{
   if(!data.questions?.length||data.questions.some(q=>!q.sessionId||!q.questionId||(q.questionType==='numeric'?!q.answerUnit||!Number.isInteger(q.answerScale):!q.options)))throw new Error('스테이지 문제를 준비하지 못했습니다.');
   if(alive){setBatch(data);setIndex(Math.max(0,data.questions.findIndex(q=>!answered.includes(q.questionId!))));}
  }).catch(e=>{if(alive)setError(e instanceof Error?e.message:'서버 연결 오류');}).finally(()=>{if(alive){setBusy(false);onBusy(false);}});
  return()=>{alive=false;onBusy(false);};
 },[retry]);
 const questions=batch?.questions??[],q=questions[index],solved=q?.questionId?answered.includes(q.questionId):false;
 const check=async()=>{
  if(!q?.sessionId||!choice||pending.current||solved)return;
  if(q.questionType==='numeric'&&!/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(choice.trim())){setError('지수와 단위를 제외한 숫자만 입력해주세요.');return;}
  pending.current=true;setBusy(true);onBusy(true);setError('');
  try{const result=await request('learningAnswer',{sessionId:q.sessionId,...(q.questionType==='numeric'?{numericValue:choice.trim()}:{optionId:choice})});
   setFeedback(result.explanation??'');
   if(result.correct&&q.questionId){onSolved(q.questionId);if(result.stageComplete&&!practice)onComplete?.(result);}
  }catch(e){setError(e instanceof Error?e.message:'통신 오류');}
  finally{pending.current=false;setBusy(false);onBusy(false);}
 };
 const move=(i:number)=>{setIndex(i);setChoice('');setFeedback('');setError('');};
 return <section>
  {questions.length>0&&<>
   <p>스테이지 퀴즈 · {answered.filter(id=>questions.some(q=>q.questionId===id)).length}/{questions.length}문제 정답{practice?' · 복습 보상 없음':''}</p>
   <div className="choices" aria-label="스테이지 문제 선택">{questions.map((item,i)=><button key={item.questionId} disabled={busy} aria-pressed={i===index} onClick={()=>move(i)}>{answered.includes(item.questionId!)?'✓ ':''}문제 {i+1}</button>)}</div>
   {q&&<><h3>{q.title}</h3>{q.questionType==='numeric'&&<p className="numeric-quiz-instruction">{q.commonInstruction}</p>}<p className="question">{q.question}</p>
    {q.questionType==='numeric'?<label className="numeric-quiz-answer"><span>계산 결과</span><input type="text" inputMode="decimal" autoComplete="off" value={choice} disabled={busy||solved} placeholder="예: 6.78" onChange={e=>{setChoice(e.target.value);setFeedback('');setError('');}}/><span>×10<sup>{q.answerScale}</sup> {q.answerUnit}</span></label>:<div className="answers">{q.options?.map((option,i)=><button key={option.id} disabled={busy||solved} aria-pressed={choice===option.id} onClick={()=>{setChoice(option.id);setFeedback('');}}><b>{i+1}</b>{option.text}</button>)}</div>}
    <button className="primary" disabled={busy||!choice||solved} onClick={()=>void check()}>{busy?'서버 확인 중…':solved?'정답입니다':'정답 확인'}</button>
    {feedback&&<p role="status">{feedback}</p>}
    {solved&&index<questions.length-1&&<button onClick={()=>move(index+1)}>다음 문제</button>}
   </>}
  </>}
  {busy&&!batch&&<p role="status">스테이지 문제를 불러오고 있습니다…</p>}
  {error&&<><p role="alert">{error}</p><button disabled={busy} onClick={()=>setRetry(n=>n+1)}>문제 다시 불러오기</button></>}
 </section>;
}
