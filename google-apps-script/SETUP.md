# Doping Heroes Google Sheets API 설정

1. 비어 있는 Google Sheet를 만들고 `확장 프로그램 → Apps Script`를 엽니다.
2. Apps Script의 `Code.gs` 내용을 모두 지우고 이 폴더의 `Code.gs` 전체를 붙여 넣습니다.
3. Apps Script 왼쪽의 `프로젝트 설정 → 스크립트 속성`에서 다음 속성을 추가합니다.
   - 속성: `ROOT_PIN`
   - 값: root 로그인에 사용할 숫자 6~12자리
4. 편집기 상단 함수 목록에서 `setupDopingHeroes`를 선택해 한 번 실행하고 Google 권한을 승인합니다.
5. 원래 Google Sheet를 새로고침한 뒤 다음 탭이 생겼는지 확인합니다.
   - `Roster`
   - `Students`
   - `StageReleases`
   - `AuditLog`
6. `Roster` 탭의 A열에 게임을 허용할 학생 학번을 입력합니다. B열 이름은 선택 사항입니다. 헤더 아래 한 학생당 한 행을 사용합니다.
7. `배포 → 새 배포 → 웹 앱`을 선택합니다.
   - 실행 계정: `나`
   - 액세스 권한: `모든 사용자`
8. 배포된 `/exec` URL을 복사합니다. 이 URL과 Google Sheet URL을 게임 연동 작업에 사용합니다.

`ROOT_PIN`은 초기화 과정에서 해시로 변환된 후 자동 삭제됩니다. Google Sheet의 공유 설정은 `제한됨`으로 유지합니다.

코드를 수정한 뒤에는 `배포 → 배포 관리 → 수정 → 새 버전 → 배포`를 실행해야 실제 웹 앱에 반영됩니다.

이미 한 번 설정한 프로젝트에 이 버전을 적용할 때도 `setupDopingHeroes`를 다시 실행해 `Roster` 탭을 만든 뒤 새 버전으로 배포합니다. `Roster`에서 학번을 제거하면 해당 학생은 기존 로그인 토큰이 남아 있어도 이후 불러오기와 저장이 차단됩니다.

root 학번이 `99746`으로 보이거나 로그인할 때 행 범위 오류가 발생하면 함수 목록에서 `repairRootAccount`를 한 번 실행합니다. 실행 결과가 `Students!A행 = 099746`으로 표시되는지 확인한 뒤 새 버전으로 배포합니다. 배포 URL을 직접 열었을 때 `"apiVersion":3`와 `"release":"roster-kst-3"`가 표시되어야 최신 배포입니다. 새로 기록되는 모든 시각은 한국 표준시(`+09:00`)로 저장됩니다.
