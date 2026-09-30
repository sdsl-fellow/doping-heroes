import {stageDefinitions} from './maps.mjs';
import {STAGE_ONE_EXPERIMENT_POINT} from './stage-one-experiment.mjs';
import {FET_GAME_POINT} from './fet-process.mjs';

// Match the book and PC distance to the south task for each stage.
// Stage 1 keeps its original positions; Stage 7 keeps its table on the island.
export const stageProps=stageDefinitions.map((stage,index)=>{
 const experiment=index===0?STAGE_ONE_EXPERIMENT_POINT:index===1?{x:768,y:stage.road+STAGE_ONE_EXPERIMENT_POINT.y-stageDefinitions[0].road}:index===5?FET_GAME_POINT:{x:768,y:index===6?655:745};
 const radius=experiment.y-stage.road;
 const horizontal=Math.round(Math.sqrt(radius*radius-15*15));
 const book=index===0?{x:396,y:480}:{x:768-horizontal,y:stage.road+15};
 const pc=index===0?{x:1140,y:480}:{x:768+horizontal,y:stage.road+15};
 return {
  book,pc,
  pcApproach:{x:pc.x-60,y:pc.y+5},
  experiment,
  experimentSign:{x:768,y:stage.road+(index===6?40:100)}
 };
});
