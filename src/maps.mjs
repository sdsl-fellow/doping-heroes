export const stageDefinitions=[
 {name:'결정 동굴',questId:3},{name:'격자 유적',questId:11},{name:'에너지 밴드 계곡',questId:4},{name:'캐리어 습지',questId:5},
 {name:'도핑 광산',questId:6},{name:'드리프트 협곡',questId:7},{name:'확산 사막',questId:8},{name:'PN 접합 다리',questId:9},
 {name:'다이오드 용암 공방',questId:12},{name:'BJT 오션',questId:13},{name:'FET 정글',questId:10},{name:'Power 반도체 동굴',questId:14}
].map((s,i)=>({...s,index:i,title:`Stage ${i+1}. ${s.name}`,area:`stage-${i+1}`}));
export const stageIndex=area=>stageDefinitions.findIndex(s=>s.area===area);
export const stageForQuest=id=>stageDefinitions.find(s=>s.questId===id);
export const gatewayLocations=stageDefinitions.map((s,i)=>({x:[246,584,946,1289][i%4],y:[352,558,760][Math.floor(i/4)],index:i}));
export function mapInfo(area){const stage=stageDefinitions[stageIndex(area)];return stage?{width:1024,height:1024,image:'./stages.webp',frame:stage.index,title:stage.title,spawn:{x:512,y:210},exit:{x:512,y:80}}:area==='adventure'?{width:1536,height:1024,image:'./adventure.webp',title:'모험 대륙 · 12개 Stage',spawn:{x:768,y:200},exit:{x:768,y:70}}:{width:1536,height:1024,image:'./campus.webp',title:'세미 마을',spawn:{x:768,y:590},exit:{x:768,y:955}};}
/** @param {string} area @param {number|null} arrival */
export function arrivalPoint(area,arrival=null){if(area==='adventure'&&Number.isInteger(arrival)&&gatewayLocations[arrival]){const p=gatewayLocations[arrival];return {x:p.x,y:p.y+65};}return mapInfo(area).spawn;}
