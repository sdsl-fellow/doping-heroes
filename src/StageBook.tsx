import {bookDose} from './economy.mjs';
import {scientific} from './progression.mjs';
import {useState} from 'react';
import {stageDefinitions} from './maps.mjs';
import {stage1ReadingPages, stage1ReadingSources, type ReadingPage} from './stage1-reading';

// Other stages retain their placeholders until their lecture materials are supplied.
export const lecturePages:ReadingPage[][]=stageDefinitions.map((stage,index)=>index===0?stage1ReadingPages:[
 {title:'핵심 개념',text:`${stage.name} 강의의 핵심 개념이 이 페이지에 들어갈 예정입니다.`,note:'예시 내용 · 실제 강의자료는 추후 추가됩니다.'},
 {title:'주요 식과 그림',text:'중요한 관계식, 기호의 의미, 소자 구조와 설명 그림을 정리할 예정입니다.',note:'지금은 책 열기와 페이지 넘기기를 체험할 수 있습니다.'},
 {title:'생각해 볼 질문',text:'강의를 읽고 스스로 확인할 질문과 핵심 요약을 추가할 예정입니다.',note:'책을 닫으면 탐험하던 자리로 돌아갑니다.'}
]);
export function StageBook({stage,completed,onComplete}:{stage:number;completed:boolean;onComplete:()=>void}){
 const [page,setPage]=useState(0),[sourceId,setSourceId]=useState<string|null>(null);
 const sources=stage===0?stage1ReadingSources:[];
 const selected=sources.find(source=>source.id===sourceId);
 const offset=selected?sources.slice(0,sources.indexOf(selected)).reduce((sum,source)=>sum+source.pages.length,0):0;
 const pages=selected?lecturePages[stage].slice(offset,offset+selected.pages.length):lecturePages[stage];
 const entry=pages[page];
 if(sources.length&&!selected)return <section className="lecture-book" aria-label="낡은 책 자료 목차">
  <p className="book-stage">{stageDefinitions[stage].title}</p>
  <h3>자료 목차</h3><p>읽고 싶은 자료를 선택하세요.</p>
  <div style={{display:'grid',gap:12}}>{sources.map(source=><button key={source.id} style={{width:'100%',textAlign:'left',padding:16,whiteSpace:'normal'}} onClick={()=>{setPage(0);setSourceId(source.id);}}>
   <strong style={{display:'block'}}>{source.label}</strong>
   <span style={{display:'block',marginTop:8,fontSize:14}}>{source.pages.length}장 · {sources.length===1&&completed?'완독 ✓':'읽기'}</span>
  </button>)}</div>
  <p className="book-reward">추가 강의자료가 등록되면 이 목차에 표시됩니다.</p>
 </section>;
 return <section className="lecture-book" aria-label="강의 핵심 내용">
  <p className="book-stage">{stageDefinitions[stage].title}</p>
  {selected&&<button onClick={()=>{setSourceId(null);setPage(0);}}>← 자료 목차</button>}
  <article key={page} className="book-page"><small>{entry.label??'강의 노트 · 임시 내용'}</small><h3>{entry.title}</h3>{entry.text.split('\n\n').map((paragraph,index)=><p key={index}>{paragraph}</p>)}<p style={{whiteSpace:'pre-line',overflowWrap:'anywhere'}}>{entry.note}</p></article>
  <nav aria-label="책 페이지"><button disabled={page===0} onClick={()=>setPage(p=>p-1)}>이전 장</button><span aria-live="polite">{page+1} / {pages.length}</span><button disabled={page===pages.length-1} onClick={()=>setPage(p=>p+1)}>다음 장</button></nav>
  {completed?<p className="book-complete" role="status">✓ 완독 완료 · 이 책의 경험치를 받았습니다.</p>:page===pages.length-1?<button className="primary" onClick={onComplete}>완독하기 · 도핑 경험치 +{scientific(bookDose(stage))} cm⁻³</button>:<p className="book-reward">한 장씩 끝까지 읽으면 도핑 경험치를 받습니다. (책마다 최초 1회)</p>}
 </section>;
}
