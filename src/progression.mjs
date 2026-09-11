import curves from './resistivity-data.json' with {type:'json'};
export const MIN_DOPING=1e13,MAX_DOPING=1e21;
export function clampDoping(n){return Math.max(MIN_DOPING,Math.min(MAX_DOPING,Number.isFinite(n)?n:MIN_DOPING));}
// Values digitized from the user-supplied log-log resistivity graph.
// Interpolate log rho against log concentration; rho is in ohm cm.
export function resistivity(concentration,type='n'){
 const exponent=Math.log10(clampDoping(concentration));const points=curves[type==='p'?'p':'n'];
 const i=Math.min(points.length-2,Math.max(0,Math.floor((exponent-13)*10)));
 const [x0,y0]=points[i],[x1,y1]=points[i+1];return 10**(y0+(y1-y0)*(exponent-x0)/(x1-x0));
}
export const conductivity=(n,type='n')=>1/resistivity(n,type);
export function progress(n,type='n'){
 n=clampDoping(n);const exponent=Math.min(21,Math.floor(Math.log10(n)+1e-12));const max=n>=MAX_DOPING;
 const low=10**(max?20:exponent),high=10**(max?21:exponent+1);
 return {n,stage:exponent-12,low,high,fraction:max?1:Math.min(1,(n-low)/(high-low)),max,sigma:conductivity(n,type)};
}
export const addDopants=(n,amount)=>clampDoping(clampDoping(n)+Math.max(0,amount));
export const scientific=n=>n.toExponential(1).replace('.0e','e').replace('e+','e');
export const sigmaLabel=n=>Number(n.toPrecision(3)).toLocaleString('en-US',{maximumSignificantDigits:3});
export const levelLabel=(n,type='n')=>`Lv. ${sigmaLabel(progress(n,type).sigma)} S/cm`;

// Twelve additive rewards follow the visible Stage order, independent of quest IDs.
// Tutorial finishes at 1e14; all twelve quests finish at 95% of the 1e21 cap.
export const STAGE_COMPLETION_DOPING=9.5e20;
export function stageDose(index){
 if(!Number.isInteger(index)||index<0||index>=12)throw new RangeError('Invalid stage index');
 const target=i=>1e14*(STAGE_COMPLETION_DOPING/1e14)**(i/12);
 return target(index+1)-target(index);
}
