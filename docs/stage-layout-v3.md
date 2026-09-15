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

The FET process minigame moves from Stage 11 to Stage 7. Quest identity remains stable, while completion_schema:3 and stage_layout:3 identify the new map numbering. Legacy stage completion, readBooks, puzzle_completed and area values are remapped exactly once. Before a v9 server is installed, the client converts stage indices at the v8 transport boundary.

To display the new stage indices in Google Sheets, replace the current Apps Script source with Code_v9.gs, update the existing web-app deployment, then run migrateStageLayout once. Repeat runs are safe. Gate release flags remain attached to gate numbers; no gate is newly released by this patch. Coins, XP and owned equipment are preserved.
