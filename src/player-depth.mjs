// Adventure player stays above all gateway art (<=760) and titles (1500),
// but below their own name (1600) and interaction effects (1700+).
export const playerDepth=(area,y)=>area==='adventure'?1550:y;
