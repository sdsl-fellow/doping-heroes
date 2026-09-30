import {useId} from 'react';
import {lightResult} from './stage-two-light.mjs';

type Material={id:string;name:string;gap:number;type:string};
export function OpticalAbsorptionBench({material,frequency,thickness}:{material:Material;frequency:number;thickness:number}){
 const uid=useId().replace(/:/g,'');
 const r=lightResult(material,frequency,thickness);
 const width=12+thickness/500*40;
 const curve=Array.from({length:81},(_,i)=>`${48+i*4.4},${178-125*Math.exp(-r.opticalDepth*i/80)}`).join(' ');
 const color=material.id==='Si'?'#9baabb':material.id==='Ge'?'#918baf':'#b89798';
 return <div className="absorption-bench">
  <svg viewBox="0 0 540 278" role="img" aria-label={`단색광원에서 ${material.id} 시편으로 빛이 입사하고 오른쪽 검출기가 투과광을 측정합니다. 시편 두께 ${thickness} 마이크로미터.`}>
   <defs><linearGradient id={`${uid}-sample`}><stop stopColor="#edf3f5"/><stop offset=".35" stopColor={color}/><stop offset="1" stopColor="#465064"/></linearGradient><marker id={`${uid}-arrow`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 10 5 0 10" fill="#86ddff"/></marker></defs>
   <circle cx="275" cy="83" r="68" fill="#183646" stroke="#7babbc"/>
   <rect x={275-width/2} y="43" width={width} height="79" fill={`url(#${uid}-sample)`} stroke="#d2e2ec"/>
   <path d={`M${275-width/2} 33 H${275+width/2}`} stroke="#86ddff" markerStart={`url(#${uid}-arrow)`} markerEnd={`url(#${uid}-arrow)`}/>
   <text x="275" y="12" textAnchor="middle">시편 확대 · l = {thickness} µm</text>
   <path d="M234 133 H316" stroke="#86ddff" markerEnd={`url(#${uid}-arrow)`}/><text x="324" y="138">x</text>
   <path d="M275 153 V171" stroke="#7babbc" strokeDasharray="3 3"/>
   <text x="77" y="172" textAnchor="middle">단색광원</text>
   <rect x="12" y="181" width="125" height="65" rx="5" fill="#c4d2d9" stroke="#8099ae" strokeWidth="3"/>
   <circle cx="43" cy="213" r="18" fill="#435d70"/><path d="M43 213 L52 200" stroke="#ffe3a4" strokeWidth="3"/>
   <text x="96" y="209" textAnchor="middle" fill="#152a39">λ</text><text x="96" y="231" textAnchor="middle" fill="#152a39">{Math.round(r.wavelength)} nm</text>
   <path d="M142 214 H254" stroke="#ffe3a4" strokeWidth="4" markerEnd={`url(#${uid}-arrow)`}/>
   <text x="197" y="197" textAnchor="middle">I₀ = 1</text>
   <rect x="267" y="180" width="16" height="67" fill={`url(#${uid}-sample)`} stroke="#d2e2ec"/>
   <text x="275" y="260" textAnchor="middle">{material.id}</text>
   <path d="M291 214 H415" stroke="#ffe3a4" strokeWidth="4" opacity={r.transmitted} markerEnd={`url(#${uid}-arrow)`}/>
   <text x="350" y="197" textAnchor="middle">Iₜ</text>
   <rect x="425" y="181" width="103" height="65" rx="5" fill="#c4d2d9" stroke="#8099ae" strokeWidth="3"/>
   <rect x="434" y="193" width="85" height="38" rx="3" fill="#173442"/>
   <text x="477" y="218" textAnchor="middle">{r.transmitted.toExponential(2)}</text>
   <text x="477" y="172" textAnchor="middle">검출기</text>
  </svg>
  <div className="absorption-readout">α ≈ {r.alpha.toFixed(1)} cm⁻¹ <span>교육용 모형 값</span></div>
  <svg viewBox="0 0 440 224" role="img" aria-label="시편 내부 깊이에 따른 상대 광자 플럭스의 지수 감쇠 곡선">
   <text x="48" y="22">상대 광자 플럭스 I(x)/I₀</text>
   {[0,.5,1].map(v=><g key={v}><path d={`M48 ${178-125*v} H400`} stroke="#456676" strokeDasharray="3 5"/><text x="36" y={183-125*v} textAnchor="end">{v}</text></g>)}
   <path d="M48 43 V178 H400" fill="none" stroke="#b5d1da"/>
   <polyline points={curve} fill="none" stroke="#ffd383" strokeWidth="3"/>
   <circle cx="400" cy={178-125*r.transmitted} r="4" fill="#86ddff"/>
   <text x="48" y="199" textAnchor="middle">0</text><text x="224" y="199" textAnchor="middle">{thickness/2}</text><text x="400" y="199" textAnchor="middle">{thickness}</text>
   <text x="224" y="220" textAnchor="middle">시편 내부 깊이 x (µm) · 끝점 x = l</text>
  </svg>
 </div>;
}
