---
feature: MA 품의서
domain: MA
nature: ui_center
status: 진행중
progress: 60
last_reviewed: 2026-04-22
_files:
  - "app/(main)/ma/approvals/**"
  - "app/api/ma-approvals/**"
  - "components/documents/MADocumentForm.tsx"
---

# MA 품의서 🟡

유지보수(MA) 건에 대한 사내 결재 품의서를 작성하고 관리한다. CRUD는 구현되어 있으며, 결재 워크플로우는 영업 품의서와 동일한 3단계 구조(담당자 → 팀장 → CEO)로 확정되었다. 승인 시 `MAContract` 1건 + 계약 기간(월 단위)만큼의 `MABilling` N건이 자동 생성된다. **설계 기준은 `BUSINESS_RULES.md` §10 참조.**

**진행률** ████████████░░░░░░░░ 60%

## 사용자 플로우

1. MA 품의서 목록에서 신규 작성 또는 엑셀 업로드
2. MA 전용 품목 추가 (SM코드/Vendor코드/매출처/매입처/청구구분/시작일/종료일/월청구일)
3. 저장 (작성자 ID는 현재 더미값 `"dummy-user-id"` — 인증 연동 미완)
4. (미구현) 담당자 → 팀장 → CEO 3단계 결재 상신 및 서명 프로세스
5. (미구현) CEO 승인 시 자동 생성:
   - `MAContract` 1건
   - `MABilling` N건 (시작 월 ~ 종료 월까지 월별 1건씩, **일할 계산 없음 — 양 끝 월도 통째로 1개월치**)
   - 각 MABilling은 `isActive=true`로 시작, 경영팀이 월별로 계산서 발행 시 `InvoiceRecord` 파생

## 설계 규칙 요약 (`BUSINESS_RULES.md` §10)

- **원장 역할**: `MABilling` = MA 전용 원장 (영업의 `SalesLedger`/`PurchaseLedger`와 병렬 존재)
- **계산서**: `InvoiceRecord` 단일 진실 소스 — MABilling에서 `/api/management/invoices/issue` 호출 시 파생 생성
- **revise**: v2 승인 시 v1 MABilling `isActive=false`, ISSUED 계산서 → `NEEDS_AMENDMENT`, PENDING 계산서 → `CANCELLED`
- **세금**: VAT 10% 고정, **카테고리**: MA 고정 (UI 선택 없음)
- **청구 기준일**: `MAApprovalItem.billingDayOfMonth` (기본 31 = 말일, 계약마다 설정 가능)

## 완료

- ✅ MA 품의서 CRUD (목록/상세/생성/수정)
- ✅ 검색, 상태 필터, 페이지네이션
- ✅ 엑셀 업로드 파싱
- ✅ MA 전용 품목 구조 (MAApprovalItem: smCode/vendorCode/salesCompany/purchaseCompany/billingType)
- ✅ 품의번호 자동 생성 (MA-YYYY-NNNN)
- ✅ 결재 프로세스 설계 확정 (영업 품의서와 동일한 3단계: salesManagerId/teamLeaderId/ceoId)
- ✅ 원장·계산서 연동 설계 확정 (2026-04-22, `_결정대기.md` #1 B+B-2 결정)

## 남은 것

### 스키마
- ❌ `MAApproval`에 결재 필드 추가 (salesManagerId/teamLeaderId/ceoId + 각 단계 서명/반려 필드)
- ❌ `MAApprovalItem.billingDayOfMonth Int? @default(31)` 추가
- ❌ `MAContract` 모델 신설
- ❌ `MABilling` 모델 신설 — 필드: billingMonth, dueDate, amount, invoiceStatus, isActive, cancelReason, maContractId, approvalVersion

### API
- ❌ `/api/ma-approvals/[id]/sign` — 3단계 결재 서명 (`app/api/sales-approvals/[id]/sign/route.ts` 구조 재사용)
- ❌ CEO 승인 시 트랜잭션: MAContract + MABilling N건 자동 생성
- ❌ 상신/반려/회수 API
- ❌ `/api/management/invoices/issue` 개정 — MABilling 소스로 호출 시 InvoiceRecord 파생 생성 로직 추가
- ❌ 집계 API 확장: `경영 통계`, `매출장 매입장` 등에서 MABilling UNION

### UI
- ❌ 3단계 서명 UI (영업 품의서 UI 패턴 재사용)
- ❌ 청구 기준일(`billingDayOfMonth`) 입력 필드 추가
- ❌ 계산서 발행 현황 페이지에서 MA 행도 표시 (기존 InvoiceRecord 기반이므로 파생 생성 로직 완료 시 자동 반영)

### 인증
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
