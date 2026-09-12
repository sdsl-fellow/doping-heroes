# Doping Heroes Google Sheets API 설정

1. 비어 있는 Google Sheet를 만들고 `확장 프로그램 → Apps Script`를 엽니다.
2. Apps Script의 `Code.gs` 내용을 모두 지우고 이 폴더의 `Code.gs` 전체를 붙여 넣습니다.
3. Apps Script 왼쪽의 `프로젝트 설정 → 스크립트 속성`에서 다음 속성을 추가합니다.
   - 속성: `ROOT_PIN`
   - 값: root 로그인에 사용할 숫자 6~12자리
4. 편집기 상단 함수 목록에서 `setupDopingHeroes`를 선택해 한 번 실행하고 Google 권한을 승인합니다.
5. 원래 Google Sheet를 새로고침한 뒤 다음 탭이 생겼는지 확인합니다.
   - `Students`
   - `StageReleases`
   - `AuditLog`
6. `배포 → 새 배포 → 웹 앱`을 선택합니다.
   - 실행 계정: `나`
   - 액세스 권한: `모든 사용자`
7. 배포된 `/exec` URL을 복사합니다. 이 URL과 Google Sheet URL을 게임 연동 작업에 사용합니다.

`ROOT_PIN`은 초기화 과정에서 해시로 변환된 후 자동 삭제됩니다. Google Sheet의 공유 설정은 `제한됨`으로 유지합니다.

코드를 수정한 뒤에는 `배포 → 배포 관리 → 수정 → 새 버전 → 배포`를 실행해야 실제 웹 앱에 반영됩니다.

