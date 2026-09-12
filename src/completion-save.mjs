import {stageDefinitions} from './maps.mjs';
export const stageQuestIds=stageDefinitions.map(s=>s.questId);
// Schema 2 uses actual map order; v5's unmarked arrays used questId - 3.
export function completionIds(save){
 const list=(value,max)=>[...new Set((Array.isArray(value)?value:[]).filter(n=>Number.isInteger(n)&&n>=0&&n<=max))].sort((a,b)=>a-b);
 const legacy=list(save?.completed,14);
 const tutorial=list(save?.tutorial_completed??legacy.filter(n=>n<3),2);
 const stages=list(save?.stage_completed??legacy.filter(n=>n>=3).map(n=>n-3),11);
 return [...tutorial,...stages.map(n=>save?.completion_schema===2?stageQuestIds[n]:n+3)].sort((a,b)=>a-b);
}
export function puzzleIds(save){
 const values=Array.isArray(save?.puzzle_completed)?save.puzzle_completed:save?.fetPuzzleCompleted===true?[10]:[];
 return [...new Set(values.filter(n=>Number.isInteger(n)&&n>=0&&n<12))].sort((a,b)=>a-b);
}
export function fromStoredSave(save){
 if(!save||typeof save!=='object')return save;
 const {tutorial_completed,stage_completed,fetPuzzleCompleted,completion_schema,...rest}=save;
 return {...rest,completed:completionIds(save),puzzle_completed:puzzleIds(save)};
}
export function toStoredSave(save){
 if(!save||typeof save!=='object')return save;
 const ids=completionIds(save);
 const {completed,tutorial_completed,stage_completed,fetPuzzleCompleted,completion_schema,...rest}=save;
 return {...rest,completion_schema:2,tutorial_completed:ids.filter(n=>n<3),stage_completed:stageQuestIds.map((id,i)=>ids.includes(id)?i:-1).filter(i=>i>=0),puzzle_completed:puzzleIds(save)};
}
