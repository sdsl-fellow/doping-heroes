# Doping Heroes

## v0.2.1 — 세미 어드벤처

Player-facing branding now uses 세미 어드벤처, 모험가 and 세미 마을.
Gender unspecified selects an animal adventurer, with rabbit/wolf species and
fur colors. Human hairstyles and glasses are hidden for animal faces; clothing
and body choices remain available. Existing v2 saves receive a default species.
Glasses follow the actual human eye coordinates and walking head offsets.

Equipment progression is not implemented: three outfits are freely selectable,
shoes are fixed, and hats are not available. Quest rewards still grant only
semiconductor samples and conductivity-based levels.

대학생용 반도체 학습 2D 웹 RPG. React + TypeScript + Vite + Phaser 3.

## v0.2.0 — Full-screen pixel-art RPG

- Full-screen academy campus with painted environment, independent animated sprites, collision corridors and touch pathfinding
- Character creator: gender (including unspecified), 2 body types, 6 hairstyles, 8 hair colors, 5 skin tones, 3 outfits, 7 outfit colors, optional glasses
- All hair/outfit choices are available regardless of gender; appearance does not affect learning outcomes
- Four-direction walking preview; chosen appearance is used by the in-world sprite and portrait
- Character appearance can be edited later without resetting learning progress
- Overlay HUD, player-location minimap, quest tracker, touch direction pad and interaction button
- v1 local learning saves migrate to v2 automatically; the old save is retained
- Google Sheets, student accounts, multi-device sync and multiplayer remain unimplemented

Original v0.1 learning features retained:

- 이름 및 캐릭터 색상 선택
- 클릭/터치 또는 WASD/방향키로 실리콘 연구소 탐색
- NPC 터치 시 자동 접근 후 대화 (키보드 없이 전체 플레이 가능)
- 가까운 NPC에게 E/Space 또는 대화 버튼으로 대화
- 연구 노트에서 퀘스트를 바로 열 수 있는 접근성 보조 경로
- 순차적 NPC 퀘스트 3개, 오답 힌트, 해설, 중복 보상 방지
- P/B 치환 개념 애니메이션 및 독립 n/p 시료
- 캐리어 농도와 전도도, 최고 컨덕턴스(S = 1/Ω) 기반 성장
- 브라우저 localStorage 자동 저장 (다른 기기와 공유되지 않음)
- 모바일 반응형 UI 및 reduced-motion 지원

## 로컬 실행

Node.js 22 이상 권장.

```sh
npm ci
npm run dev
```

검증: `npm test`, `node --experimental-strip-types scripts/check-character-assets.mjs`, `npm run build`. 빌드 결과는 `dist/`.

## GitHub Pages

Repository Settings → Pages → Build and deployment → Source를 **GitHub Actions**로 설정합니다.
main push 또는 Actions → Build and deploy GitHub Pages → Run workflow로 배포합니다.

예상 주소: https://sdsl-fellow.github.io/doping-heroes/
주소는 배포 성공 이후에만 유효합니다. 커밋 자체가 Pages 활성화를 의미하지는 않습니다.

## 학습 모델

300 K, 완전 이온화, 비축퇴, 고정 이동도 근사. ni = 1e10 cm^-3,
electron mobility = 1350, hole mobility = 480 cm^2/(V s).
전하 중성 및 np=ni²를 사용하고 σ=q(nμn+pμp), 단위 S/cm.
성장은 보유 시료의 최고 컨덕턴스 G로 표시합니다(S = 1/Ω). 고정 시료 단면적 1 cm², 길이 10 μm에서 G = σA/L로 계산합니다. 독립 p형 시료 획득 시에도 최고 G는 감소하지 않습니다.
n형과 p형은 별도 시료입니다. 보상 도핑, 농도 의존 이동도, 온도 변화,
실제 결정구조/원자 비율/축척은 구현하지 않았습니다.

## Google Sheets / Apps Script — 후속 연결

현재 버전은 Google로 어떤 데이터도 전송하지 않습니다. Sheets 저장,
익명 통계, 기기 간 진행 동기화는 아직 미구현입니다.
권장 후속 설계: 교사용 문제 시트 + 버전된 공개 문제 JSON + 검증 가능한
Apps Script 기록 API. 공개 쓰기 엔드포인트에는 입력 검증, 중복 방지,
속도 제한, 개인정보 최소 수집이 필요합니다. 클라이언트 정답 판정과
localStorage 데이터는 변조 가능하므로 성적 평가 근거로 사용하지 마세요.
Google 계정 배포/승인 및 엔드포인트 선택 후 연동을 구현합니다.

## 구조

- src/World.tsx: Phaser 맵, 이동, NPC 상호작용
- src/character.ts, src/Avatar.tsx, src/Creator.tsx: 검증된 외형 설정, 레이어 합성, 제작 화면
- src/navigation.mjs: 보행 구역과 길찾기
- src/main.tsx: 캐릭터, 퀘스트, 시료 관찰 및 로컬 저장
- src/quests.ts: 학습 콘텐츠
- src/physics.mjs: 캐리어/전도도/컨덕턴스 성장 계산
- tests/physics.test.mjs: 물리 계산 회귀 검증
- .github/workflows/pages.yml: 테스트, 빌드, Pages 배포

## Artwork

Campus: AI-generated pixel-art scenery; WebP optimized for delivery.
Characters: Liberated Pixel Cup sprite layers, recolored/composited at runtime.
Detailed per-file author attribution, selected licenses and upstream source URLs:
[public/ART-CREDITS.txt](public/ART-CREDITS.txt), also linked in the in-game help.
Original sprite PNGs are retained in `public/lpc/` for download and reuse under
their stated licenses. No upstream generator application code is incorporated.

## Scope and validation

Campus exterior and three original learning quests are playable. Buildings are
scenery with NPC interaction points, not enterable interiors. The navigation
mask is authored to match the paths, river bridge and plaza. This is not a
tilemap editor or multiplayer server. Portrait mode uses a following camera;
the minimap and quest tracker can navigate to offscreen NPCs.

Validation: TypeScript/build, carrier/level tests, navigation tests and every
body/hair/outfit asset combination. Physical mobile devices and browser-based
end-to-end playthrough have not been tested in this revision.

## v0.3.0 캐릭터와 보상

- 성별: 남성/여성/선택 안 함. 인간은 성별과 독립적인 건장한/날렵한 체형; 선택 안 함은 강아지/고양이.
- 액세서리: 없음/안경/머리띠. 최초 걷기 미리보기 방향은 앞 하나만 선택.
- 기본 티셔츠/신발로 시작. 퀘스트 1: 셔츠·부츠, 2: 모자, 3: 가디건·검. 캐릭터 메뉴에서 획득 장비 착용; 기존 완료 기록에도 소급 해금. 무기는 외형 장비이며 전투는 미구현.
- 이름 아래 학번 입력(문자열, 선행 0 유지). 이전 저장에 학번이 없으면 진행을 보존한 채 입력 요청. 학번은 HUD 및 WebMCP에 노출하지 않음.
- 학번 및 진행은 브라우저 로컬 저장이며 로그인/본인 인증 또는 Google Sheets 동기화가 아님.

## v0.4.0 모험 대륙과 도핑 경험치 (현재 성장 체계)

v0.3의 컨덕턴스(S) 표시는 대체되었습니다. 현재 화면은 첨부 그래프의 비저항 rho(Ω·cm)의 역수인 conductivity(S/cm)를 사용합니다. src/resistivity-data.json은 사용자 제공 그래프(2026-09-11, 608×444 px)를 판독한 log10(N), log10(rho) 쌍입니다. 그래프 영역 x=58..594, y=10..380, N=1e12..1e21, rho=1e4..1e-4에서 n형 빨강/p형 파랑을 0.1 decade 간격으로 판독했습니다. 원자료와 측정 조건이 없는 그림의 근사치이며 정밀 물성 데이터가 아닙니다.

- XP는 도핑 농도. 1e13에서 시작, 1e14~1e21 경계에서 레벨 변경, 마지막 바는 1e20~1e21. 초과분은 1e21에서 제한.
- 레벨 표시는 `Lv. {농도 경계의 전도도} S/cm`; 별도로 1~9 성장 단계를 표시. 구간 내 실제 농도의 전도도는 도핑 가방에서 확인.
- P/B는 같은 농도의 독립 n/p 시료 비교. 종류 전환은 보상 도핑 모델이 아님.
- Dr. 실리콘의 3문제 후 열쇠, 남쪽 다리에서 모험 대륙으로 이동. 남쪽 입구에서 마을로 귀환.
- 한 대륙 안에 8개 별도 생태 지역과 NPC/주차 퀘스트. 열쇠 이후 순서 무관. 실제 강의계획서 미제공으로 기초 8주 주제를 임시 구성.
- 보상은 불순물·코인, 튜토리얼은 추가 장비. 중복 지급 방지. 상점은 코인으로 구간 10% 불순물 팩 및 장비 구매; 상점 전용 모자·설산 부츠 제공.
- 결정 동굴은 1e13~1e21 농도에서 n/p 비저항·전도도 무료 비교. 실험 슬라이더는 XP에 영향 없음.
- 강아지·고양이는 LPC의 네 발 동물 보행. 모자/액세서리 착용 가능; 인간 복장·신발·검은 인간 외형에서 사용.
- v1/v2 기존 완료 기록과 학번/외형은 v3 저장 형식으로 이전. 브라우저 로컬 저장이며 Google Sheets/학생 인증은 미연결.

## v0.4.1 캐릭터 생성과 인벤토리

- 학번: ASCII 숫자 정확히 8자리. 선행 0 유지. 이전 저장의 학번이 규칙에 맞지 않으면 학번만 다시 입력하며 진행은 보존.
- 걷기 미리보기 순서: 앞/뒤/왼쪽/오른쪽, 앞 기본 선택.
- 복장 3종은 기본 제공. 여행자 셔츠는 칼라와 단추가 있는 셔츠 레이어로 교체.
- 캐릭터 생성에는 신발/모자/무기 선택을 표시하지 않음. 별도 인벤토리에서 보유 장비의 실제 아이콘과 이름을 표시하며 클릭 즉시 착용/저장.
- 강아지는 복실한 연한 회색 네 발 캐릭터로 교체.
- 재접속 시 항상 세미 마을에서 시작. 진행/보유 장비는 유지. 마을 전체 지도에서 열쇠 획득 후 주제별 지역으로 출발 가능.
- FET 정글/BJT 오션/Power 반도체 동굴은 사용자와 추후 정할 명칭이며 현재 맵 이름으로 확정하지 않음.

## v0.5.0 12개 독립 Stage 맵

- 세미 마을 남쪽 다리를 건너면 대륙 북쪽 (768,200)에 앞 방향으로 등장하며 아래로 걸어 내려옵니다. 대륙의 위쪽 출구는 마을로 연결됩니다.
- 대륙은 12개 관문의 허브입니다. 관문 클릭/직접 보행 진입 시 `stage-1`~`stage-12` 별도 Phaser 맵으로 전환합니다. 각 Stage는 독립 배경, 이동 경로, NPC와 퀘스트가 있습니다.
- Stage의 위쪽 출구는 해당 대륙 관문 앞 안전한 위치로 복귀합니다. 자동 재진입을 피하도록 관문 중심에서 떨어져 배치합니다.
- 이름: Stage 1. 결정 동굴 / 2. 격자 유적 / 3. 에너지 밴드 계곡 / 4. 캐리어 습지 / 5. 도핑 광산 / 6. 드리프트 협곡 / 7. 확산 사막 / 8. PN 접합 다리 / 9. 다이오드 용암 공방 / 10. BJT 오션 / 11. FET 정글 / 12. Power 반도체 동굴.
- 기존 8개 퀘스트 ID와 완료 기록은 유지하며 새 4개 퀘스트를 추가합니다(튜토리얼 포함 총 15개). 전도도/도핑 성장 상한은 동일합니다.
- 접속 시 항상 세미 마을에서 시작합니다. 실제 주차별 강의계획서가 제공되지 않아 주제 명칭과 기본 문제는 초기 구성입니다.

## v0.5.1 관문과 HUD

- PC: Stage 모험 목록을 미니맵 왼쪽으로 이동하고 높이를 제한해 지도 라벨 가림 방지.
- 모바일/태블릿: 미니맵을 우측 상단에 고정하고 플레이어 정보와 나란히 배치.
- 12개 관문은 주제별 투명 배경 그림을 사용하며 라벨은 관문 아래에 배치. 그림과 라벨 영역 터치 모두 관문으로 이동.
- 여성은 건장한/날렵한 선택을 유지하면서 남성 대비 몸통·팔다리를 조금 더 가늘게 하고 허리를 완만하게 좁힘. 헤어·안경 위치와 보유 장비는 유지.

### v0.6.0
- Quest rewards animate ion implantation into the customized character, showing concentration and sample conductivity before/after, with a level-up pulse at decade thresholds. Reduced-motion preferences are respected.
- Continent: 3 rows × 4 columns, longer northern approach, themed gates with smaller labels above them, floating silicon crystal at Stage 1.
- Desktop minimap and adjacent quest panel enlarged; mobile movement controls separated from guidance. Concentration uses one decimal in scientific notation.

### v0.7.0
- Twelve native 1536×1024 stage backgrounds replace the magnified 362px atlas frames; village, hub and stages share world dimensions and camera scale.
- Winding continent roads use matching walkable centerlines; the silicon crystal is inset into the Stage 1 gateway.
- Rewards rise by visible Stage order. Tutorial + twelve quests total 9.5e20 cm⁻³ without shop purchases; completion order remains unrestricted. Existing earned progress is preserved.
- Annealing uses orange/red heat effects. Conductivity labels consistently reflect the current concentration; decade thresholds still trigger the level-up animation. The reward character label updates when implantation completes.
