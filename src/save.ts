import {catalog,inventoryIds,migrateItemId} from './catalog.mjs';
import {normalizeItemSave} from './item-save.mjs';
import {fromStoredSave} from './completion-save.mjs';
import {isRootAccount,validStudentId} from './access.mjs';
import {lootItems} from './loot.mjs';
import {validCharacter,type Character} from './character';
import {availableCharacter} from './equipment';
import {clampDoping,MIN_DOPING} from './progression.mjs';
export type Save={version:3;item_schema?:number;studentId:string;name:string;character:Character;completed:number[];readBooks:number[];puzzle_completed:number[];doping:number;type:'n'|'p';coins:number;quantities?:Record<string,number>;purchased:string[];area:'village'|'adventure'|`stage-${number}`};
export const hasKey=(s:Save|null)=>isRootAccount(s)||[0,1,2].every(i=>s?.completed.includes(i));
export function restore():Save|null{
 try{
  const s=normalizeItemSave(fromStoredSave(JSON.parse(localStorage.getItem('doping-heroes:v3')||localStorage.getItem('doping-heroes:v2')||localStorage.getItem('doping-heroes:v1')||'null')));
  if(!s||typeof s.name!=='string'||!s.name.trim()||s.name.length>20||!Array.isArray(s.completed))return null;
  const completed=[...new Set<number>(s.completed.filter((n:unknown)=>Number.isInteger(n)&&Number(n)>=0&&Number(n)<15))];
  const purchased=Array.isArray(s.purchased)?s.purchased.map((i:unknown)=>migrateItemId(String(i))).filter((i:unknown)=>catalog.some(item=>item.id===migrateItemId(String(i)))):[];
  const oldDose=[2e13,3e13,4e13].reduce((n,d,i)=>n+(completed.includes(i)?d:0),MIN_DOPING);
  const result:Save={version:3,item_schema:3,puzzle_completed:s.puzzle_completed??[],name:s.name,studentId:validStudentId(s.name,s.studentId)?s.studentId:'',character:availableCharacter(validCharacter(s.character),completed,inventoryIds({...s,purchased})),completed,purchased,quantities:Object.fromEntries(catalog.filter(i=>['T03','T04','T05'].includes(i.id)).map(i=>[i.id,Number.isInteger(s.quantities?.[i.id])?Math.max(0,Math.min(9999,s.quantities[i.id])):0])),readBooks:Array.isArray(s.readBooks)?[...new Set<number>(s.readBooks.filter((n:unknown)=>Number.isInteger(n)&&Number(n)>=0&&Number(n)<12))]:[],doping:clampDoping(s.version===3?s.doping:oldDose),type:s.type==='p'?'p':'n',coins:Number.isFinite(s.coins)?Math.max(0,Math.floor(s.coins)):completed.length*20,area:'village'};
  if(result.character.gender==='neutral'&&result.character.species==='dog')result.character.hairColor='#dae0e5';return result;
 }catch{return null;}
}
