import {useRef,useState,type PointerEvent} from 'react';
import {clusterSites,missingAtoms,projectAtom,siliconBondLengthNm,siliconBondAngleDeg} from './diamond-lattice.mjs';
import './stage-one-experiment.css';

type Point={x:number;y:number};
type Drag={kind:'atom'|'cluster';index:number;offset:Point;fromDone:boolean};
const center={x:250,y:176};
const sites:Point[]=clusterSites.slice(1).map(p=>({x:center.x+p.x*1.5,y:center.y+p.y*1.5}));
const bank:Point[]=[{x:75,y:349},{x:190,y:349},{x:310,y:349},{x:425,y:349}];
// The selected interior atom is off-center within the rendered cube; this socket
// aligns the visible 360 × 270 unit cell with the middle of the right panel.
const socket={x:560,y:165};
const start={x:168,y:190};

function Atom({x,y,outline=false,centerAtom=false,neighbor=false}:{x:number;y:number;outline?:boolean;centerAtom?:boolean;neighbor?:boolean}){
 return <g transform={`translate(${x} ${y})`} className={`${outline?'si-outline':centerAtom?'si-center':'si-atom'}${neighbor?' si-neighbor':''}`}>
  <circle r="24"/><circle r="16" className="si-core"/>
  {!outline&&<text textAnchor="middle" dominantBaseline="central">Si</text>}
 </g>;
}
function Cluster({x,y,angle=0,outline=false,scale=1}:{x:number;y:number;angle?:number;outline?:boolean;scale?:number}){
 return <g transform={`translate(${x} ${y}) rotate(${angle*90}) scale(${scale})`} className={outline?'cluster-outline':'cluster-solid'}>
  {clusterSites.slice(1).map((p,i)=><line key={i} x1="0" y1="0" x2={p.x} y2={p.y}/>)}
  {clusterSites.map((p,i)=><circle key={i} className={outline?'lattice-vacancy':i===0?'lattice-atom':'lattice-atom si-neighbor'} cx={p.x} cy={p.y} r="10"/>)}
 </g>;
}
function DiamondCube({completed}:{completed:boolean}){
 const center=projectAtom(missingAtoms[0]);
 return <g aria-label="면심입방 격자와 1/4, 1/4, 1/4 위치의 Si 원자: 내부 원자마다 정사면체 결합 네 개">
  <image href={completed?'./diamond-cell-complete.png':'./diamond-cell-vacancy.png'} x={socket.x-center.x} y={socket.y-center.y} width="360" height="270" pointerEvents="none"/>
  {!completed&&<Cluster x={socket.x} y={socket.y} outline/>}
 </g>;
}
function AssemblyMeasurements(){
 const a={x:sites[0].x-center.x,y:sites[0].y-center.y};
 const b={x:sites[1].x-center.x,y:sites[1].y-center.y};
 const c={x:sites[2].x-center.x,y:sites[2].y-center.y};
 const unit=(p:Point)=>({x:p.x/Math.hypot(p.x,p.y),y:p.y/Math.hypot(p.x,p.y)});
 const u=unit(a),v=unit(b),w=unit(c),radius=36;
 const tick={x:-u.y*12,y:u.x*12};
 const first={x:center.x+v.x*radius,y:center.y+v.y*radius};
 const last={x:center.x+w.x*radius,y:center.y+w.y*radius};
 const sweep=((Math.atan2(w.y,w.x)-Math.atan2(v.y,v.x)+2*Math.PI)%(2*Math.PI))<Math.PI?1:0;
 return <g className="si-measurements" pointerEvents="none" aria-label={`Si–Si 원자간 거리 ${siliconBondLengthNm.toFixed(3)} 나노미터, 삼차원 결합각 ${siliconBondAngleDeg.toFixed(2)} 도`}>
  <line x1={center.x+tick.x} y1={center.y+tick.y} x2={sites[0].x+tick.x} y2={sites[0].y+tick.y}/>
  <line x1={center.x-tick.x/2} y1={center.y-tick.y/2} x2={center.x+tick.x*1.5} y2={center.y+tick.y*1.5}/>
  <line x1={sites[0].x-tick.x/2} y1={sites[0].y-tick.y/2} x2={sites[0].x+tick.x*1.5} y2={sites[0].y+tick.y*1.5}/>
  <path d={`M${first.x} ${first.y} A${radius} ${radius} 0 0 ${sweep} ${last.x} ${last.y}`}/>
  <text x="105" y="216">{siliconBondLengthNm.toFixed(3)} nm</text>
  <text x="327" y="137">{siliconBondAngleDeg.toFixed(2)}° (3D)</text>
 </g>;
}

export function StageOneExperiment({completed,onComplete}:{completed:boolean;onComplete:()=>void}){
 const [placed,setPlaced]=useState([false,false,false,false]);
 const [used,setUsed]=useState([false,false,false,false]);
 const [phase,setPhase]=useState<'assemble'|'insert'|'done'>('assemble');
 const [dragging,setDragging]=useState<null|{kind:'atom'|'cluster';index:number;at:Point}>(null);
 const [position,setPosition]=useState(start);
 const [angle,setAngle]=useState(1);
 const [hint,setHint]=useState('이웃 Si 원자 4개를 점선 끝에 하나씩 드래그하세요.');
 const svg=useRef<SVGSVGElement>(null),drag=useRef<Drag|null>(null);
 const awarded=useRef(false);
 const point=(e:PointerEvent<SVGSVGElement>):Point=>{
  const ctm=svg.current?.getScreenCTM();if(!ctm)return {x:0,y:0};
  const p=new DOMPoint(e.clientX,e.clientY).matrixTransform(ctm.inverse());return {x:p.x,y:p.y};
 };
 const startDrag=(e:PointerEvent<SVGGElement>,kind:'atom'|'cluster',index:number)=>{
  e.preventDefault();e.stopPropagation();const p=point(e as unknown as PointerEvent<SVGSVGElement>);
  drag.current={kind,index,offset:kind==='cluster'?{x:p.x-position.x,y:p.y-position.y}:{x:0,y:0},fromDone:phase==='done'};
  e.currentTarget.setPointerCapture(e.pointerId);
  if(kind==='cluster'&&phase==='done')setPhase('insert');
  setDragging({kind,index,at:kind==='atom'?p:position});
 };
 const move=(e:PointerEvent<SVGSVGElement>)=>{
  if(!drag.current)return;const p=point(e),{kind,index,offset}=drag.current;
  const at={x:p.x-offset.x,y:p.y-offset.y};setDragging({kind,index,at});
  if(kind==='cluster')setPosition(at);
 };
 const finish=(e:PointerEvent<SVGSVGElement>)=>{
  const current=drag.current;if(!current)return;drag.current=null;
  const p=point(e),at={x:p.x-current.offset.x,y:p.y-current.offset.y};setDragging(null);
  if(current.kind==='atom'){
   const nearest=sites.map((site,i)=>({i,distance:placed[i]?Infinity:Math.hypot(at.x-site.x,at.y-site.y)})).sort((a,b)=>a.distance-b.distance)[0];
   if(!nearest||nearest.distance>44){setHint('비어 있는 점선 원 안에 Si 원자를 놓아주세요.');return;}
   const next=placed.map((yes,i)=>yes||i===nearest.i);setPlaced(next);setUsed(atoms=>atoms.map((yes,i)=>yes||i===current.index));
   if(next.every(Boolean)){setPhase('insert');setHint('완성된 5원자 묶음을 회전해 빈자리 윤곽에 맞춘 뒤 드래그하세요.');}
   else setHint(`결합 ${next.filter(Boolean).length}/4 완성. 다음 원자를 옮겨주세요.`);
   return;
  }
  if(current.fromDone){
   if(Math.hypot(at.x-socket.x,at.y-socket.y)<60){setPosition(socket);setPhase('done');setHint('결정에 다시 끼워졌습니다. 묶음을 왼쪽으로 드래그하면 꺼낼 수 있습니다.');}
   else{setPosition(start);setPhase('insert');setHint('5원자 묶음을 꺼냈습니다. 결정 빈자리로 다시 드래그해 복원할 수 있습니다.');}
   return;
  }
  if(Math.hypot(at.x-socket.x,at.y-socket.y)>40){setPosition(start);setHint('결정 속 점선 윤곽까지 묶음 전체를 옮겨주세요.');return;}
  if(angle!==0){setPosition(start);setHint('위치는 맞았어요. 회전 버튼으로 결합 방향을 맞춘 뒤 다시 끼워주세요.');return;}
  setPosition(socket);setPhase('done');setHint('빠진 5원자 부분을 복원했습니다. 묶음을 왼쪽으로 다시 드래그해 꺼낼 수 있습니다.');
  if(!completed&&!awarded.current){awarded.current=true;onComplete();}
 };
 const reset=()=>{drag.current=null;setDragging(null);setPlaced([false,false,false,false]);setUsed([false,false,false,false]);setPhase('assemble');setPosition(start);setAngle(1);setHint('이웃 Si 원자 4개를 점선 끝에 하나씩 드래그하세요.');};
 return <section className="silicon-experiment">
  <p>중심 Si의 최근접 이웃 네 원자를 결합하고, 완성된 부분을 다이아몬드 입방 격자의 빈자리에 끼워 넣으세요.</p>
  {completed&&<p className="si-record">✓ 이미 완료한 실험입니다. 다시 조립해 볼 수 있습니다.</p>}
  <div className="si-steps" aria-label="실험 단계"><span className={phase==='assemble'?'active':''}>1 · 4개 결합 조립</span><span className={phase==='insert'?'active':''}>2 · 결정 빈자리 복원</span></div>
  {phase==='assemble'?<svg ref={svg} viewBox="0 0 500 400" className="si-board" role="group" aria-label="점선 결합 네 방향과 아래쪽의 드래그 가능한 Si 원자 네 개" onPointerMove={move} onPointerUp={finish} onPointerCancel={()=>{drag.current=null;setDragging(null);}}>
   <defs><radialGradient id="si-gloss" cx="32%" cy="28%" r="75%"><stop offset="0%" stopColor="#fff2ed"/><stop offset="19%" stopColor="#c9424a"/><stop offset="70%" stopColor="#75131d"/><stop offset="100%" stopColor="#23070c"/></radialGradient><radialGradient id="si-orange" cx="32%" cy="28%" r="75%"><stop offset="0%" stopColor="#fff6dd"/><stop offset="20%" stopColor="#ffbc64"/><stop offset="70%" stopColor="#d7701d"/><stop offset="100%" stopColor="#6c2b0c"/></radialGradient></defs>
   <text className="si-caption" x="250" y="38" textAnchor="middle">중심 Si · 점선 끝에 이웃 원자 배치</text>
   {sites.map((p,i)=><g key={i}>
    <line className={placed[i]?'bond-complete':'bond-guide'} x1={center.x} y1={center.y} x2={p.x} y2={p.y}/>
    <Atom x={p.x} y={p.y} outline={!placed[i]} neighbor/>
   </g>)}
   <AssemblyMeasurements/>
   <Atom x={center.x} y={center.y} centerAtom/>
   <text className="si-caption" x="250" y="310" textAnchor="middle">아래 원자를 하나씩 끌어 결합하세요</text>
   {bank.map((p,i)=>!used[i]&&<g key={i} onPointerDown={e=>startDrag(e,'atom',i)} className="si-draggable" aria-label={`${i+1}번째 이웃 Si 원자`}>
    <Atom x={p.x} y={p.y} neighbor/><circle cx={p.x} cy={p.y} r="42" fill="transparent"/>
   </g>)}
   {dragging?.kind==='atom'&&<g className="si-drag-preview" pointerEvents="none"><Atom x={dragging.at.x} y={dragging.at.y} neighbor/></g>}
  </svg>:<svg ref={svg} viewBox="0 0 720 380" className="si-board" role="group" aria-label="왼쪽의 완성된 5원자 묶음을 오른쪽 결정 구조의 점선 빈자리로 옮기거나 복원 뒤 다시 꺼내기" onPointerMove={move} onPointerUp={finish} onPointerCancel={()=>{const wasDone=drag.current?.fromDone;drag.current=null;setDragging(null);setPosition(wasDone?socket:start);if(wasDone)setPhase('done');}}>
   <defs><radialGradient id="si-gloss" cx="32%" cy="28%" r="75%"><stop offset="0%" stopColor="#fff2ed"/><stop offset="19%" stopColor="#c9424a"/><stop offset="70%" stopColor="#75131d"/><stop offset="100%" stopColor="#23070c"/></radialGradient><radialGradient id="si-orange" cx="32%" cy="28%" r="75%"><stop offset="0%" stopColor="#fff6dd"/><stop offset="20%" stopColor="#ffbc64"/><stop offset="70%" stopColor="#d7701d"/><stop offset="100%" stopColor="#6c2b0c"/></radialGradient></defs>
   <text className="si-caption" x="168" y="34" textAnchor="middle">조립한 5원자 묶음</text>
   <text className="si-caption" x="535" y="34" textAnchor="middle">결정의 빈자리</text>
   <path className="si-separator" d="M354 50V327"/>
   <DiamondCube completed={phase==='done'}/>
   <g className="si-draggable" onPointerDown={e=>startDrag(e,'cluster',0)} aria-label={phase==='done'?'복원한 5원자 묶음, 드래그해서 다시 꺼내기':'조립된 5원자 묶음'} tabIndex={0} onKeyDown={e=>{
    if(phase==='done'&&e.key==='Enter'){e.preventDefault();setPhase('insert');setPosition(start);setHint('5원자 묶음을 꺼냈습니다. 다시 결정 빈자리로 옮겨보세요.');return;}
    if(phase==='done')return;
    if(e.key==='ArrowRight'||e.key==='ArrowLeft'||e.key==='ArrowUp'||e.key==='ArrowDown'){
     e.preventDefault();setPosition(p=>({x:p.x+(e.key==='ArrowRight'?20:e.key==='ArrowLeft'?-20:0),y:p.y+(e.key==='ArrowDown'?20:e.key==='ArrowUp'?-20:0)}));
    }else if(e.key==='Enter'){
     e.preventDefault();if(Math.hypot(position.x-socket.x,position.y-socket.y)<40&&angle===0){setPhase('done');setPosition(socket);setHint('빠진 5원자 부분을 복원했습니다. 실험 완료! 다시 드래그해서 꺼낼 수 있습니다.');if(!completed&&!awarded.current){awarded.current=true;onComplete();}}
     else setHint('묶음의 위치와 회전을 점선 윤곽에 맞춰주세요.');
    }
   }}>
    {phase==='insert'&&<Cluster x={position.x} y={position.y} angle={angle} scale={1+0.4*Math.max(0,Math.min(1,(socket.x-position.x)/(socket.x-start.x)))}/>}
    <circle cx={phase==='done'?socket.x:position.x} cy={phase==='done'?socket.y:position.y} r={phase==='done'?85:110} fill="transparent"/>
   </g>
  </svg>}
  {phase==='insert'&&<div className="si-controls"><button type="button" onClick={()=>setAngle(a=>(a+3)%4)}>↶ 왼쪽으로 회전</button><strong>회전 {angle*90}°</strong><button type="button" onClick={()=>setAngle(a=>(a+1)%4)}>↷ 오른쪽으로 회전</button></div>}
  <p className="si-hint" role="status">{hint}</p>
  {phase==='done'&&<button type="button" className="si-extract" onClick={()=>{setPhase('insert');setPosition(start);setHint('5원자 묶음을 꺼냈습니다. 결정 빈자리로 다시 드래그하세요.');}}>5원자 묶음 다시 꺼내기 ↶</button>}
  <p className="si-science">입방 단위격자: 면심입방 위치 + (¼, ¼, ¼) 이동 원자 · Si–Si 최근접 결합 4개 · 3차원 구조를 비스듬히 투영한 모형</p>
  <button type="button" className="si-restart" onClick={reset}>처음부터 다시 조립</button>
 </section>;
}
