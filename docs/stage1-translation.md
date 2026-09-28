# Stage 1 원서 번역 퀴즈 · v12

적용 범위: Stage 1 오른쪽 기존 길(x=1000, y=465)의 책을 터치하거나 가까이서 대화하면 시작합니다. 다른 스테이지·관문·기존 퀴즈·책·퍼즐의 규칙은 변경하지 않습니다.

## 관리자 적용
1. `google-apps-script/Code_v12.gs` 전체를 기존 Apps Script의 Code.gs 내용으로 교체하고 저장합니다. 이 파일 하나에 번역 퀴즈 코드와 30문제가 포함되어 있으므로 다른 .gs 파일을 추가하지 않습니다.
2. 함수 목록에서 `setupTranslationQuiz`를 한 번 실행합니다. 기존 SPREADSHEET_ID 설정을 사용하며 TranslationQuestions와 TranslationAttempts 시트를 준비합니다. 기존 게임의 setup/reset 함수는 실행하지 않습니다.
3. 배포 관리에서 기존 웹 앱의 편집 → 새 버전으로 업데이트합니다. 기존 /exec URL을 유지합니다.
4. 게임을 새로고침하고 Stage 1 오른쪽 책 → 5문제 시작으로 확인합니다.

## 문제 편집과 추가
TranslationQuestions의 한 행이 한 문제입니다. 초기 문제는 첨부된 35쪽 자료 `[SE] 01. Crystal Properties and Growth of Semiconductor.pdf`에 근거한 용어 9개·문장 21개이며, 문장은 번역 훈련에 맞게 간결하게 재구성했습니다. 각 행에 출처 페이지를 넣었습니다.

- questionId: 변경하지 않는 고유 ID. 초기값 S1-CRYSTAL-001~030. 새 문제는 새 ID를 사용합니다(영문·숫자·하이픈·밑줄).
- stage: 현재 시범 서비스는 숫자 1만 읽습니다.
- kind: term 또는 sentence.
- english: 영문 용어/문장.
- optionA~optionD: 서로 다른 한국어 보기 네 개.
- correctOption: A/B/C/D 중 하나. 시트의 보기 ID이며 게임에서는 보기 순서가 섞입니다.
- explanation: 간단한 한국어 해설.
- sourceId/sourceTitle/sourcePage: 자료 식별자, 제목, PDF 페이지 번호. 추가 PDF에는 새 sourceId를 사용합니다.
- active: TRUE이면 출제, FALSE이면 제외. 기록이 있는 문제는 삭제 대신 비활성화를 권장합니다.
- rewardDose: 최초 정답 도핑 경험치. 기본 1e12 cm⁻³.
- rewardCoins: 최초 정답 코인. 기본 10이며 10의 배수로 입력합니다.

setupTranslationQuiz는 없는 초기 ID만 추가합니다. 이미 존재하는 행의 직접 수정 내용을 덮어쓰지 않습니다. 추가 문제는 새 행으로 입력할 수 있으며 고정된 문제 수 제한은 없습니다. 문제 의미를 완전히 바꿀 때는 새 ID를 써야 최초 보상 이력이 섞이지 않습니다. 편집/비활성화는 새 회차부터 적용되며, 진행 중인 회차는 출제 당시 내용을 유지합니다.

## 출제와 보상
매회 5개를 중복 없이 추출합니다. 용어 1개+문장 4개 또는 용어 2개+문장 3개를 같은 확률로 선택합니다(평균 30:70). 문제 순서와 보기 순서를 모두 섞습니다. 활성 용어 2개·문장 4개 이상이 필요합니다.

문제별 첫 정답은 기본 보상, 이후 정답은 기본 보상의 1/10입니다. 오답은 보상이 없고 같은 회차의 답안을 바꿔 다시 받을 수 없습니다. 새 회차에서 재도전할 수 있습니다. 기존 도핑/코인 상한에 도달하면 실제 증가량만 지급합니다. 현재 회차는 24시간 유효하며 새 회차를 시작하면 이전 회차는 종료됩니다.

## 별도 기록
- Students의 saveJson.translation_progress.questions: 문제별 attempts, correctCount, firstCorrectAt, lastAnsweredAt. 기존 tutorial_completed, stage_completed, readBooks, puzzle_completed와 별개입니다.
- TranslationAttempts: 제출별 학생 ID, 회차/문제 ID, 선택·정답, 정오 여부, 최초/복습 여부, 실제 지급 경험치/코인, 한국시간 제출 시각, 출처.
- active 회차의 서버 내부 스냅샷에는 정답·보기·제출 영수증을 보관합니다. 정답표는 학생 응답에 미리 노출하지 않습니다.

정답 판정과 보상은 서버에서 처리합니다. 답안 영수증과 보상은 동일한 Students 행에 한 번에 저장하며, 응답이 늦어 재시도해도 같은 회차/문제에 중복 보상을 주지 않습니다. TranslationAttempts 동기화가 실패하면 같은 답안 재제출로 복구합니다. 일반 저장/장비 저장은 서버의 번역 기록을 보존합니다.

검증: 기존 기능 전체 테스트 81개 통과 후, 시트 재설정 시 직접 수정 보존 테스트 추가 통과(총 82개). 배포 전 빌드 통과. 실제 Google Sheets 적용은 위 관리자 단계가 필요합니다.
