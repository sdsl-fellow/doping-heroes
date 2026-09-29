import {useEffect,useMemo,useState} from 'react';
import {Avatar} from './Avatar';
import {validCharacter,type Character} from './character';
import {CloudError,fetchCloudRank} from './cloud';
import {conductivity,sigmaLabel} from './progression.mjs';
import './rank.css';

export type RankEntry={rank:number;name:string;doping:number;type:'n'|'p';character:Partial<Character>;isMe:boolean};
export type RankData={entries:RankEntry[];myRank:RankEntry|null;excluded:boolean;total:number;updatedAt:string};
const doseLabel=(n:number)=>n.toExponential(3).replace('e+','e');
export function Rank({token}:{token:string}){
 const [data,setData]=useState<RankData|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(true),[attempt,setAttempt]=useState(0);
 useEffect(()=>{let active=true;setBusy(true);setError('');
  fetchCloudRank(token).then(response=>{if(!response.rank)throw new Error('순위 정보를 불러오지 못했습니다.');if(active)setData(response.rank);})
   .catch(e=>{if(active)setError(e instanceof CloudError&&e.code==='UNKNOWN_ACTION'?'순위 기능을 준비 중입니다. 잠시 후 다시 확인해 주세요.':e instanceof Error?e.message:'순위 정보를 불러오지 못했습니다.');})
   .finally(()=>{if(active)setBusy(false);});return()=>{active=false;};
 },[token,attempt]);
 return <section className="rank-panel" aria-busy={busy}>
  <div className="rank-intro"><span className="rank-preview">관리자 미리보기</span><h3>캐릭터 성장 순위 · TOP 10</h3><p>도핑 농도 순으로 집계하며, 같은 농도는 공동 순위입니다.</p></div>
  {busy&&<p role="status">순위를 불러오는 중…</p>}
  {error&&<div role="alert"><p>{error}</p><button onClick={()=>setAttempt(n=>n+1)} disabled={busy}>다시 시도</button></div>}
  {data&&!busy&&!error&&<>
   {data.entries.length?<div className="rank-list" aria-label="상위 10명">{data.entries.map((entry,index)=><RankRow key={index} entry={entry}/>)}</div>:<p>아직 순위에 표시할 캐릭터가 없습니다.</p>}
   <div className="rank-own"><h3>내 순위</h3>{data.myRank?<RankRow entry={data.myRank}/>:<p>{data.excluded?'관리자 및 순위 제외 계정은 집계되지 않습니다.':'저장된 캐릭터를 확인하면 내 순위가 표시됩니다.'}</p>}</div>
   <footer className="rank-footer"><span>참여 {data.total}명 · 최대 1분 간격으로 갱신</span><time dateTime={data.updatedAt}>{new Date(data.updatedAt).toLocaleTimeString('ko-KR',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit'})} 기준</time></footer>
  </>}
 </section>;
}
function RankRow({entry}:{entry:RankEntry}){
 const character=useMemo(()=>validCharacter(entry.character),[entry.character]);
 return <article className={'rank-row'+(entry.isMe?' rank-me':'')}>
  <strong className={'rank-place'+(entry.rank<=3?' rank-medal':'')}>{entry.rank}<small>위</small></strong>
  <Avatar character={character} size={56}/>
  <div className="rank-person"><strong>{entry.name}{entry.isMe&&<small>나</small>}</strong><span>{entry.type}형 · Lv. {sigmaLabel(conductivity(entry.doping,entry.type))} S/cm</span></div>
  <div className="rank-dose"><strong>{doseLabel(entry.doping)}</strong><small>cm⁻³</small></div>
 </article>;
}
