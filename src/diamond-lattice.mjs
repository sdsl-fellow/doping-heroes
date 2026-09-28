// Diamond cubic: an FCC lattice with an identical Si basis displaced by (1/4, 1/4, 1/4).
// Include boundary copies so all four bonds of each interior atom are visible in one cube.
const faces=[];
for(const a of [0,1])for(const b of [0,1])for(const c of [0,1])faces.push([a,b,c]);
for(const a of [0,1])faces.push([a,.5,.5],[.5,a,.5],[.5,.5,a]);
const interior=[[.25,.25,.25],[.25,.75,.75],[.75,.25,.75],[.75,.75,.25]];
const key=p=>p.join(',');
export const latticeAtoms=[...new Map([...faces,...interior].map(p=>[key(p),p])).values()];
// The five sites marked in the reference: interior Si at (3/4, 1/4, 3/4)
// and exactly its four tetrahedrally bonded nearest neighbors.
export const missingAtoms=[[.75,.25,.75],[.5,0,.5],[.5,.5,1],[1,0,1],[1,.5,.5]];
const missing=new Set(missingAtoms.map(key));
export const latticeBonds=interior.flatMap(a=>latticeAtoms.filter(b=>{
 const d=a.reduce((sum,v,i)=>sum+(v-b[i])**2,0);
 return Math.abs(d-3/16)<1e-9;
}).map(b=>({a,b,missing:missing.has(key(a))||missing.has(key(b))})));
export const cubeEdges=[];
for(const a of [0,1])for(const b of [0,1])for(let axis=0;axis<3;axis++){
 const p=[a,b,0],q=[a,b,0];
 const other=[0,1,2].filter(i=>i!==axis);p[other[0]]=a;p[other[1]]=b;q[other[0]]=a;q[other[1]]=b;p[axis]=0;q[axis]=1;
 cubeEdges.push([p,q]);
}
// Match the supplied renderer's perspective camera and its 4:3 image, displayed at 360 × 270.
const camera=[3.15,-4.45,2.90],target=[.50,.50,.47];
const normalize=v=>{const length=Math.hypot(...v);return v.map(n=>n/length);};
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const dot=(a,b)=>a.reduce((sum,n,i)=>sum+n*b[i],0);
const forward=normalize(target.map((n,i)=>n-camera[i]));
const right=normalize(cross(forward,[0,0,1])),up=cross(right,forward);
const halfHeight=Math.tan(15.8*Math.PI/360),halfWidth=halfHeight*4/3;
export function projectAtom(p){
 const offset=p.map((n,i)=>n-camera[i]),depth=dot(offset,forward);
 return {x:180*(1+dot(offset,right)/(depth*halfWidth)),y:135*(1-dot(offset,up)/(depth*halfHeight))};
}
const origin=projectAtom(missingAtoms[0]);
export const clusterSites=missingAtoms.map(p=>{const v=projectAtom(p);return {x:v.x-origin.x,y:v.y-origin.y};});
export const siliconLatticeConstantNm=0.543;
export const siliconBondLengthNm=siliconLatticeConstantNm*Math.sqrt(missingAtoms[0].reduce((d,v,i)=>d+(v-missingAtoms[1][i])**2,0));
const a=missingAtoms[1].map((v,i)=>v-missingAtoms[0][i]);
const b=missingAtoms[2].map((v,i)=>v-missingAtoms[0][i]);
export const siliconBondAngleDeg=Math.acos(dot(a,b)/(Math.hypot(...a)*Math.hypot(...b)))*180/Math.PI;
