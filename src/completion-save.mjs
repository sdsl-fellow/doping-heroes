import {stageDefinitions} from './maps.mjs';
export const stageQuestIds=stageDefinitions.map(s=>s.questId);
export const legacyStageQuestIds=[3,11,4,5,6,7,8,9,12,13,10,14];
export const oldToNewStage=legacyStageQuestIds.map(id=>stageQuestIds.indexOf(id));
export function stageList(values){return [...new Set((Array.isArray(values)?values:[]).filter(n=>Number.isInteger(n)&&n>=0&&n<12))].sort((a,b)=>a-b);}
export function stageIndices(values,layout){return stageList(stageList(values).map(n=>Number(layout)>=3?n:oldToNewStage[n]));}
export function completionIds(save){
 const list=(value,max)=>[...new Set((Array.isArray(value)?value:[]).filter(n=>Number.isInteger(n)&&n>=0&&n<=max))].sort((a,b)=>a-b);
 const legacy=list(save?.completed,14);
 const tutorial=list(save?.tutorial_completed??legacy.filter(n=>n<3),2);
 if(!Array.isArray(save?.stage_completed))return [...tutorial,...legacy.filter(n=>n>=3)];
 const stages=list(save.stage_completed,11),order=Number(save.completion_schema)>=3?stageQuestIds:save.completion_schema===2?legacyStageQuestIds:null;
 return [...tutorial,...stages.map(n=>order?order[n]:n+3)].sort((a,b)=>a-b);
}
export function puzzleIds(save){return stageIndices(Array.isArray(save?.puzzle_completed)?save.puzzle_completed:save?.fetPuzzleCompleted===true?[10]:[],save?.stage_layout);}
export function fromStoredSave(save){
 if(!save||typeof save!=='object')return save;
 const {tutorial_completed,stage_completed,fetPuzzleCompleted,completion_schema,...rest}=save;
 const match=/^stage-(\d+)$/.exec(save.area??'');
 const area=match&&Number(save.stage_layout)<3?`stage-${oldToNewStage[Number(match[1])-1]+1}`:match&&save.stage_layout==null?`stage-${oldToNewStage[Number(match[1])-1]+1}`:save.area;
 return {...rest,...(area?{area}:{}),stage_layout:3,readBooks:stageIndices(save.readBooks,save.stage_layout),completed:completionIds(save),puzzle_completed:puzzleIds(save)};
}
export function toStoredSave(save){
 if(!save||typeof save!=='object')return save;
 const normalized=fromStoredSave(save),{completed,...rest}=normalized;
 return {...rest,completion_schema:3,tutorial_completed:completed.filter(n=>n<3),stage_completed:stageQuestIds.map((id,i)=>completed.includes(id)?i:-1).filter(i=>i>=0)};
}
// v8 servers use the previous map numbering. Convert only at the transport boundary.
export function toLegacyStageSave(save){
 const n=fromStoredSave(save),reverse=values=>stageList(values.map(i=>oldToNewStage.indexOf(i)));
 const match=/^stage-(\d+)$/.exec(n.area??'');
 return {...n,stage_layout:2,readBooks:reverse(n.readBooks),puzzle_completed:reverse(n.puzzle_completed),...(match?{area:`stage-${oldToNewStage.indexOf(Number(match[1])-1)+1}`}:{})};
}
