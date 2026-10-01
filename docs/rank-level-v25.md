# Lv. ranking — v25-rank-level-20261001

Character growth ranking uses the Lv. shown in the HUD: conductivity in S/cm,
rounded to three significant digits. The server uses the same digitized n/p
resistivity curves and logarithmic interpolation as `src/progression.mjs`.

- Calculate Lv. for every eligible saved character before sorting and selecting
  TOP 10. The student's own rank comes from the same complete sorted list.
- Equal displayed Lv. values share competition ranks (1, 1, 3). Student IDs only
  stabilize the order within ties and are never included in the public payload.
- Keep root/flagged-account exclusions, masked names, and the 60-second cache.
  A new cache key prevents reuse of a previous doping-ranked snapshot.
- Return `rank.metric: "level"` and `entry.level` to the game. During rollout,
  the new game still describes old-server responses as doping-ranked.
- No new Students columns or progress migration is required.

## Deployment order

1. Replace the existing project's **Code.gs** with the complete contents of
   `google-apps-script/Code_v25_Stage2.gs`. Do not add it alongside the old Code.gs
   or run setup/reset/migration functions for this ranking change.
2. Update the existing web app via **Deploy → Manage deployments → Edit → New
   version → Deploy**. This keeps the current `/exec` URL. If a separate deployment
   is created, supply its new `/exec` URL for `src/cloud.ts`.
3. Verify GET `/exec` reports `release: "v25-rank-level-20261001"` and
   `apiVersion: 25`. Verify an authenticated rank response reports
   `rank.metric: "level"`, with matching HUD Lv. values and shared ranks.
4. Merge the tested game changes into main and verify the GitHub Pages workflow.

After editing the client curves or interpolation, run
`node scripts/sync-apps-script-rank.mjs` and redeploy the server. The ranking tests
check generated-code freshness and server/client agreement over both curves.
