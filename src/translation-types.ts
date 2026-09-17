export type TranslationResult={correct:boolean;selected:string;correctOption:string;correctText:string;explanation:string;sourceId:string;sourceTitle:string;sourcePage:number;dose:number;coins:number;repeat:boolean;answeredAt:string};
export type TranslationRound={id:string;expiresAt:number;questions:{id:string;kind:'term'|'sentence';english:string;options:{id:string;text:string}[]}[];results:Record<string,TranslationResult>};
export type TranslationRequest=(action:'translationStart'|'translationAnswer',args:Record<string,string>)=>Promise<TranslationRound>;
