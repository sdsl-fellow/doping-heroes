# v24: compact translation saves

`Code_v24.gs` is the complete Apps Script bundle. Replace the existing Apps Script editor contents with it and deploy a new web-app version on the **same deployment URL**. Confirm that `doGet` returns `apiVersion: 24` before resetting any data.

The translation round now stores question IDs, option order, content fingerprints, and small answer receipts. The server reads the current `Translation_01` bank to render questions and feedback. A changed question invalidates its open round. Question counters and awarded balances still commit atomically in the Students row; the existing `TranslationProgress` worker remains a derived report.

## One-time reset requested for all accounts

In the Apps Script editor, run `resetAllSaveJsonV24()` once. This editor-only function is not available through the public web API. It validates every existing Students JSON, creates a `SaveJsonBackup_<timestamp>` sheet, blanks `Students.saveJson` for **every student and root**, and increments their revisions so an old browser save cannot silently restore the previous JSON. It leaves all other columns, sheets, PIN hashes, and account identities intact. After the reset, the game reads blank JSON as default game state; the separate `doping`, `coins`, `items`, and `TranslationProgress` columns still display the previous values until separately reconciled. Do not run this reset if those reports are intended to represent the new default game state without further reconciliation.

Existing unreset v23 sessions are compacted on their next translation action. `TranslationProgress` is refreshed by the existing async worker after the next answer; the reset function deliberately does not alter that tab.
