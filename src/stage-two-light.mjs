// A qualitative 300 K, variable-thickness model of intrinsic interband absorption.
// Surface reflection, impurity/phonon absorption and measured alpha(E) are omitted.
export const PLANCK_EV_PER_THZ=0.004135667696;
export const materials=[
 {id:'Si',name:'실리콘',gap:1.12,type:'indirect'},
 {id:'Ge',name:'저마늄',gap:0.66,type:'indirect'},
 {id:'GaAs',name:'갈륨비소',gap:1.42,type:'direct'}
];

export function lightResult(material,frequencyTHz,thicknessUm=100){
 const energy=frequencyTHz*PLANCK_EV_PER_THZ;
 const wavelength=299792.458/frequencyTHz; // nm, with frequency in THz
 const above=Math.max(0,energy-material.gap);
 // Calibrated only to preserve the previous qualitative model at 100 µm.
 const alpha=(material.type==='direct'?3.8*Math.sqrt(above):1.8*above*above)*100; // cm^-1
 const opticalDepth=alpha*thicknessUm*1e-4; // µm to cm
 const absorbed=1-Math.exp(-opticalDepth);
 return {energy,wavelength,alpha,opticalDepth,absorbed,transmitted:Math.exp(-opticalDepth),excited:above>0};
}

export function correctBandGap(material,input){
 const value=Number(String(input).trim().replace(',','.'));
 return String(input).trim()!==''&&Number.isFinite(value)&&Math.abs(value-material.gap)<=0.025;
}
