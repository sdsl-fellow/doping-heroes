import {FormEvent,useState} from 'react';
import {isRootAccount} from './access.mjs';
import {CloudError,CloudResponse,loginCloud,loginRootCloud,registerCloud,saveCloud,changeCloudPin} from './cloud';
import type {Save} from './save';

const hasLocalProgress=(save:Save)=>save.character&&Object.keys(save.character).length>0&&(save.completed.length>0||save.purchased.length>0||save.doping>1e13||save.name.length>0);

export function CloudAccess({save,studentId,onConnected}:{save?:Save;studentId?:string;onConnected:(response:CloudResponse)=>void}){
 const accountId=save?.studentId??studentId??'';
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
     try{response=await registerCloud(save,entered);}
     catch(registerError){
      if(registerError instanceof CloudError&&registerError.code==='ACCOUNT_EXISTS')throw new CloudError('INVALID_CREDENTIALS','이미 등록된 학번입니다. PIN을 확인해 주세요.');
      throw registerError;
     }
    }
   }
   if(response.mustChangePin&&response.token){setChangeToken(response.token);setPin('');return;}
   if(!response.token||!response.student)throw new CloudError('INVALID_RESPONSE','로그인 응답에 계정 정보가 없습니다.');
   onConnected(response);
  }catch(problem){setError(problem instanceof Error?problem.message:'클라우드 연결에 실패했습니다.');}
  finally{setBusy(false);}
 }
 if(changeToken)return <form className="cloud-access" onSubmit={async e=>{e.preventDefault();if(busy)return;const form=new FormData(e.currentTarget),a=String(form.get('newPin')??''),b=String(form.get('confirmPin')??'');if(!/^[0-9]{4,8}$/.test(a)||a!==b||a===accountId){setError('학번과 다른 숫자 4~8자리를 두 칸에 동일하게 입력하세요.');return;}setBusy(true);setError('');try{await changeCloudPin(changeToken,a,b);setChangeToken('');setChanged(true);setPin('');}catch(e){setError(e instanceof Error?e.message:'변경 실패');}finally{setBusy(false);}}}>
  <h2>새 PIN 설정 필수</h2><p>학번 {accountId} · 새 PIN을 설정한 후 게임을 시작할 수 있습니다.</p>
  <input type="hidden" name="username" autoComplete="username" value={accountId}/>
  <label>새 PIN<input name="newPin" id="new-pin" type="password" autoComplete="new-password" inputMode="numeric" pattern="[0-9]{4,8}" required placeholder="숫자 4~8자리"/></label>
  <label>새 PIN 재입력<input name="confirmPin" id="confirm-pin" type="password" autoComplete="new-password" inputMode="numeric" pattern="[0-9]{4,8}" required/></label>
  {error&&<p role="alert">{error}</p>}<button className="primary" disabled={busy}>{busy?'변경 중…':'새 PIN 저장'}</button>
 </form>;
 return <form className="cloud-access" onSubmit={connect}>
  <div className="dialog-heading"><div><small>CLOUD SAVE</small><h2>{root?'관리자 연결':'진행 기록 연결'}</h2></div></div>
  <p>{root?'설정한 root 관리자 PIN을 입력하세요.':'처음 접속한 학번이면 현재 기록을 등록하고, 등록된 학번이면 저장된 기록을 불러옵니다.'}</p>
  {changed&&<p role="status">PIN 변경 완료. 방금 설정한 새 PIN으로 로그인하세요.</p>}
  <input type="hidden" name="username" autoComplete="username" value={accountId}/>
  <p>학번: {accountId}</p>
  <label className="name-label">{root?'관리자 PIN':'학생 PIN'}<input name="pin" id="login-pin" autoFocus type="password" inputMode="numeric" autoComplete="current-password" value={pin} minLength={root?6:4}  pattern={root?'[0-9]{6,12}':'[0-9]{4,8}'} required placeholder={root?'숫자 6~12자리':'숫자 4~8자리'} onChange={e=>setPin(e.target.value)}/></label>
  {error&&<p className="feedback" role="alert">{error}</p>}
  <button className="primary" disabled={busy}>{busy?'연결 중…':root?'관리자 로그인':'저장 기록 연결'}</button>
  <small className="cloud-note">PIN은 Google Sheet에 원문으로 저장되지 않습니다.</small>
 </form>;
}
