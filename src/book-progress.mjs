// Stable source IDs distinguish rewards for multiple PDFs in one stage.
export const firstBookSource=stage=>stage===0?'SE01-CRYSTAL-2026':`STAGE-${stage+1}-BOOK-1`;
export function bookSources(save){
 if(Array.isArray(save?.readBookSources))return [...new Set(save.readBookSources.filter(id=>typeof id==='string'&&/^[A-Za-z0-9_-]{1,80}$/.test(id)))].slice(0,200);
 return (Array.isArray(save?.readBooks)?save.readBooks:[]).filter(n=>Number.isInteger(n)&&n>=0&&n<12).map(firstBookSource);
}
export const hasReadSource=(save,stage,sourceId=firstBookSource(stage))=>bookSources(save).includes(sourceId);
