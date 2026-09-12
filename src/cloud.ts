import type {Save} from './save';

export const CLOUD_API_URL='https://script.google.com/macros/s/AKfycbyklVOX21jqeZEijkYPSbGc5X8UlsYZ3sV85-JISKECkKc6ER_D6tntARLdsR4lFbOq/exec';
const CLOUD_AUTH_KEY='doping-heroes:cloud-auth:v1';

export type CloudSession={studentId:string;token:string;revision:number};
export type CloudStudent={studentId:string;name:string;save:Save;revision:number};
export type CloudResponse={ok:boolean;token?:string;student?:CloudStudent;stages?:boolean[];serverTime?:string;error?:{code:string;message:string}};

export class CloudError extends Error{
 code:string;response?:CloudResponse;
 constructor(code:string,message:string,response?:CloudResponse){super(message);this.name='CloudError';this.code=code;this.response=response;}
}

async function request(body?:Record<string,unknown>):Promise<CloudResponse>{
 const controller=new AbortController(),timer=window.setTimeout(()=>controller.abort(),15000);
 try{
  const response=await fetch(CLOUD_API_URL,body?{method:'POST',headers:{'Content-Type':'text/plain;charset=UTF-8'},body:JSON.stringify(body),redirect:'follow',credentials:'omit',signal:controller.signal}:{method:'GET',redirect:'follow',credentials:'omit',cache:'no-store',signal:controller.signal});
  const text=await response.text();let data:CloudResponse;
  try{data=JSON.parse(text) as CloudResponse;}catch{throw new CloudError('INVALID_RESPONSE','클라우드 저장소의 응답을 읽을 수 없습니다. Apps Script 배포 권한을 확인해 주세요.');}
  if(!data.ok)throw new CloudError(data.error?.code??'CLOUD_ERROR',data.error?.message??'클라우드 요청에 실패했습니다.',data);
  return data;
 }catch(error){
  if(error instanceof CloudError)throw error;
  if(error instanceof DOMException&&error.name==='AbortError')throw new CloudError('TIMEOUT','클라우드 저장소 응답이 지연되고 있습니다. 다시 시도해 주세요.');
  throw new CloudError('NETWORK_ERROR','클라우드 저장소에 연결할 수 없습니다. 인터넷 연결을 확인해 주세요.');
 }finally{window.clearTimeout(timer);}
}

export const fetchCloudStages=()=>request();
export const registerCloud=(save:Save,pin:string)=>request({action:'register',studentId:save.studentId,name:save.name,pin,save});
export const loginCloud=(studentId:string,pin:string)=>request({action:'login',studentId,pin});
export const loginRootCloud=(pin:string)=>request({action:'rootLogin',pin});
export const loadCloud=(token:string)=>request({action:'load',token});
export const saveCloud=(token:string,save:Save,baseRevision:number)=>request({action:'save',token,save,baseRevision});
export const setCloudStage=(token:string,index:number,released:boolean)=>request({action:'setStage',token,index,released});

export function readCloudSession():CloudSession|null{
 try{const value=JSON.parse(localStorage.getItem(CLOUD_AUTH_KEY)||'null');return value&&typeof value.studentId==='string'&&typeof value.token==='string'&&Number.isInteger(value.revision)?value:null;}catch{return null;}
}
export function writeCloudSession(session:CloudSession){localStorage.setItem(CLOUD_AUTH_KEY,JSON.stringify(session));}
export function clearCloudSession(){localStorage.removeItem(CLOUD_AUTH_KEY);}

export function normalizeStageFlags(value:unknown){return Array.from({length:12},(_,index)=>Array.isArray(value)&&value[index]===true);}
