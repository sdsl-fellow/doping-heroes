import test from 'node:test';
import assert from 'node:assert/strict';
import {carrierMeasurement,DONOR_DENSITY,CHARGE,THICKNESS_CM,PROBE_CURRENT_A,SHEET_CORRECTION_FACTOR,FOUR_PROBE_FACTOR,carrierEquipment,carrierLabReady,targetTemperatures,canCompleteCarrierLab,carrierQuestions} from '../src/stage-three-carriers.mjs';
import {missingStageExperiments} from '../src/stage-experiments.mjs';
import {grantReward} from '../src/economy.mjs';
import {recordStageQuiz,stageQuizDone} from '../src/stage-activity.mjs';
import {stageDefinitions} from '../src/maps.mjs';
import {stageProps} from '../src/stage-props.mjs';
import {route,clearSegment} from '../src/navigation.mjs';

const ids=carrierEquipment.map(item=>item.id);
const initial=()=>({studentId:'20260001',name:'학생',character:{accessory:'A03'},purchased:[...ids],completed:[0,1,2,3,4],puzzle_completed:[],doping:1e15,coins:15});
test('Stage 3 requires all four owned AND prepared items, without accessory-slot conflict or consumption',()=>{
 const s=initial(),before=JSON.stringify(s);
 assert.equal(carrierLabReady(s,ids),true);
 for(const id of ids){
  assert.equal(carrierLabReady({...s,purchased:ids.filter(x=>x!==id)},ids),false);
  assert.equal(carrierLabReady(s,ids.filter(x=>x!==id)),false);
 }
 assert.equal(JSON.stringify(s),before);
});
test('carrier model obeys charge neutrality, mass action, and conductivity throughout temperature sweep',()=>{
 assert.equal(DONOR_DENSITY,1e16);
 assert.ok(Math.abs(THICKNESS_CM-100*1e-7)<1e-20);
 assert.equal(SHEET_CORRECTION_FACTOR,1);
 for(let T=40;T<=800;T+=10){
  const r=carrierMeasurement(T);
  for(const k of ['n','p','ni','muN','muP','sigma','rho','sheetResistance','voltage','gap'])assert.ok(Number.isFinite(r[k])&&r[k]>0,k+' at '+T);
  assert.ok(Math.abs(r.n-r.p-r.ionized)/Math.max(r.n,DONOR_DENSITY)<1e-12);
  assert.ok(Math.abs(r.n*r.p/r.ni**2-1)<1e-12);
  assert.ok(r.ionized<=DONOR_DENSITY);
  assert.equal(r.sigma,CHARGE*(r.n*r.muN+r.p*r.muP));
  const inferredRho=Math.PI/Math.log(2)*THICKNESS_CM*r.voltage/PROBE_CURRENT_A;
  assert.ok(Math.abs(inferredRho/r.rho-1)<1e-12);
  const inferredSheet=FOUR_PROBE_FACTOR*r.voltage/PROBE_CURRENT_A*SHEET_CORRECTION_FACTOR;
  assert.ok(Math.abs(inferredSheet/r.sheetResistance-1)<1e-12);
  assert.ok(Math.abs(r.sheetResistance*THICKNESS_CM*r.sigma-1)<1e-12);
  assert.ok(r.sigma>=.1&&r.sigma<=100,'within displayed log-axis at '+T);
 }
 const cold=carrierMeasurement(60),middle=carrierMeasurement(150),room=carrierMeasurement(300),warm=carrierMeasurement(500),hot=carrierMeasurement(800);
 assert.equal(cold.regime,'partial');assert.equal(room.regime,'extrinsic');assert.equal(hot.regime,'intrinsic');
 assert.ok(cold.n<middle.n);
 assert.ok(Math.abs(warm.n/room.n-1)<.01&&warm.muN<room.muN&&warm.sigma<room.sigma);
 assert.ok(hot.ni>DONOR_DENSITY&&hot.n>warm.n&&hot.p>warm.p&&hot.sigma>warm.sigma&&hot.sheetResistance<warm.sheetResistance);
 assert.ok(hot.sigma/warm.sigma>4);
 // At 10¹⁶ cm⁻³ the 300 K mobility is near the low-doping Si value.
 assert.ok(room.muN>1200&&room.muN<1250);
 assert.equal(carrierMeasurement(NaN).temperature,300);
});
test('completion requires prepared equipment, probe contact, six distinct measurements including 40 K and correct interpretation',()=>{
 assert.deepEqual(targetTemperatures,[40,60,150,300,500,800]);
 const records=targetTemperatures.map(carrierMeasurement),answers=Object.fromEntries(carrierQuestions.map(q=>[q.id,q.answer])),s=initial();
 assert.equal(canCompleteCarrierLab(s,ids,true,records,answers),true);
 assert.equal(canCompleteCarrierLab(s,ids,false,records,answers),false);
 assert.equal(canCompleteCarrierLab(s,ids,true,records.slice(1),answers),false);
 assert.equal(canCompleteCarrierLab(s,ids,true,Array(6).fill(records[0]),answers),false);
 assert.equal(canCompleteCarrierLab(s,ids,true,records,{...answers,hot:'metal'}),false);
 assert.equal(canCompleteCarrierLab({...s,purchased:[]},ids,true,records,answers),false);
});
test('Stage 3 experiment is reachable; either activity order preserves progress and grants clear reward once',()=>{
 const point=stageProps[2].experiment;
 const path=route(768,210,point.x,point.y,'stage-3');assert.deepEqual(path.at(-1),point);
 let prev={x:768,y:210};for(const p of path){assert.ok(clearSegment(prev,p,'stage-3'));prev=p;}
 const quest={id:stageDefinitions[2].questId,dose:1e15,coins:30};
 for(const first of ['quiz','experiment']){
  let s=initial();
  assert.deepEqual(missingStageExperiments(s,2),[2]);
  if(first==='quiz'){
   s=recordStageQuiz(s,2,quest);assert.equal(grantReward(s,quest),s);
   s={...s,puzzle_completed:[2]};
  }else{
   s={...s,puzzle_completed:[2]};assert.equal(stageQuizDone(s,2),false);assert.equal(s.coins,15);
   s=recordStageQuiz(s,2,quest);
  }
  assert.equal(stageQuizDone(s,2),true);assert.deepEqual(missingStageExperiments(s,2),[]);
  const done=grantReward(s,quest,()=>1);assert.equal(done.coins,45);assert.equal(done.doping,2e15);
  assert.equal(grantReward(done,quest),done);assert.deepEqual(done.purchased,s.purchased);
 }
});
