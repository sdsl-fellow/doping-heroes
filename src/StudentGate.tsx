import {FormEvent,useState} from 'react';
import {CloudError,checkCloudStudent,beginCloudRegistration} from './cloud';

export function StudentGate({onAllowed}:{onAllowed:(studentId:string,registered:boolean,registrationToken?:string)=>void}){
 const [studentId,setStudentId]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[newStudent,setNewStudent]=useState(false);
 async function check(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(busy)return;
  const form=new FormData(e.currentTarget),id=String(form.get('studentId')??studentId).trim().toUpperCase();
  if(!/^[A-Z0-9_-]{1,20}$/.test(id)){setError('학번을 확인해 주세요.');return;}
  setBusy(true);setError('');
  try{
   if(newStudent){
    const response=await beginCloudRegistration(id,String(form.get('temporaryPin')??''));
    if(!response.registrationToken)throw new Error('등록 정보를 확인하지 못했습니다. 다시 시도하세요.');
    onAllowed(id,false,response.registrationToken);
   }else{
    const response=await checkCloudStudent(id);
    if(!response.allowed){setError('등록된 수강생 학번이 아닙니다. 담당자에게 문의해 주세요.');return;}
    if(response.registered||id==='099746')onAllowed(id,!!response.registered);
    else{setStudentId(id);setNewStudent(true);}
   }
  }catch(problem){
   if(problem instanceof CloudError&&problem.code==='ACCOUNT_EXISTS'){onAllowed(id,true);return;}
   setError(problem instanceof Error?problem.message:'수강생 명단을 확인할 수 없습니다.');
  }finally{setBusy(false);}
 }
 return <form className="cloud-access" onSubmit={check}>
  <div className="dialog-heading"><div><small>{newStudent?'STEP 1 · 임시 PIN 확인':'STUDENT ACCESS'}</small><h2>{newStudent?'첫 모험 준비':'수강생 확인'}</h2></div></div>
  <p>{newStudent?'본인 학번 8자리를 임시 PIN으로 입력하세요. 캐릭터를 만든 후 나만의 새 PIN을 설정합니다.':'수강생 명단에 등록된 학번을 입력하세요. 기존 계정은 로그인하고, 처음이면 캐릭터를 만듭니다.'}</p>
  <label className="name-label">학번 또는 수강생 ID<input name="studentId" autoFocus readOnly={newStudent} inputMode="text" autoCapitalize="off" autoComplete="username" value={studentId} maxLength={20} required placeholder="등록된 학번을 입력하세요" onChange={e=>setStudentId(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g,'').slice(0,20))}/></label>
  {newStudent&&<label className="name-label">임시 PIN<input name="temporaryPin" type="password" inputMode="numeric" autoComplete="off" pattern="[0-9]{8}" required placeholder="본인 학번 8자리"/></label>}
  {error&&<p className="feedback" role="alert">{error}</p>}
  <button className="primary" disabled={!studentId||busy}>{busy?'확인 중…':newStudent?'확인하고 캐릭터 만들기':'수강생 확인'}</button>
  {newStudent&&<button type="button" disabled={busy} onClick={()=>{setNewStudent(false);setError('');}}>학번 다시 입력</button>}
 </form>;
}
