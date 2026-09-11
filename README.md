# Doping Heroes

대학생용 반도체 학습 2D 웹 RPG. React + TypeScript + Vite + Phaser 3.

## v0.1.0

- 이름 및 캐릭터 색상 선택
- 클릭/터치 또는 WASD/방향키로 실리콘 연구소 탐색
- NPC 터치 시 자동 접근 후 대화 (키보드 없이 전체 플레이 가능)
- 가까운 NPC에게 E/Space 또는 대화 버튼으로 대화
- 연구 노트에서 퀘스트를 바로 열 수 있는 접근성 보조 경로
- 순차적 NPC 퀘스트 3개, 오답 힌트, 해설, 중복 보상 방지
- P/B 치환 개념 애니메이션 및 독립 n/p 시료
- 캐리어 농도와 전도도, 최고 전도도 기반 레벨
- 브라우저 localStorage 자동 저장 (다른 기기와 공유되지 않음)
- 모바일 반응형 UI 및 reduced-motion 지원

## 로컬 실행

Node.js 22 이상 권장.

```sh
npm ci
npm run dev
```

검증: `npm test`, `npm run build`. 빌드 결과는 `dist/`.

## GitHub Pages

Repository Settings → Pages → Build and deployment → Source를 **GitHub Actions**로 설정합니다.
main push 또는 Actions → Build and deploy GitHub Pages → Run workflow로 배포합니다.

예상 주소: https://sdsl-fellow.github.io/doping-heroes/
주소는 배포 성공 이후에만 유효합니다. 커밋 자체가 Pages 활성화를 의미하지는 않습니다.

## 학습 모델

300 K, 완전 이온화, 비축퇴, 고정 이동도 근사. ni = 1e10 cm^-3,
electron mobility = 1350, hole mobility = 480 cm^2/(V s).
전하 중성 및 np=ni²를 사용하고 σ=q(nμn+pμp), 단위 S/cm.
레벨은 보유 시료 최고 전도도의 초기값 대비 10배 증가마다 +1 (상한 Lv.6).
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
- src/main.tsx: 캐릭터, 퀘스트, 시료 관찰 및 로컬 저장
- src/quests.ts: 학습 콘텐츠
- src/physics.mjs: 캐리어/전도도/레벨 계산
- tests/physics.test.mjs: 물리 계산 회귀 검증
- .github/workflows/pages.yml: 테스트, 빌드, Pages 배포

맵과 캐릭터는 초기 기능 검증용 기하학적 표식입니다. 픽셀 아트와
스프라이트 애니메이션, 추가 맵, 충돌 지형 등은 후속 제작 대상입니다.
