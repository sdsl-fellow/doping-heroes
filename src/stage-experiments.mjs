// Stage indexes and experiment completion IDs use the same zero-based layout.
// Add required experiment IDs here as new stage experiments are introduced.
/** @type {Record<number, number[]>} */
export const requiredStageExperiments={0:[0],1:[1],6:[6]};

export function missingStageExperiments(save,stageIndex){
 const completed=save?.puzzle_completed??[];
 return (requiredStageExperiments[stageIndex]??[]).filter(id=>!completed.includes(id));
}
