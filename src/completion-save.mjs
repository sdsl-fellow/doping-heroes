// The game uses quest IDs internally; persisted JSON has two independent lists.
export function completionIds(save){
 const list=(value,max)=>[...new Set((Array.isArray(value)?value:[]).filter(n=>Number.isInteger(n)&&n>=0&&n<=max))].sort((a,b)=>a-b);
 const legacy=list(save?.completed,14);
 const tutorial=list(save?.tutorial_completed??legacy.filter(n=>n<3),2);
 const stages=list(save?.stage_completed??legacy.filter(n=>n>=3).map(n=>n-3),11);
 return [...tutorial,...stages.map(n=>n+3)];
}
export function fromStoredSave(save){
 if(!save||typeof save!=='object')return save;
 const {tutorial_completed,stage_completed,...rest}=save;
 return {...rest,completed:completionIds(save)};
}
export function toStoredSave(save){
 if(!save||typeof save!=='object')return save;
 const ids=completionIds(save);
 const {completed,tutorial_completed,stage_completed,...rest}=save;
 return {...rest,tutorial_completed:ids.filter(n=>n<3),stage_completed:ids.filter(n=>n>=3).map(n=>n-3)};
}
