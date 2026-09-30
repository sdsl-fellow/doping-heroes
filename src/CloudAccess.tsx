import {FormEvent,useEffect,useRef,useState} from 'react';
import {isRootAccount} from './access.mjs';
import {CloudError,CloudResponse,loginCloud,loginRootCloud,registerCloud,saveCloud,changeCloudPin,checkCloudStudent,beginCloudRegistration} from './cloud';
import type {Save} from './save';

const hasLocalProgress=(save:Save)=>save.character&&Object.keys(save.character).length>0&&(save.completed.length>0||save.purchased.length>0||save.doping>1e13||save.name.length>0);

export function CloudAccess({save,studentId,registrationToken,onConnected}:{save?:Save;studentId?:string;registrationToken?:string;onConnected:(response:CloudResponse)=>void}){
 const accountId=save?.studentId??studentId??'';
 const [registering,setRegistering]=useState(!!registrationToken),registrationStarted=useRef(false);
 function accept(response:CloudResponse){
  if(response.mustChangePin&&response.token){setChangeToken(response.token);setPin('');setRegistering(false);return;}
  if(!response.token||!response.student)throw new CloudError('INVALID_RESPONSE','로그인 응답에 계정 정보가 없습니다.');
  onConnected(response);
 }
 async function finishRegistration(){
  if(!save||!registrationToken||busy)return;setBusy(true);setError('');
  try{
   let response:CloudResponse;
   try{response=await registerCloud(save,accountId,registrationToken);}
   catch(problem){if(!(problem instanceof CloudError)||problem.code!=='ACCOUNT_EXISTS')throw problem;response=await loginCloud(accountId,accountId);}
   accept(response);
  }catch(problem){setError(problem instanceof Error?problem.message:'캐릭터 저장에 실패했습니다. 다시 시도하세요.');}
  finally{setBusy(false);}
 }
 useEffect(()=>{if(registering&&!registrationStarted.current){registrationStarted.current=true;void finishRegistration();}},[registering]);
 const [changeToken,setChangeToken]=useState(''),[changed,setChanged]=useState(false);
 const root=isRootAccount(save),[pin,setPin]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function connect(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(busy)return;setBusy(true);setError('');
  const entered=String(new FormData(e.currentTarget).get('pin')??'');
  if(!new RegExp(root?'^[0-9]{6,12}$':'^[0-9]{4,8}$').test(entered)){setError('숫자로 된 PIN을 확인하세요.');setBusy(false);return;}
  try{
   let response:CloudResponse;
   if(root){
    response=await loginRootCloud(entered);
    const remote=response.student?.save;
    if(remote&&!remote.character&&save&&hasLocalProgress(save)&&response.token&&response.student){
     response=await saveCloud(response.token,save,response.student.revision);
     response.token=response.token||undefined;
     if(!response.token)response.token=(await loginRootCloud(entered)).token;
    }
   }else{
    try{response=await loginCloud(accountId,entered);}
    catch(loginError){
     if(!(loginError instanceof CloudError)||loginError.code!=='INVALID_CREDENTIALS')throw loginError;
     if(!save||changed)throw loginError;
     const status=await checkCloudStudent(accountId);
     if(status.registered)throw loginError;
     if(entered!==accountId)throw new CloudError('INVALID_PIN','처음 등록할 때는 본인 학번 8자리를 임시 PIN으로 입력하세요.');
     const ticket=await beginCloudRegistration(accountId,entered);
     if(!ticket.registrationToken)throw new CloudError('INVALID_RESPONSE','등록 정보를 확인하지 못했습니다.');
     response=await registerCloud(save,entered,ticket.registrationToken);
    }
   }
   accept(response);
  }catch(problem){setError(problem instanceof Error?problem.message:'클라우드 연결에 실패했습니다.');}
  finally{setBusy(false);}
 }
 if(registering)return <section className="cloud-access">
  <div className="dialog-heading"><div><small>STEP 2 · 캐릭터 저장</small><h2>모험가 등록</h2></div></div>
  <p role="status">{busy?'캐릭터를 저장하고 있습니다. 잠시 후 새 PIN 설정 화면으로 이동합니다.':'캐릭터 저장을 완료한 후 새 PIN을 설정합니다.'}</p>
  {error&&<p className="feedback" role="alert">{error}</p>}
  <button className="primary" disabled={busy} onClick={()=>void finishRegistration()}>{busy?'저장 중…':'다시 시도'}</button>
  {!busy&&<button onClick={()=>{setRegistering(false);setError('');}}>PIN 입력 화면으로 이동</button>}
 </section>;
 if(changeToken)return <form className="cloud-access pin-setup" onSubmit={async e=>{e.preventDefault();if(busy)return;const form=new FormData(e.currentTarget),a=String(form.get('newPin')??''),b=String(form.get('confirmPin')??'');if(!/^[0-9]{4,8}$/.test(a)||a!==b||a===accountId){setError('학번과 다른 숫자 4~8자리를 두 칸에 동일하게 입력하세요.');return;}setBusy(true);setError('');try{await changeCloudPin(changeToken,a,b);setChangeToken('');setChanged(true);setPin('');}catch(e){setError(e instanceof Error?e.message:'변경 실패');}finally{setBusy(false);}}}>
  <header className="pin-setup-heading">
   <span className="pin-setup-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/></svg></span>
   <div><small>계정 보호</small><h2>새 PIN 설정</h2></div>
  </header>
  <p className="pin-setup-intro">앞으로 로그인할 때 사용할 PIN을 정해 주세요.</p>
  <div className="pin-setup-account"><span>연결할 학번</span><strong>{accountId}</strong></div>
  <input type="hidden" name="username" autoComplete="username" value={accountId}/>
  <div className="pin-setup-fields">
  <label htmlFor="new-pin">새 PIN<input aria-describedby="pin-setup-hint" name="newPin" id="new-pin" type="password" autoComplete="new-password" inputMode="numeric" pattern="[0-9]{4,8}" required placeholder="숫자 4~8자리"/></label>
  <label htmlFor="confirm-pin">새 PIN 확인<input placeholder="한 번 더 입력해 주세요" name="confirmPin" id="confirm-pin" type="password" autoComplete="new-password" inputMode="numeric" pattern="[0-9]{4,8}" required/></label>
  </div>
  <p id="pin-setup-hint" className="pin-setup-hint">학번과 다른 숫자 4~8자리로 설정해 주세요.</p>
  {error&&<p className="pin-setup-error" role="alert">{error}</p>}
  <button className="primary" disabled={busy}>{busy?'저장 중…':'새 PIN 저장하기'}</button>
  <small className="pin-setup-note">저장 후 새 PIN으로 다시 로그인합니다.</small>
 </form>;
 return <form className="cloud-access" onSubmit={connect}>
  <div className="dialog-heading"><div><small>CLOUD SAVE</small><h2>{root?'관리자 연결':'진행 기록 연결'}</h2></div></div>
  <p>{root?'설정한 root 관리자 PIN을 입력하세요.':'PIN이 초기화된 계정은 본인 학번 8자리를 입력하세요. 새 PIN 설정을 마쳤다면 변경한 PIN으로 로그인하세요.'}</p>
  {changed&&<p role="status">PIN 변경 완료. 방금 설정한 새 PIN으로 로그인하세요.</p>}
  <input type="hidden" name="username" autoComplete="username" value={accountId}/>
  <p>학번: {accountId}</p>
  <label className="name-label">{root?'관리자 PIN':'학생 PIN'}<input name="pin" id="login-pin" autoFocus type="password" inputMode="numeric" autoComplete="current-password" value={pin} minLength={root?6:4}  pattern={root?'[0-9]{6,12}':'[0-9]{4,8}'} required placeholder={root?'숫자 6~12자리':'숫자 4~8자리'} onChange={e=>setPin(e.target.value)}/></label>
  {error&&<p className="feedback" role="alert">{error}</p>}
  <button className="primary" disabled={busy}>{busy?'연결 중…':root?'관리자 로그인':'저장 기록 연결'}</button>
  <small className="cloud-note">PIN은 원문으로 저장되지 않습니다.</small>
 </form>;
}
