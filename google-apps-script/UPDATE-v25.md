# v25: one translation question at a time

`Code_v25.gs` is the complete Apps Script bundle. Replace the editor's existing code with the entire file and deploy a **new web-app deployment URL**. Send that URL for the matching game client release. Until the client is switched, the v24 game continues to use its existing v24 deployment. If the same URL is updated instead, the v24 client rejects the version mismatch and stops sending saves until the matching client is published.

The new translation flow issues one signed question token without writing an active session to `saveJson`. An incorrect answer writes nothing. A first correct answer adds its question ID to `translation_solved` and awards doping and coins in the same Students row write. Later correct submissions pay zero. Closing or refreshing the game discards the current question.

After the v25 game client is live, run `migrateTranslationSolvedV25()` once in the Apps Script editor. It validates every Students row, creates a `TranslationV25Backup_<timestamp>` sheet, converts all previously correct v24 question records to `translation_solved` IDs, drops verbose `translation_progress` from `saveJson`, and increments revisions. Balances, inventory, and other progress remain. The existing `TranslationProgress` tab is retained as an archive and no longer records new attempts; the old periodic trigger is removed.

The migration is safe to run again but creates another backup and increments revisions again. Do not run `setupReportingV13()` or `setupTranslationPerformanceV14()` after migration.
