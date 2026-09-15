// Quest IDs remain stable across the visible curriculum reorder.
export const stageDefinitions=[
 {name:'결정 동굴',questId:3,art:1,road:465},
 {name:'에너지 밴드 계곡',questId:4,art:3,road:495},
 {name:'캐리어 습지',questId:5,art:4,road:470},
 {name:'드리프트 협곡',questId:7,art:6,road:500},
 {name:'확산 사막',questId:8,art:7,road:500},
 {name:'BJT 오션',questId:13,art:10,road:470},
 {name:'FET 정글',questId:10,art:11,road:490},
 {name:'광전자 협곡',questId:11,art:0,road:500},
 {name:'게이트 혁신 도시',questId:6,art:0,road:500},
 {name:'기억의 영속성',questId:9,art:0,road:500},
 {name:'전력 반도체 요새',questId:14,art:0,road:500},
 {name:'첨단 패키징 공장',questId:12,art:0,road:500}
].map((s,i)=>({...s,index:i,title:`Stage ${i+1}. ${s.name}`,area:`stage-${i+1}`}));
export const stageIndex=area=>stageDefinitions.findIndex(s=>s.area===area);
export const stageForQuest=id=>stageDefinitions.find(s=>s.questId===id);
export const gatewayLocations=stageDefinitions.map((s,i)=>({x:[246,584,946,1289][i%4],y:[352,558,760][Math.floor(i/4)],index:i}));
export function mapInfo(area){const stage=stageDefinitions[stageIndex(area)];return stage?{width:1536,height:1024,image:stage.art?`./stages/stage-${stage.art}.webp`:`./stages-v3/stage-${stage.index+1}.webp`,frame:stage.art?stage.art-1:stage.index,npc:{x:768,y:570},title:stage.title,spawn:{x:768,y:210},exit:{x:768,y:80}}:area==='adventure'?{width:1536,height:1024,image:'./adventure.webp',title:'모험 대륙 · 12개 Stage',spawn:{x:768,y:200},exit:{x:768,y:70}}:{width:1536,height:1536,image:'./campus.webp',title:'세미 마을',spawn:{x:768,y:590},exit:{x:768,y:955}};}
/** @param {string} area @param {number|null} arrival */
export function arrivalPoint(area,arrival=null){if(area==='adventure'&&Number.isInteger(arrival)&&gatewayLocations[arrival]){const p=gatewayLocations[arrival];return {x:p.x,y:p.y+65};}return mapInfo(area).spawn;}

export const stageUnlocked=(completed,index,root=false)=>Number.isInteger(index)&&index>=0&&index<12&&(root||[0,1,2,...stageDefinitions.slice(0,index).map(s=>s.questId)].every(id=>completed.includes(id)));
