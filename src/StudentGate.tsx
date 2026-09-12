import {FormEvent,useState} from 'react';
import {checkCloudStudent} from './cloud';

export function StudentGate({onAllowed}:{onAllowed:(studentId:string)=>void}){
 const [studentId,setStudentId]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const valid=/^\d{8}$/.test(studentId)||studentId==='099746';
 async function check(e:FormEvent){
  e.preventDefault();if(!valid||busy)return;setBusy(true);setError('');
  try{const response=await checkCloudStudent(studentId);if(!response.allowed){setError('등록된 수강생 학번이 아닙니다. 담당자에게 문의해 주세요.');return;}onAllowed(studentId);}
  catch(problem){setError(problem instanceof Error?problem.message:'수강생 명단을 확인할 수 없습니다.');}
  finally{setBusy(false);}
 }
 return <form className="cloud-access" onSubmit={check}>
  <div className="dialog-heading"><div><small>STUDENT ACCESS</small><h2>수강생 확인</h2></div></div>
  <p>Google Sheets 수강생 명단에 등록된 학번만 캐릭터를 만들고 게임을 시작할 수 있습니다.</p>
  <label className="name-label">학번<input autoFocus inputMode="numeric" autoComplete="username" value={studentId} maxLength={8} required placeholder="학번을 입력하세요" onChange={e=>setStudentId(e.target.value.replace(/[^0-9]/g,'').slice(0,8))}/></label>
  {error&&<p className="feedback" role="alert">{error}</p>}
  <button className="primary" disabled={!valid||busy}>{busy?'명단 확인 중…':'수강생 확인'}</button>
 </form>;
}
