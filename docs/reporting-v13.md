# v13 누적 학습 기록

이 버전은 기존 번역 퀴즈 API와 호환되며, 기록 저장 방식을 변경합니다.
전체 서버 배포본에서 문제은행 초기 등록용 원본(TRANSLATION_SEED)을 제거했습니다. 기존 비공개 TranslationQuestions 데이터를 사용하며 setupTranslationQuiz는 더 이상 문제를 자동 생성하지 않습니다.
일반 퀴즈·튜토리얼의 서버 출제 이전과 새 학습 콘텐츠 파일 연결은 포함하지 않습니다.

## 배포 순서

1. 기존 Apps Script 프로젝트에서 기존의 전체 `Code.gs` 내용을 `Code_v13.gs`로 교체합니다. 전체 번들과 `Reporting.gs`/`TranslationQuiz.gs`를 동시에 추가하지 마세요. 함수·상수가 중복됩니다.
2. 프로젝트 설정 → 스크립트 속성에 `ROOT_STUDENT_ID`와 `ROOT_NAME`을 추가합니다. 기존 Students의 관리자 행에 있는 ID(앞의 0 포함)와 이름을 그대로 입력하세요. 공개 배포본에는 관리자 신원 값을 넣지 않습니다. 기존 PIN은 바꾸지 않습니다.

   기존 스크립트 속성 `SPREADSHEET_ID`, 인증 관련 속성을 유지합니다. 기존 운영 시트를 사용할 수 있습니다. `setupDopingHeroes`를 재실행하거나 인증 값을 초기화할 필요는 없습니다.
3. 편집기에서 `setupReportingV13`을 실행합니다. 운영 시트에서 기존 `TranslationAttempts`, 기존 누적 탭(있는 경우), `Students.saveJson`의 누적 기록 및 현재 회차의 저장된 답안을 대조합니다. 카운트는 중복 합산하지 않습니다.
4. 새 누적 기록을 쓰고 읽어 검증한 뒤에만 기존 `TranslationAttempts` 탭을 삭제합니다. 정상 SAVE/LOGIN/REGISTER 등의 기존 감사 행은 제거하고 중요 이벤트만 최신순으로 정렬합니다. 실행을 다시 해도 횟수나 보상은 증가하지 않습니다.
5. 배포 → 배포 관리 → 기존 웹 앱 편집 → 새 버전 → 배포를 선택합니다. 기존 `/exec` URL을 유지하면 프런트엔드 URL 변경이 필요 없습니다. 새 배포 URL을 만든 경우 게임의 `CLOUD_API_URL`도 변경해야 합니다.
6. `/exec`에서 `apiVersion: 13`, `release: v13-cumulative-progress`를 확인합니다. 게임에서 한 문제를 제출하고 같은 요청을 다시 보내도 누적 횟수와 보상이 증가하지 않는지 확인합니다. 새 회차의 실제 재도전은 횟수가 증가합니다.

실행 중인 학생이 있다면 짧게 점검 시간을 잡고 전환하세요. 마이그레이션이 학생 저장 revision을 갱신하므로 열린 게임은 새로고침해야 합니다. 새 v13 실행 후에는 구 v12로 되돌려 쓰지 마세요. 구 버전은 삭제된 TranslationAttempts를 사용합니다.

## TranslationProgress

한 행의 고유 키는 `(studentId, questionId)`입니다. `lastAnsweredAt` 내림차순으로 정렬합니다. 저장 시 행 번호를 재사용하지 않고 키로 다시 찾으므로 정렬 후 다른 학생 행을 덮어쓰지 않습니다.

열: studentId, questionId, stage, kind, attempts, correctCount, firstCorrectAt, lastAnsweredAt, lastSelectedOption, lastCorrect, totalRewardDose, totalRewardCoins, rewardTotalsComplete, sourceId, sourcePage.

`rewardTotalsComplete=false`는 과거 보상 영수증이 일부 없어 보상 합계가 확인 가능한 금액만 포함한다는 뜻입니다. 부족한 금액을 추정하거나 학생 보유 코인을 역산하지 않습니다. 과거 기록이 불완전해도 새 보상은 정확하게 누적됩니다. 학생 잔액은 마이그레이션으로 바뀌지 않습니다.

정답·오답·보상·누적값을 먼저 동일한 Students 행에 저장한 다음 누적 표에 절대값을 반영합니다. 중간 장애 후 재전송은 저장된 결과를 재사용하므로 이중 보상을 지급하지 않습니다. 누적 표는 학습 통계용이고 Students가 채점 상태의 기준입니다.

## AuditLog

기록하는 이벤트: ERROR, LOGIN_FAILED, ROOT_LOGIN, STAGE_RELEASE, STAGE_RELOCK, RESET_LEARNING_PROGRESS, REPORTING_MIGRATION.

새 이벤트는 헤더 바로 아래에 삽입합니다. PIN, 인증 토큰, 요청 본문, 예외 스택을 쓰지 않습니다. 동일 요청 종류·학생·오류 코드의 반복 오류는 캐시가 유지되는 동안 60초에 한 번으로 제한합니다. 정상 저장/일반 로그인은 기록하지 않습니다. 자동 30일 삭제는 이 버전에 포함하지 않습니다.

## 범위와 성능

스크립트 잠금은 학생 저장과 요약 갱신의 일관성을 위해 유지됩니다. 30명 동시 사용 부하 시험은 아직 수행하지 않았습니다. 로그 수 감소를 응답 시간 보장으로 간주하지 마세요. 기존 문제은행 원본과 클라이언트 채점 구조는 다음 보안 이전 단계에서 처리합니다.
