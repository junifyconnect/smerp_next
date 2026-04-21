---
feature: MA 품의서
domain: MA
nature: ui_center
status: 진행중
progress: 60
last_reviewed: 2026-04-20
_files:
  - "app/(main)/ma/approvals/**"
  - "app/api/ma-approvals/**"
  - "components/documents/MADocumentForm.tsx"
---

# MA 품의서 🟡

유지보수(MA) 건에 대한 사내 결재 품의서를 작성하고 관리한다. CRUD는 구현되어 있으며, 결재 워크플로우는 영업 품의서와 동일한 3단계 구조(담당자 → 팀장 → CEO)로 확정되었으나 아직 구현 전이다. 승인 시 MAContract와 MABilling이 자동 생성되는 트리거도 포함된다.

**진행률** ████████████░░░░░░░░ 60%

## 사용자 플로우

1. MA 품의서 목록에서 신규 작성 또는 엑셀 업로드
2. MA 전용 품목 추가 (SM코드/Vendor코드/매출처/매입처/청구구분/시작일/종료일)
3. 저장 (작성자 ID는 현재 더미값 `"dummy-user-id"` — 인증 연동 미완)
4. (미구현) 담당자 → 팀장 → CEO 3단계 결재 상신 및 서명 프로세스
5. (미구현) CEO 승인 시 MAContract 1건 + 계약 기간 × 12개월만큼의 MABilling 자동 생성

## 완료

- ✅ MA 품의서 CRUD (목록/상세/생성/수정)
- ✅ 검색, 상태 필터, 페이지네이션
- ✅ 엑셀 업로드 파싱
- ✅ MA 전용 품목 구조 (MAApprovalItem: smCode/vendorCode/salesCompany/purchaseCompany/billingType)
- ✅ 품의번호 자동 생성 (MA-YYYY-NNNN)
- ✅ 결재 프로세스 설계 확정 (영업 품의서와 동일한 3단계: salesManagerId/teamLeaderId/ceoId)

## 남은 것

- ❌ MAApproval 스키마에 결재 필드 추가 (salesManagerId/teamLeaderId/ceoId + 각 단계 서명/반려 필드)
- ❌ `/api/ma-approvals/[id]/sign` API 구현 (기존 `app/api/sales-approvals/[id]/sign/route.ts` 구조 재사용)
- ❌ 상신/반려 API + 3단계 서명 UI
- ❌ CEO 승인 시 자동 생성 트랜잭션: MAContract 1건 + 계약 기간 × 12개월만큼의 MABilling N건 동시 생성
- ⏳ 인증된 사용자 ID 연동 (현재 `createdById = 'dummy-user-id'` TODO)

## 관련 화면

- `/ma/approvals` (MA 품의서 목록)
- `/ma/approvals/new` (신규 작성)
- `/ma/approvals/[id]` (상세 조회)
- `/ma/approvals/[id]/edit` (수정)

---

<details>
<summary>🔧 기술 정보 (개발자용)</summary>

**Entry points**
- `app/(main)/ma/approvals/page.tsx` — MA 품의서 목록
- `app/api/ma-approvals/route.ts` — CRUD API (TODO: 실제 인증된 사용자 ID 사용)
- `app/api/ma-approvals/parse/route.ts` — 엑셀 파싱
- `app/api/ma-approvals/upload/route.ts` — 엑셀 업로드

**주요 라이브러리**: exceljs

**의존성 서비스**: PostgreSQL (Prisma — MAApproval/MAApprovalItem/MAApprovalPurchaseItem[deprecated], 결재 반영 후 MAContract/MABilling 추가 예정)

**설계 근거**: `planning/04-3-ma-design.md`에 SalesApproval과 동일 구조(salesManagerId/teamLeaderId/ceoId) + MAContract/MABilling 스키마 상세 정의 완료.

</details>
