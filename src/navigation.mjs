// Walkable corridors follow the painted plaza and bridge; water/buildings are blocked.
const corridors=[[768,360,768,1000,55],[768,540,510,535,55],[510,535,230,475,43],[510,535,480,430,38],[480,430,390,340,26],[768,540,1000,550,52],[1000,550,1190,610,43],[1190,610,1310,590,36],[1310,590,1350,530,38]];
function distance(x,y,a,b,c,d){const t=Math.max(0,Math.min(1,((x-a)*(c-a)+(y-b)*(d-b))/((c-a)**2+(d-b)**2)));return Math.hypot(x-a-t*(c-a),y-b-t*(d-b));}
export function walkable(x,y,area='village'){if(area==='adventure')return x>=32&&x<=1504&&y>=160&&y<=985&&adventureCorridors.some(([a,b,c,d,w])=>distance(x,y,a,b,c,d)<w);return x>=32&&x<=1504&&y>=340&&y<=1000&&corridors.some(([a,b,c,d,w])=>distance(x,y,a,b,c,d)<w);}
const cell=16,cols=96,rows=64,valid=[];
for(let y=0;y<rows;y++)for(let x=0;x<cols;x++)if(walkable(x*cell+8,y*cell+8))valid.push(y*cols+x);
function nearest(x,y,valid){let id=valid[0],best=Infinity;for(const v of valid){const d=(v%cols*cell+8-x)**2+(Math.floor(v/cols)*cell+8-y)**2;if(d<best){best=d;id=v;}}return id;}
export function route(x,y,tx,ty,area='village'){const cells=area==='adventure'?adventureCells:valid;const start=nearest(x,y,cells),end=nearest(tx,ty,cells),queue=[start],previous=new Map([[start,-1]]),allowed=new Set(cells);for(let n=0;n<queue.length;n++){const v=queue[n];if(v===end)break;for(const next of [v-1,v+1,v-cols,v+cols]){if(!allowed.has(next)||previous.has(next)||Math.abs(v%cols-next%cols)>1)continue;previous.set(next,v);queue.push(next);}}if(!previous.has(end))return [];const result=[];for(let v=end;v!==start;v=previous.get(v)){result.unshift({x:v%cols*cell+8,y:Math.floor(v/cols)*cell+8});}return result;}
export const npcLocations=[{x:800,y:406},{x:298,y:492},{x:1320,y:582}];

const adventureCorridors=[[190,268,1340,268,26],[190,638,1340,638,26],[768,268,768,985,24],...[207,584,945,1321].flatMap(x=>[[x,235,x,296,48],[x,605,x,666,48]])];
const adventureCells=[];
for(let y=0;y<rows;y++)for(let x=0;x<cols;x++)if(walkable(x*cell+8,y*cell+8,'adventure'))adventureCells.push(y*cols+x);
export const adventureLocations=[207,584,945,1321,207,584,945,1321].map((x,i)=>({x,y:i<4?268:638}));
