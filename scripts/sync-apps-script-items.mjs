import fs from 'node:fs';
import {catalog,catalogItem,migrateItemId,inventoryIds} from '../src/catalog.mjs';
import {isRootAccount} from '../src/access.mjs';
import {completionIds,fromStoredSave,toStoredSave,puzzleIds,stageQuestIds} from '../src/completion-save.mjs';
import {ITEM_SCHEMA,oldCodes,swappedHats,normalizeItemSave} from '../src/item-save.mjs';
const path='google-apps-script/Code.gs';
const start='// BEGIN GENERATED ITEM RULES';
const end='// END GENERATED ITEM RULES';
const block=[start,'// Generated from src/catalog.mjs. Run node scripts/sync-apps-script-items.mjs.',
 'const catalog = '+JSON.stringify(catalog.map(({id,legacyId,quest})=>({id,legacyId,quest})))+';',
 'const catalogItem = '+catalogItem.toString()+';',
 'const migrateItemId = '+migrateItemId.toString()+';',
 'const isRootAccount = '+isRootAccount.toString()+';',
 'const ITEM_SCHEMA = '+ITEM_SCHEMA+';','const oldCodes = '+JSON.stringify(oldCodes)+';','const swappedHats = '+JSON.stringify(swappedHats)+';',normalizeItemSave.toString(),
 inventoryIds.toString(),'const stageQuestIds = '+JSON.stringify(stageQuestIds)+';',completionIds.toString(),puzzleIds.toString(),fromStoredSave.toString(),toStoredSave.toString(),end].join('\n');
const source=fs.readFileSync(path,'utf8');
const next=source.includes(start)?source.slice(0,source.indexOf(start))+block+source.slice(source.indexOf(end)+end.length):source+'\n'+block+'\n';
if(process.argv.includes('--check')){
 if(next!==source)throw new Error('Apps Script item rules are stale. Run scripts/sync-apps-script-items.mjs');
}else fs.writeFileSync(path,next);
