// Normalized backing polygons sit behind open doorway pixels only.
// Opaque artwork retains its original shadows, floors and trim.
export const gatewayInteriors={
 2:[[.30,.34],[.70,.34],[.70,.78],[.30,.78]],
 3:[[.42,.36],[.57,.36],[.66,.63],[.65,.91],[.34,.91],[.34,.64]],
 5:[[.33,.35],[.67,.35],[.67,.80],[.33,.80]],
 6:[[.39,.46],[.61,.46],[.61,.86],[.39,.86]],
 8:[[.39,.51],[.61,.51],[.61,.87],[.39,.87]]
};
export function gatewayInteriorPoints(index,x,y,size=112){
 return (gatewayInteriors[index]??[]).map(([u,v])=>({x:x+(u-.5)*size,y:y+8+(v-1)*size}));
}
