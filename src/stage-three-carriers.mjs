import {inventoryIds} from './catalog.mjs';

export const carrierEquipment=[
 {id:'A03',action:'접지 팔찌 착용',purpose:'정전기 방지'},
 {id:'A04',action:'실험 고글 착용',purpose:'눈 보호'},
 {id:'T09',action:'황금 트위져 준비',purpose:'시편 취급'},
 {id:'T06',action:'웨이퍼 시편 배치',purpose:'측정할 실리콘'}
];
export const targetTemperatures=[40,60,150,300,500,800];
// Uniform, electrically active n-type surface sheet on a p-type Si substrate.
// Only the surface sheet conducts in this educational approximation.
export const DONOR_DENSITY=1e16;
export const CHARGE=1.602176634e-19;
export const THICKNESS_CM=1e-5; // 100 nm; not the substrate thickness.
export const PROBE_CURRENT_A=1e-5;
export const SHEET_CORRECTION_FACTOR=1;
export const FOUR_PROBE_FACTOR=Math.PI/Math.log(2);
const KB=8.617333262145e-5;

export function equipmentOwned(save){return inventoryIds(save??{purchased:[],completed:[]});}
export function carrierLabReady(save,prepared){
 const owned=equipmentOwned(save);
 return carrierEquipment.every(item=>owned.includes(item.id)&&prepared.includes(item.id));
}

// Educational nondegenerate, uncompensated n-Si surface-sheet model (40–800 K).
// Ignore substrate leakage, junction/surface depletion and dopant-profile variation.
// Eg(T): Ioffe NSM Si band structure, https://www.ioffe.ru/SVA/NSM/Semicond/Si/bandstr.html
// P donor binding ~45 meV: https://www.nature.com/articles/s41598-017-06296-8
// Arora LI mobility, using ionized donor density; Si parameters from COMSOL:
// https://doc.comsol.com/6.3/doc/com.comsol.help.semicond/semicond_ug_semiconductor.6.17.html
// Outside 250–500 K this is a qualitative extrapolation, not a calibrated fit.
export function carrierMeasurement(temperature){
 const T=Math.max(40,Math.min(800,Number.isFinite(temperature)?temperature:300));
 const gap=1.17-4.73e-4*T*T/(T+636);
 const nc=2.8e19*(T/300)**1.5,nv=1.04e19*(T/300)**1.5;
 const ni=Math.sqrt(nc*nv)*Math.exp(-gap/(2*KB*T));
 const donorFactor=2*Math.exp(.045/(KB*T))/nc;
 // Solve n - ni²/n = Nd/(1 + 2 n exp(Ed/kT)/Nc), in log space.
 let lo=Math.log(ni),hi=Math.log(ni+DONOR_DENSITY);
 for(let i=0;i<100;i++){
  const mid=(lo+hi)/2,n=Math.exp(mid);
  if(n-ni*ni/n-DONOR_DENSITY/(1+donorFactor*n)>0)hi=mid;else lo=mid;
 }
 const n=Math.exp((lo+hi)/2),p=ni*ni/n;
 const ionized= DONOR_DENSITY/(1+donorFactor*n);
 const theta=T/300,alpha=.88*theta**-.146;
 const muN=88*theta**-.57+1252*theta**-2.33/(1+(ionized/(1.26e17*theta**2.4))**alpha);
 const muP=54.3*theta**-.57+407*theta**-2.33/(1+(ionized/(2.35e17*theta**2.4))**alpha);
 const sigma=CHARGE*(n*muN+p*muP),rho=1/sigma;
 // Thin-sheet, equal-spacing 4-probe limit; thickness << probe spacing.
 // https://www.tek.com/en/documents/application-note/resistivity-measurements-using-model-2450-sourcemeter-smu-instrument-and-f
 const sheetResistance=rho/THICKNESS_CM;
 const voltage=PROBE_CURRENT_A*sheetResistance/(FOUR_PROBE_FACTOR*SHEET_CORRECTION_FACTOR);
 const regime=ni>DONOR_DENSITY?'intrinsic':ionized/DONOR_DENSITY<.9?'partial':'extrinsic';
 return {temperature:T,n,p,ni,ionized,muN,muP,gap,sigma,rho,sheetResistance,voltage,regime};
}
export function measurementsComplete(records){
 return targetTemperatures.every(T=>records.some(r=>r.temperature===T));
}
export const carrierQuestions=[
 {id:'cold',question:'60 K → 150 K에서 전자 농도가 증가하는 주된 이유는?',options:[{id:'lattice',text:'실리콘 원자 수가 증가하기 때문'},{id:'ionization',text:'도너가 이온화되어 전자를 공급하기 때문'},{id:'holes',text:'정공이 전자로 바뀌기 때문'}],answer:'ionization',explanation:'저온에서는 도너에 묶여 있던 전자가 열에너지로 전도대에 공급됩니다.'},
 {id:'middle',question:'300 K → 500 K에서 전자 농도는 거의 일정한데 전도도가 감소하는 이유는?',options:[{id:'mobility',text:'격자 산란 증가로 전자 이동도가 감소하기 때문'},{id:'donors',text:'도너 원자가 시편에서 사라지기 때문'},{id:'charge',text:'전자 한 개의 전하량이 작아지기 때문'}],answer:'mobility',explanation:'300–500 K에서는 도너가 거의 모두 이온화되어 전자 농도가 도너 농도에 가깝게 유지됩니다. 격자 산란으로 이동도가 감소하여 전도도가 줄고 면저항은 증가합니다.'},
 {id:'hot',question:'800 K에서 전도도가 500 K보다 다시 커지는 주된 이유는?',options:[{id:'mass',text:'n-type 층 두께가 자동으로 두 배가 되기 때문'},{id:'metal',text:'실리콘이 금속으로 변하기 때문'},{id:'pairs',text:'열적으로 생성되는 전자·정공 농도가 크게 증가하기 때문'}],answer:'pairs',explanation:'800 K의 진성 캐리어 농도는 약 7.1×10¹⁶ cm⁻³로 도너 농도 10¹⁶ cm⁻³보다 큽니다. 전자와 정공의 농도 증가가 이동도 감소를 넘어서 전도도가 다시 커지고 면저항은 감소합니다.'}
];
export function interpretationCorrect(answers){return carrierQuestions.every(q=>answers[q.id]===q.answer);}
export function canCompleteCarrierLab(save,prepared,contacted,records,answers){
 return carrierLabReady(save,prepared)&&contacted&&measurementsComplete(records)&&interpretationCorrect(answers);
}
