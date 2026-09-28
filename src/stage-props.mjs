import {stageDefinitions} from './maps.mjs';
import {STAGE_ONE_EXPERIMENT_POINT} from './stage-one-experiment.mjs';
import {FET_GAME_POINT} from './fet-process.mjs';

// Keep the terminals beside the east path and the benches on the south path.
export const stageProps=stageDefinitions.map((stage,index)=>({
 pc:index===0?{x:1140,y:480}:{x:1060,y:stage.road},
 pcApproach:index===0?{x:1080,y:485}:{x:1000,y:stage.road},
 experiment:index===0?STAGE_ONE_EXPERIMENT_POINT:index===6?FET_GAME_POINT:{x:768,y:index===5?710:800},
 experimentSign:{x:768,y:stage.road+(index===5?90:100)}
}));
