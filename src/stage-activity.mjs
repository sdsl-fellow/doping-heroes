import {stageList} from './completion-save.mjs';
export const stageQuizDone=(save,index)=>stageList(save?.stage_quiz_completed).includes(index);
export function recordStageQuiz(save,index,result){
 return {...save,stage_quiz_completed:stageList([...(save.stage_quiz_completed||[]),index]),stage_quiz_rewards:{...save.stage_quiz_rewards,[index]:{dose:result.dose,coins:result.coins}}};
}
