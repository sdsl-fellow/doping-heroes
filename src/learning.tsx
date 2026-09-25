import {useState} from 'react';
export const glossary=[
 ['반도체(Semiconductor)','전하 운반자의 농도와 이동을 조절해 전기적 특성을 바꿀 수 있는 물질입니다.'],
 ['전자(Electron)','음전하를 가진 입자입니다. 전도대의 전자는 전류를 운반할 수 있습니다.'],
 ['정공(Hole)','가전자대에서 전자가 비어 있는 상태를 양전하 운반자로 나타낸 것입니다.'],
 ['도핑(Doping)','불순물을 첨가해 반도체의 전하 운반자 농도를 조절하는 과정입니다.'],
 ['도너(Donor)','전자를 제공하는 불순물입니다. 실리콘에서는 인(P)이 대표적입니다.'],
 ['억셉터(Acceptor)','전자를 받아들여 정공을 만드는 불순물입니다. 실리콘에서는 붕소(B)가 대표적입니다.'],
 ['밴드갭(Band gap)','이상 결정의 가전자대와 전도대 사이에 허용 에너지 상태가 없는 구간입니다.'],
 ['이동도(Mobility)','전하 운반자가 전기장에 반응해 얼마나 쉽게 이동하는지를 나타냅니다.'],
 ['전도도(Conductivity)','물질이 전류를 얼마나 잘 전달하는지 나타내는 물성입니다. 비저항의 역수입니다.'],
 ['드리프트(Drift)','전기장에 의해 전하 운반자가 이동하는 현상입니다.'],
 ['확산(Diffusion)','농도 차이로 인해 입자가 순이동하는 현상입니다.'],
 ['공핍층(Depletion region)','이동 가능한 전자와 정공이 주변보다 적은 영역입니다.'],
 ['이온 주입(Ion implantation)','가속한 불순물 이온을 반도체 내부에 넣는 공정입니다.'],
 ['열처리(Annealing)','가열을 통해 주입 손상을 회복하고 도펀트의 전기적 활성화를 돕는 공정입니다.']
];
const faqs=[
 ['n형이면 반도체 전체가 음전하를 띠나요?','보통은 전체적으로 전기적 중성입니다. 전자를 제공한 도너 이온의 양전하와 이동 전자의 음전하를 함께 고려해야 합니다.'],
 ['정공은 실제로 구멍이 뚫린 것인가요?','물리적인 구멍이 아니라 전자가 비어 있는 상태입니다. 주변 전자들이 빈자리를 채우면서 정공이 이동하는 것처럼 표현합니다.'],
 ['불순물을 많이 넣으면 전도도가 무조건 비례해서 커지나요?','전도도에는 운반자 농도뿐 아니라 이동도도 영향을 줍니다. 도핑이 많아지면 산란이 증가할 수 있어 단순 비례하지 않습니다.'],
 ['주입한 뒤 왜 열처리를 하나요?','주입 과정에서 생긴 결정 손상을 회복하고, 불순물이 전기적으로 활성화되도록 돕기 위해서입니다.'],
 ['전도도와 컨덕턴스는 같은가요?','전도도는 물질의 성질로 S/cm 등의 단위를 씁니다. 컨덕턴스는 소자의 길이와 단면적도 반영하며 단위는 S입니다.']
];
export function SiliconLibrary({initialTab='terms'}:{initialTab?:'terms'|'faq'}){const [tab,setTab]=useState(initialTab),[search,setSearch]=useState('');const rows=tab==='terms'?glossary.filter(r=>r.join(' ').toLowerCase().includes(search.toLowerCase())):faqs;return <section><div className="choices"><button aria-pressed={tab==='terms'} onClick={()=>setTab('terms')}>반도체 용어</button><button aria-pressed={tab==='faq'} onClick={()=>setTab('faq')}>궁금한 질문 · FAQ</button></div>{tab==='terms'&&<label>찾아보기<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="도핑, 정공, 전도도…"/></label>}<div className="silicon-library">{rows.map(([title,meaning])=><details key={title}><summary>{title}</summary><p>{meaning}</p></details>)}{!rows.length&&<p>일치하는 항목이 없습니다.</p>}</div></section>;}
export type PracticeQuestion={question:string;options:readonly string[];answer:number;explanation:string};
// Add lecture-based questions here, keyed by the stable quest ID.
export const practiceBank:Record<number,PracticeQuestion[]>={};
export function PracticeBoard({quest}:{quest:PracticeQuestion&{id:number}}){const questions=[quest,...(practiceBank[quest.id]??[])],[index,setIndex]=useState(0),[choice,setChoice]=useState<number|null>(null),[checked,setChecked]=useState(false);const q=questions[index];return <section><p>퀘스트 달성 ✓ · 자유롭게 복습할 수 있어요. 복습은 경험치와 장비를 중복 지급하지 않습니다.</p><h3>{q.question}</h3><div className="answers">{q.options.map((text,i)=><button key={i} aria-pressed={choice===i} onClick={()=>{setChoice(i);setChecked(false);}}>{text}</button>)}</div><button disabled={choice===null} onClick={()=>setChecked(true)}>정답 확인</button>{checked&&<p role="status">{choice===q.answer?'정답입니다!':'다시 생각해 보세요.'} {q.explanation}</p>}<button onClick={()=>{setIndex((index+1)%questions.length);setChoice(null);setChecked(false);}}>{questions.length>1?'다음 문제':'다시 풀기'}</button></section>;}
