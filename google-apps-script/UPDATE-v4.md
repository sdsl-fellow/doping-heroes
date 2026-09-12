# v4 적용: 인벤토리 전체 목록과 서울 시간

1. 같은 폴더의 `Code.gs` 전체를 Apps Script 편집기의 기존 `Code.gs`에 붙여 넣고 저장합니다.
2. 함수 목록에서 `setupDopingHeroes`를 실행합니다. 기존 PIN 설정은 유지됩니다.
   - 기존 Students 행의 `items`를 인벤토리 전체 ID로 갱신합니다.
   - Students의 updatedAt/createdAt, StageReleases의 updatedAt, AuditLog의 timestamp에서 UTC/오프셋이 명확한 시간만 서울 시간으로 변환합니다.
   - 시트 시간대를 Asia/Seoul로 설정합니다. 시간대 표시 없는 기존 문자열은 추측하여 바꾸지 않습니다.
   - 진행 기록, 보상, saveJson, PIN은 이 갱신 과정에서 변경하지 않습니다.
3. 배포 → 배포 관리 → 기존 웹 앱의 연필 아이콘 → 버전에서 **새 버전** → 배포를 선택합니다. 기존 /exec URL을 유지합니다.
4. /exec 주소에서 `apiVersion: 4`, `release: inventory-seoul-4`, `serverTime` 끝의 `+09:00`을 확인합니다.

코드 저장이나 setup 실행만으로는 기존 웹 앱 배포가 바뀌지 않습니다.
전체 초기화 없이 재갱신하려면 `repairInventoryAndSeoulTime`만 실행할 수 있습니다.

items는 기본 지급, 퀘스트 해금, 구매·획득, 읽은 강의 노트 및 수량이 있는 소모품의 합집합입니다. root는 전체 60개입니다. `none`은 착용 해제 옵션이므로 아이템이 아닙니다. 소진한 소모품도 기존 인벤토리 정책대로 획득 목록에 남고 수량 0으로 표시됩니다.

개발 시 소유 규칙은 `src/catalog.mjs`에서만 수정한 뒤 `node scripts/sync-apps-script-items.mjs`를 실행합니다. 테스트가 게임/Apps Script의 일치 여부를 검증합니다.
