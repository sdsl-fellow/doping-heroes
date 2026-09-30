import {stageDefinitions} from './maps.mjs';
import {STAGE_ONE_EXPERIMENT_POINT} from './stage-one-experiment.mjs';

// Every stage uses the same guide-relative layout as Stage 1.
const taskDistance=STAGE_ONE_EXPERIMENT_POINT.y-stageDefinitions[0].road;
export const stageProps=stageDefinitions.map(stage=>({
 book:{x:396,y:stage.road+15},
 pc:{x:1140,y:stage.road+15},
 pcApproach:{x:1080,y:stage.road+20},
 experiment:{x:768,y:stage.road+taskDistance},
 experimentSign:{x:768,y:stage.road+100}
}));
