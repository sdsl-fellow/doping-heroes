# Shop resale — 2026-10-10

Rollback baseline: `2d25af10c96a0d434d77c7c88b6c07ad658c9b09`.

The existing merchant dialog now has buy and sell tabs. Only explicitly owned,
nonconsumable items with a shop price can be sold. Proceeds are floor(shop price
× 70 / 100), using the displayed shop price rather than the base catalog price.
Equipped items cannot be sold. Stage 3 equipment requires a warning confirmation.
Root's virtual all-items entitlement does not authorize a sale.

The existing v25 save API is used: one version-checked Students row write removes
ownership and adds coins. No Apps Script change, sheet schema change, migration,
or new permanent transaction history is needed. The client does not optimistically
apply the sale. An uncertain write retains one candidate and its original revision;
a retry resends that exact request. Revision conflicts adopt the server state and
require the player to inspect the updated balance/inventory. Autosave and further
shop actions cannot overwrite an unresolved sale.

Tests cover actual prices, protected items, equipped items, root virtual inventory,
coin limits, repurchase, preserving progress and PIN fields, server save/reload, and
retry both before and after the server commit. Server tests use a mocked Sheets
service around the existing checked-in v25 server implementation, not live accounts.

## Rollback

Revert the sale feature commit on main and let GitHub Pages redeploy. If newer
unrelated changes exist, revert only this feature's files/hunks rather than resetting
main. The baseline above preserves the pre-sale implementation in Git history.

Rollback removes the UI/functionality, but does not reverse completed sales in
Google Sheets. Sold ownership and credited coins remain valid under the old schema.
Do not restore an old Students sheet over later student progress.
