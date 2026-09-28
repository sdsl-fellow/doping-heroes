# v6: 퍼즐 완료 기록과 Students 열 정리

1. 모든 게임 탭을 닫고 시트 셀 편집도 종료합니다.
2. DopingHeroes-v6.gs 전체를 기존 Apps Script Code.gs에 붙여 넣고 저장합니다.
3. `setupDopingHeroes` 실행: Students 백업 탭 생성 → completedStages 열 제거 → 기존 saveJson 변환. 다른 열과 PIN은 보존됩니다. 열을 직접 삭제할 필요는 없습니다.
4. 기존 웹 앱을 **새 버전**으로 배포합니다. 새 배포를 만들지 않고 /exec URL을 유지합니다.
5. /exec 응답에서 `apiVersion: 6`, `release: puzzle-stage-6`을 확인한 뒤 게임을 새로 엽니다.

기존 completedStages 열은 Students_backup_v6_… 탭에 복구 가능한 사본이 남습니다. 백업도 학생 데이터/PIN 해시가 포함된 비공개 탭이므로 공유하지 마세요.

새 JSON은 tutorial_completed (0~2), stage_completed (0~11), puzzle_completed (0~11)를 사용합니다. 기존 fetPuzzleCompleted=true는 FET 정글인 Stage 11의 인덱스 **10**으로 변환됩니다. 현재 구현된 퍼즐은 FET 하나이며 다른 스테이지 퍼즐을 새로 추가하지는 않습니다.

기존 퀘스트 ID와 실제 스테이지 순서는 다릅니다. v6는 실제 맵 순서 [3,11,4,5,6,7,8,9,12,13,10,14]를 사용하고 v5 저장값도 교정합니다. completion_schema:2는 이 변환을 한 번만 수행하기 위한 표시입니다.

업데이트 중에는 구버전 웹 앱이 새 열 구조에 쓰지 않도록 게임을 닫아두세요. 시트 마이그레이션 후 새 버전 배포까지 마친 다음 사용합니다.
