# v5 완료 기록 분리

`saveJson`과 로컬 저장 JSON의 `completed`를 다음 두 필드로 분리합니다.

- `tutorial_completed`: 0~2
- `stage_completed`: 0~11 (기존 퀘스트 ID 3~14에서 3을 뺀 값)
- `readBooks` 등 다른 게임 데이터는 그대로 유지합니다.

1. v5 전체 코드를 Apps Script의 기존 Code.gs에 붙여 넣고 저장합니다.
2. `migrateCompletionFields`를 실행하면 기존 학생과 root의 saveJson이 변환됩니다. 각 변경 행은 revision만 1 증가하며, 보상이나 시간 기록은 바꾸지 않습니다. 재실행은 안전합니다.
3. 배포 관리에서 기존 웹 앱을 **새 버전**으로 배포합니다. 기존 /exec URL을 유지합니다.
4. 응답의 `apiVersion: 5`, `release: completion-split-5`를 확인하고 게임을 새로고침합니다.

`setupDopingHeroes`를 실행해도 완료 기록 변환이 수행됩니다.

게임 내부의 퀘스트 ID는 호환성을 위해 통합 목록으로 계산하지만 저장 JSON에는 두 필드만 기록합니다. 기존 `completedStages` 요약 열은 이번 JSON 변경 범위에서 제외하여 종전 값을 유지합니다.

게임과 Apps Script 배포 시점이 달라도 기록이 사라지지 않도록, 전송 요청에는 임시 호환용 `completed`도 포함합니다. v5 서버는 이를 저장하지 않습니다. 신규 서버는 기존 클라이언트의 completed-only 요청도 변환합니다.
