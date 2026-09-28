export type TranslationQuestion={id:string;kind:'term'|'sentence';english:string;options:{id:string;text:string}[]};
export type TranslationResult={correct:boolean;selected:string;correctOption:string;correctText:string;explanation:string;sourceId:string;sourceTitle:string;sourcePage:number;dose:number;coins:number;repeat:boolean};
export type TranslationRound={question:TranslationQuestion;questionToken:string;review:boolean;result?:TranslationResult};
export type TranslationRequest=(action:'translationStart'|'translationAnswer',args:Record<string,string>)=>Promise<TranslationRound>;
