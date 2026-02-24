# 품의서 수정/회수 규칙 (확정 2026-02-23)

## 수정 규칙 (상태별)

### 1. DRAFT → 자유 수정
- 기존 PUT API 그대로
- 제한 없음

### 2. PENDING ~ PENDING_CEO → 수정 시 자동 회수
- PUT 요청이 오면:
  1. 상태를 DRAFT로 변경
  2. 서명 정보 전부 초기화:
     - salesManagerId = null, salesManagerSignedAt = null
     - teamLeaderId = null, teamLeaderSignedAt = null
     - ceoId = null, ceoSignedAt = null
  3. 요청된 수정 내용 반영
- 별도 회수 API 불필요 (수정 = 자동 회수)
- 작성자만 호출 가능
- DRAFT가 되면 결재자 목록에서 사라짐 (기존 DRAFT 가시성 규칙)

### 3. APPROVED → 수정 시 revise (새 버전)
- 기존 revise API 사용
- 기존 버전: APPROVED 유지, isLatest=false
- 새 버전: DRAFT, isLatest=true
- sourceProductId/sourceItemId로 품목 추적
- 새 버전 승인 시 계산서 변경 분석 (신규/수정/삭제/유지)

## WITHDRAWN 상태
- 사용하지 않음 (스키마에서 제거 가능)
- 회수 = DRAFT로 되돌리기

## 가시성 규칙
- DRAFT: 작성자만
- PENDING ~ PENDING_CEO: 전체 (결재자 포함)
- APPROVED: 전체
- REJECTED: 전체
