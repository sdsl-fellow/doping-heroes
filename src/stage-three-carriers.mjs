import {inventoryIds} from './catalog.mjs';

export const carrierEquipment=[
 {id:'A03',action:'접지 팔찌 착용',purpose:'정전기 방지'},
 {id:'A04',action:'실험 고글 착용',purpose:'눈 보호'},
 {id:'T09',action:'황금 트위져 준비',purpose:'시편 취급'},
 {id:'T06',action:'웨이퍼 시편 배치',purpose:'측정할 실리콘'}
];
export const targetTemperatures=[60,150,300,500,800];
export const DONOR_DENSITY=1e15;
export const CHARGE=1.602176634e-19;
export const THICKNESS_CM=.01;
export const PROBE_CURRENT_A=1e-5;
const KB=8.617333262145e-5;

export function equipmentOwned(save){return inventoryIds(save??{purchased:[],completed:[]});}
export function carrierLabReady(save,prepared){
 const owned=equipmentOwned(save);
 return carrierEquipment.every(item=>owned.includes(item.id)&&prepared.includes(item.id));
}

// Educational nondegenerate, uncompensated n-Si equilibrium model (40–800 K).
// Eg(T): Ioffe NSM Si band structure, https://www.ioffe.ru/SVA/NSM/Semicond/Si/bandstr.html
// P donor binding ~45 meV: https://www.nature.com/articles/s41598-017-06296-8
// Mobility coefficients below are illustrative, not a fit to measured wafer data.
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
 const muN=1/(1/(1400*(T/300)**-2.3)+1/(10000*(T/300)**1.5));
 const muP=1/(1/(470*(T/300)**-2.2)+1/(5000*(T/300)**1.5));
 const sigma=CHARGE*(n*muN+p*muP),rho=1/sigma;
 // Thin-sheet, equal-spacing 4-probe limit; thickness << probe spacing.
 // https://www.tek.com/en/documents/application-note/resistivity-measurements-using-model-2450-sourcemeter-smu-instrument-and-f
 const voltage=PROBE_CURRENT_A*Math.log(2)/(Math.PI*THICKNESS_CM*sigma);
 const regime=ionized/DONOR_DENSITY<.9?'freeze':ni>DONOR_DENSITY?'intrinsic':'extrinsic';
 return {temperature:T,n,p,ni,ionized,muN,muP,gap,sigma,rho,voltage,regime};
}
export function measurementsComplete(records){
 return targetTemperatures.every(T=>records.some(r=>r.temperature===T));
}
export const carrierQuestions=[
 {id:'cold',question:'60 K → 150 K에서 전자 농도가 증가하는 주된 이유는?',options:[{id:'lattice',text:'실리콘 원자 수가 증가하기 때문'},{id:'ionization',text:'도너가 이온화되어 전자를 공급하기 때문'},{id:'holes',text:'정공이 전자로 바뀌기 때문'}],answer:'ionization',explanation:'저온에서는 도너에 묶여 있던 전자가 열에너지로 전도대에 공급됩니다.'},
 {id:'middle',question:'150 K → 300 K에서 전자 농도는 거의 일정한데 전도도가 감소하는 이유는?',options:[{id:'mobility',text:'격자 산란 증가로 이동도가 감소하기 때문'},{id:'donors',text:'도너 원자가 시편에서 사라지기 때문'},{id:'charge',text:'전자 한 개의 전하량이 작아지기 때문'}],answer:'mobility',explanation:'외인성 영역에서 도너는 대부분 이온화되어 있습니다. 농도뿐 아니라 이동도도 전도도를 결정합니다.'},
 {id:'hot',question:'800 K에서 전도도가 다시 커지는 주된 이유는?',options:[{id:'mass',text:'웨이퍼 두께가 자동으로 두 배가 되기 때문'},{id:'metal',text:'실리콘이 금속으로 변하기 때문'},{id:'pairs',text:'열적으로 생성되는 전자·정공 농도가 크게 증가하기 때문'}],answer:'pairs',explanation:'고온에서는 진성 캐리어 농도가 커져 전자와 정공 모두 전도에 기여합니다.'}
];
export function interpretationCorrect(answers){return carrierQuestions.every(q=>answers[q.id]===q.answer);}
export function canCompleteCarrierLab(save,prepared,contacted,records,answers){
 return carrierLabReady(save,prepared)&&contacted&&measurementsComplete(records)&&interpretationCorrect(answers);
}
