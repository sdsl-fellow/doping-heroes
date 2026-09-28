// Synthetic quiz data for local tests. Production questions live only in the
// private learning-content sheet, which the Apps Script reads at runtime.
export const bank=Array.from({length:30},(_,i)=>({
 questionId:`TEST-TRANSLATION-${String(i+1).padStart(2,'0')}`,
 stage:1,
 kind:i<9?'term':'sentence',
 english:`Sample ${i<9?'term':'sentence'} ${i+1}`,
 optionA:`Test answer ${i+1}`,
 optionB:`Test distractor B ${i+1}`,
 optionC:`Test distractor C ${i+1}`,
 optionD:`Test distractor D ${i+1}`,
 correctOption:'A',
 explanation:`Sample explanation ${i+1}`,
 sourceId:'TEST-SOURCE',
 sourceTitle:'Synthetic test content',
 sourcePage:3+i,
 active:true,
 rewardDose:1e12,
 rewardCoins:10
}));
