import type {TranslationRound} from './translation-types';
import type {Save} from './save';
import {normalizeItemSave,toCloudItemSave} from './item-save.mjs';
import {fromStoredSave,toStoredSave} from './completion-save.mjs';

export const CLOUD_API_URL='https://script.google.com/macros/s/AKfycbwnkrmrQZNi7-UNCoys5EMuSHR9AuPChB79UUCLmI8YrQJscWAS5chXhOkyX-2MxkHs/exec';
const CLOUD_AUTH_KEY='doping-heroes:cloud-auth:v1';

export type CloudSession={studentId:string;token:string;revision:number};
export type CloudStudent={studentId:string;name:string;save:Save;revision:number};
export type CloudResponse={ok:boolean;quiz?:TranslationRound;stage_layout?:number;item_schema?:number;token?:string;student?:CloudStudent;stages?:boolean[];allowed?:boolean;registered?:boolean;serverTime?:string;error?:{code:string;message:string}};

export class CloudError extends Error{
 code:string;response?:CloudResponse;
 constructor(code:string,message:string,response?:CloudResponse){super(message);this.name='CloudError';this.code=code;this.response=response;}
}

let serverItemSchema:number|undefined;
let stageRequest:Promise<CloudResponse>|null=null;

async function request(body?:Record<string,unknown>):Promise<CloudResponse>{
 if(body?.save&&serverItemSchema!==3){
  const server=await fetchCloudStages();
  if(server.item_schema!==3)throw new CloudError('ITEM_SCHEMA_MISMATCH','연결된 서버가 최신 아이템 ID를 지원하지 않습니다. Code_v7.gs를 새 버전으로 배포해 주세요. 저장은 전송하지 않았습니다.');
 }
 if(body?.save)body={...body,save:toCloudItemSave(fromStoredSave(body.save))};
 const controller=new AbortController(),timer=window.setTimeout(()=>controller.abort(),45000);
 try{
  const response=await fetch(CLOUD_API_URL,body?{method:'POST',headers:{'Content-Type':'text/plain;charset=UTF-8'},body:JSON.stringify(body),redirect:'follow',credentials:'omit',signal:controller.signal}:{method:'GET',redirect:'follow',credentials:'omit',cache:'no-store',signal:controller.signal});
  const text=await response.text();let data:CloudResponse;
  try{data=JSON.parse(text) as CloudResponse;}catch{throw new CloudError('INVALID_RESPONSE','클라우드 저장소의 응답을 읽을 수 없습니다. Apps Script 배포 권한을 확인해 주세요.');}
  // Read capability from the server payload before local migrations add schema 3.
  if(data.ok){
   if(typeof data.item_schema==='number')serverItemSchema=data.item_schema;
   else if(data.student)serverItemSchema=data.student.save?.item_schema;
  }
  if(data.student)data.student.save=normalizeItemSave(fromStoredSave(data.student.save));
  if(!data.ok)throw new CloudError(data.error?.code??'CLOUD_ERROR',data.error?.message??'클라우드 요청에 실패했습니다.',data);
  return data;
 }catch(error){
  if(error instanceof CloudError)throw error;
  if(error instanceof DOMException&&error.name==='AbortError')throw new CloudError('TIMEOUT','45초 동안 서버 응답을 받지 못했습니다. 선택한 장비는 유지됩니다. 잠시 후 다시 저장해 주세요.');
  throw new CloudError('NETWORK_ERROR','클라우드 저장소에 연결할 수 없습니다. 인터넷 연결을 확인해 주세요.');
 }finally{window.clearTimeout(timer);}
}

export const fetchCloudStages=()=>{
 if(!stageRequest)stageRequest=request().finally(()=>{stageRequest=null;});
 return stageRequest;
};
export const checkCloudStudent=(studentId:string)=>request({action:'checkStudent',studentId});
export const registerCloud=(save:Save,pin:string)=>request({action:'register',studentId:save.studentId,name:save.name,pin,save});
export const loginCloud=(studentId:string,pin:string)=>request({action:'login',studentId,pin});
export const loginRootCloud=(pin:string)=>request({action:'rootLogin',pin});
export const loadCloud=(token:string)=>request({action:'load',token});
export const saveCloud=(token:string,save:Save,baseRevision:number,includeStages=true)=>request({action:'save',token,save,baseRevision,includeStages});
export const setCloudStage=(token:string,index:number,released:boolean)=>request({action:'setStage',token,index,released});

export function readCloudSession():CloudSession|null{
 try{const value=JSON.parse(localStorage.getItem(CLOUD_AUTH_KEY)||'null');return value&&typeof value.studentId==='string'&&typeof value.token==='string'&&Number.isInteger(value.revision)?value:null;}catch{return null;}
}
export function writeCloudSession(session:CloudSession){localStorage.setItem(CLOUD_AUTH_KEY,JSON.stringify(session));}
export function clearCloudSession(){localStorage.removeItem(CLOUD_AUTH_KEY);}

export function normalizeStageFlags(value:unknown){return Array.from({length:12},(_,index)=>Array.isArray(value)&&value[index]===true);}

export const translationCloud=(action:'translationStart'|'translationAnswer',token:string,baseRevision:number,args:Record<string,string>)=>request({...args,action,token,baseRevision});
