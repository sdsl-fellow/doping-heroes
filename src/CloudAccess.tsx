import {FormEvent,useState} from 'react';
import {isRootAccount} from './access.mjs';
import {CloudError,CloudResponse,loginCloud,loginRootCloud,registerCloud,saveCloud} from './cloud';
import type {Save} from './save';

const hasLocalProgress=(save:Save)=>save.character&&Object.keys(save.character).length>0&&(save.completed.length>0||save.purchased.length>0||save.doping>1e13||save.name.length>0);

export function CloudAccess({save,onConnected}:{save:Save;onConnected:(response:CloudResponse)=>void}){
 const root=isRootAccount(save),[pin,setPin]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function connect(e:FormEvent){
  e.preventDefault();if(busy)return;setBusy(true);setError('');
  try{
   let response:CloudResponse;
   if(root){
    response=await loginRootCloud(pin);
    const remote=response.student?.save;
    if(remote&&!remote.character&&hasLocalProgress(save)&&response.token&&response.student){
     response=await saveCloud(response.token,save,response.student.revision);
     response.token=response.token||undefined;
     if(!response.token)response.token=(await loginRootCloud(pin)).token;
    }
   }else{
    try{response=await loginCloud(save.studentId,pin);}
    catch(loginError){
     if(!(loginError instanceof CloudError)||loginError.code!=='INVALID_CREDENTIALS')throw loginError;
     try{response=await registerCloud(save,pin);}
     catch(registerError){
      if(registerError instanceof CloudError&&registerError.code==='ACCOUNT_EXISTS')throw new CloudError('INVALID_CREDENTIALS','이미 등록된 학번입니다. PIN을 확인해 주세요.');
      throw registerError;
     }
    }
   }
   if(!response.token||!response.student)throw new CloudError('INVALID_RESPONSE','로그인 응답에 계정 정보가 없습니다.');
   onConnected(response);
  }catch(problem){setError(problem instanceof Error?problem.message:'클라우드 연결에 실패했습니다.');}
  finally{setBusy(false);}
 }
 return <form className="cloud-access" onSubmit={connect}>
  <div className="dialog-heading"><div><small>CLOUD SAVE</small><h2>{root?'관리자 연결':'진행 기록 연결'}</h2></div></div>
  <p>{root?'설정한 root 관리자 PIN을 입력하세요.':'처음 접속한 학번이면 현재 기록을 등록하고, 등록된 학번이면 저장된 기록을 불러옵니다.'}</p>
  <label className="name-label">{root?'관리자 PIN':'학생 PIN'}<input autoFocus type="password" inputMode="numeric" autoComplete="current-password" value={pin} minLength={root?6:4} maxLength={root?12:8} pattern={root?'[0-9]{6,12}':'[0-9]{4,8}'} required placeholder={root?'숫자 6~12자리':'숫자 4~8자리'} onChange={e=>setPin(e.target.value.replace(/[^0-9]/g,'').slice(0,root?12:8))}/></label>
  {error&&<p className="feedback" role="alert">{error}</p>}
  <button className="primary" disabled={busy||pin.length<(root?6:4)}>{busy?'연결 중…':root?'관리자 로그인':'저장 기록 연결'}</button>
  <small className="cloud-note">PIN은 Google Sheet에 원문으로 저장되지 않습니다.</small>
 </form>;
}
