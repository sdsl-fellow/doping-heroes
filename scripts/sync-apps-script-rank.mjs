import fs from 'node:fs';
import curves from '../src/resistivity-data.json' with {type:'json'};
import {MIN_DOPING,MAX_DOPING,clampDoping,resistivity,conductivity} from '../src/progression.mjs';

const path=new URL('../google-apps-script/Code_v25_Stage2.gs',import.meta.url);
const start='// BEGIN GENERATED RANK LEVEL';
const end='// END GENERATED RANK LEVEL';
// Keep the server's curves and interpolation identical to the HUD and rank rows.
const block=[start,'// Generated from src/progression.mjs. Run node scripts/sync-apps-script-rank.mjs.',
 'function rankLevel_(doping,type) {',
 ` const MIN_DOPING=${MIN_DOPING},MAX_DOPING=${MAX_DOPING};`,
 ' const curves='+JSON.stringify(curves)+';',
 clampDoping.toString(),resistivity.toString(),'const conductivity='+conductivity.toString()+';',
 ' return Number(conductivity(doping,type).toPrecision(3));','}',end].join('\n');
const source=fs.readFileSync(path,'utf8');
const next=source.includes(start)?source.slice(0,source.indexOf(start))+block+source.slice(source.indexOf(end)+end.length):source+'\n'+block+'\n';
if(process.argv.includes('--check')){
 if(next!==source)throw new Error('Apps Script rank rules are stale. Run scripts/sync-apps-script-rank.mjs');
}else fs.writeFileSync(path,next);
