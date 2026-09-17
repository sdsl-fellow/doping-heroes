import {hubRoads} from './hub-roads.mjs';
import {gatewayLocations,stageIndex,stageDefinitions} from './maps.mjs';
// Walkable corridors follow the painted plaza and bridge; water/buildings are blocked.
const corridors=[[768,360,768,1000,55],[768,540,510,535,55],[510,535,230,475,43],[510,535,480,430,38],[480,430,390,340,26],[768,540,1000,550,52],[1000,550,1190,610,43],[1190,610,1310,590,36],[1310,590,1350,530,38]];
function distance(x,y,a,b,c,d){const t=Math.max(0,Math.min(1,((x-a)*(c-a)+(y-b)*(d-b))/((c-a)**2+(d-b)**2)));return Math.hypot(x-a-t*(c-a),y-b-t*(d-b));}
export function walkable(x,y,area='village'){if(stageIndex(area)>=0)return x>=32&&x<=1504&&y>=64&&y<=930&&corridorsForStage(area).some(([a,b,c,d,w])=>distance(x,y,a,b,c,d)<w);if(area==='adventure')return x>=32&&x<=1504&&y>=48&&y<=940&&adventureCorridors.some(([a,b,c,d,w])=>distance(x,y,a,b,c,d)<w);return x>=32&&x<=1504&&y>=340&&y<=1000&&corridors.some(([a,b,c,d,w])=>distance(x,y,a,b,c,d)<w);}
const cell=16,cols=96,rows=64,valid=[];
for(let y=0;y<rows;y++)for(let x=0;x<cols;x++)if(walkable(x*cell+8,y*cell+8))valid.push(y*cols+x);
function nearest(x,y,valid){let id=valid[0],best=Infinity;for(const v of valid){const d=(v%cols*cell+8-x)**2+(Math.floor(v/cols)*cell+8-y)**2;if(d<best){best=d;id=v;}}return id;}
// Eight-direction A* followed by line-of-sight smoothing. No forced waypoints.
export function clearSegment(a,b,area){
 const steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/4));
 for(let i=0;i<=steps;i++)if(!walkable(a.x+(b.x-a.x)*i/steps,a.y+(b.y-a.y)*i/steps,area))return false;
 return true;
}
export function route(x,y,tx,ty,area='village'){
 const cells=stageIndex(area)>=0?cellsForStage.get(area):area==='adventure'?adventureCells:valid;
 const start=nearest(x,y,cells),end=nearest(tx,ty,cells),allowed=new Set(cells),point=id=>({x:id%cols*cell+8,y:Math.floor(id/cols)*cell+8});
 const goal=point(end),heuristic=id=>Math.hypot(point(id).x-goal.x,point(id).y-goal.y),open=[start],closed=new Set(),previous=new Map(),cost=new Map([[start,0]]);
 while(open.length){let best=0;for(let i=1;i<open.length;i++)if(cost.get(open[i])+heuristic(open[i])<cost.get(open[best])+heuristic(open[best]))best=i;
  const current=open.splice(best,1)[0];if(current===end)break;closed.add(current);
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
   const next=current+dx+dy*cols;if(!allowed.has(next)||closed.has(next)||Math.abs(current%cols-next%cols)>1)continue;
   if(dx&&dy&&(!allowed.has(current+dx)||!allowed.has(current+dy*cols)))continue;
   if(!clearSegment(point(current),point(next),area))continue;
   const tentative=cost.get(current)+cell*Math.hypot(dx,dy);
   if(tentative<(cost.get(next)??Infinity)){previous.set(next,current);cost.set(next,tentative);if(!open.includes(next))open.push(next);}
  }
 }
 if(start!==end&&!previous.has(end))return [];
 const raw=[point(end)];for(let v=end;v!==start;){v=previous.get(v);raw.unshift(point(v));}
 const path=[],origin={x,y};let anchor=origin,i=0;
 while(i<raw.length){let far=i;for(let j=raw.length-1;j>i;j--)if(clearSegment(anchor,raw[j],area)){far=j;break;}path.push(raw[far]);anchor=raw[far];i=far+1;}
 const exact={x:tx,y:ty};if(walkable(tx,ty,area)&&clearSegment(path.at(-1)??origin,exact,area))path.push(exact);
 return path.filter((p,i)=>Math.hypot(p.x-(i?path[i-1].x:x),p.y-(i?path[i-1].y:y))>.1);
}
export const npcLocations=[{x:800,y:406},{x:298,y:492},{x:1320,y:582}];

const adventureCorridors=[...hubRoads.flatMap(points=>points.slice(1).map((end,i)=>[...points[i],...end,34])),...gatewayLocations.map(p=>[p.x,p.y+25,p.x,p.y+60,60])];
export const stageRoadHeights=stageDefinitions.map(s=>s.road);
export const stageBookPoint=area=>({x:stageIndex(area)===5?400:250,y:stageRoadHeights[stageIndex(area)]});
function corridorsForStage(area){
 const i=stageIndex(area),y=stageRoadHeights[i],end=i===5?710:i===6?920:820;
 return [[768,64,768,end,i>=7?48:40],[stageBookPoint(area).x,y,i===0?1100:1030,y,i>=7?42:35]];
}
const adventureCells=[],cellsForStage=new Map(Array.from({length:12},(_,i)=>[`stage-${i+1}`,[]]));
for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
 if(walkable(x*cell+8,y*cell+8,'adventure'))adventureCells.push(y*cols+x);
 for(const [area,cells] of cellsForStage)if(walkable(x*cell+8,y*cell+8,area))cells.push(y*cols+x);
}
export const adventureLocations=gatewayLocations;

// Gate clicks use the same shortest navigable route as ground clicks.
export function routeToGateway(x,y,index){
 const gate=gatewayLocations[index];return gate?route(x,y,gate.x,gate.y,'adventure'):[];
}
