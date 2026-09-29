import {stageDefinitions} from './maps.mjs';
import {STAGE_ONE_EXPERIMENT_POINT} from './stage-one-experiment.mjs';
import {FET_GAME_POINT} from './fet-process.mjs';

// Match the book and PC distance to the south task for each stage.
// Stage 1 keeps its original positions; Stage 6 keeps its table on the island.
export const stageProps=stageDefinitions.map((stage,index)=>{
 const experiment=index===0?STAGE_ONE_EXPERIMENT_POINT:index===6?FET_GAME_POINT:{x:768,y:index===5?655:745};
 const radius=experiment.y-stage.road;
 const horizontal=Math.round(Math.sqrt(radius*radius-15*15));
 const book=index===0?{x:396,y:480}:{x:768-horizontal,y:stage.road+15};
 const pc=index===0?{x:1140,y:480}:{x:768+horizontal,y:stage.road+15};
 return {
  book,pc,
  pcApproach:{x:pc.x-60,y:pc.y+5},
  experiment,
  experimentSign:{x:768,y:stage.road+(index===5?40:100)}
 };
});
