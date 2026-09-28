# Curriculum maps v3

| Stage | Name | Runtime asset |
|---|---|---|
| 1 | 결정 동굴 | ./stages/stage-1.webp |
| 2 | 에너지 밴드 계곡 | ./stages/stage-3.webp |
| 3 | 캐리어 습지 | ./stages/stage-4.webp |
| 4 | 드리프트 협곡 | ./stages/stage-6.webp |
| 5 | 확산 사막 | ./stages/stage-7.webp |
| 6 | BJT 오션 | ./stages/stage-10.webp |
| 7 | FET 정글 | ./stages/stage-11.webp |
| 8 | 광전자 협곡 | ./stages-v3/stage-8.webp |
| 9 | 게이트 혁신 도시 | ./stages-v3/stage-9.webp |
| 10 | 기억의 영속성 | ./stages-v3/stage-10.webp |
| 11 | 전력 반도체 요새 | ./stages-v3/stage-11.webp |
| 12 | 첨단 패키징 공장 | ./stages-v3/stage-12.webp |

Stages 1–7 reuse the existing detailed cave, valley, wetland, canyon, desert, ocean and jungle artwork in curriculum order. Stages 8–12 use newly generated maps made with the built-in image generation tool, converted to 1536×1024 WebP.

Generation prompt: One detailed top-down pixel-art RPG map, 1536×1024. No people, UI or text. An empty vertical center path at x=768 and horizontal path at y=500, with a broad clear intersection. Keep scenery off those playable paths. Themes: luminous prism canyon; futuristic fin/nanosheet gate city; ancient memory crystal archive; basalt power fortress with cooling and electric towers; clean advanced chip packaging factory with robotic arms and stacked dies.

The FET process minigame is Stage 7. Stored stage_completed, readBooks and puzzle_completed indices use the current 0–11 curriculum directly. No old/new stage-number conversion or legacy-server transport conversion remains. Runtime quest IDs are still serialized to the current stage indices.

Replace Apps Script with Code_v11.gs and update the existing web-app deployment. In the editor select resetAllLearningProgress and run once. This resets every Students account including root: tutorial_completed, stage_completed, readBooks and puzzle_completed become empty arrays. The saved area is also reset to village, so accounts cannot remain trapped inside a stage after losing tutorial access. The village uses its standard arrival point; no coordinates are persisted. A backup sheet is created first. Existing sheet item ownership is retained as purchased ownership so clearing quest/book records does not remove granted items. XP, coins, equipment, credentials, creation timestamps, and gate releases are preserved. Revisions increment so in-flight old saves conflict instead of restoring cleared records. Refresh all game tabs after execution. Running the function again resets newly accumulated progress too; setup does not run it automatically.

Publishing GitHub Pages alone does not execute this server-side reset.
