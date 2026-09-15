import {stageDefinitions} from './maps.mjs';
export const stageQuestIds=stageDefinitions.map(s=>s.questId);
export function stageList(values){return [...new Set((Array.isArray(values)?values:[]).filter(n=>Number.isInteger(n)&&n>=0&&n<12))].sort((a,b)=>a-b);}
// Runtime quests have stable IDs; stored stage indices always use the current curriculum.
export function completionIds(save){
 const list=(value,max)=>[...new Set((Array.isArray(value)?value:[]).filter(n=>Number.isInteger(n)&&n>=0&&n<=max))].sort((a,b)=>a-b);
 const runtime=list(save?.completed,14);
 const tutorial=list(save?.tutorial_completed??runtime.filter(n=>n<3),2);
 const stages=Array.isArray(save?.stage_completed)?stageList(save.stage_completed).map(n=>stageQuestIds[n]):runtime.filter(n=>n>=3);
 return [...tutorial,...stages].sort((a,b)=>a-b);
}
export function puzzleIds(save){return stageList(save?.puzzle_completed);}
export function fromStoredSave(save){
 if(!save||typeof save!=='object')return save;
 const {tutorial_completed,stage_completed,fetPuzzleCompleted,completion_schema,...rest}=save;
 return {...rest,stage_layout:3,readBooks:stageList(save.readBooks),completed:completionIds(save),puzzle_completed:puzzleIds(save)};
}
export function toStoredSave(save){
 if(!save||typeof save!=='object')return save;
 const normalized=fromStoredSave(save),{completed,...rest}=normalized;
 return {...rest,completion_schema:3,tutorial_completed:completed.filter(n=>n<3),stage_completed:stageQuestIds.map((id,i)=>completed.includes(id)?i:-1).filter(i=>i>=0)};
}
