---
feature: MA 품의서
domain: MA
nature: ui_center
status: 완료
progress: 95
last_reviewed: 2026-04-22
_files:
  - "app/(main)/ma/approvals/**"
  - "app/api/ma-approvals/**"
  - "app/api/ma-approvals/[id]/sign/**"
  - "app/api/ma-approvals/[id]/submit/**"
  - "app/api/ma-approvals/[id]/reject/**"
  - "app/api/ma-approvals/[id]/withdraw/**"
  - "components/documents/MADocumentForm.tsx"
  - "components/documents/ApprovalLineModal.tsx"
  - "lib/ma/billing-cycle.ts"
  - "lib/ma/billing-schedule.ts"
---

# MA 품의서 🟢

유지보수(MA) 건에 대한 사내 결재 품의서를 작성하고 관리한다. 2026-04-22 PR #9~#15 시리즈로 **스키마(MAContract/MABilling)/3단계 결재/CEO 승인 시 원장 자동 생성/InvoiceRecord 파생/revise 전이/집계 UNION/결재선 모달/청구 기준일 UI**가 전부 구현 완료되었다. 설계 기준: `BUSINESS_RULES.md` §5 + §10 (결정대기 #1 B+B-2, #3 C 확정).

**진행률** ███████████████████░ 95%

## 사용자 플로우

1. MA 품의서 목록에서 신규 작성 또는 엑셀 업로드
2. MA 전용 품목 추가 (SM코드/Vendor코드/매출처/매입처/**청구주기(billingCycle 드롭다운: 매월/격월/분기/반기/연간/일시불)**/시작일/종료일/**월청구일(billingDayOfMonth 입력, 기본 31)**)
3. 저장 (DRAFT)
4. **상신 버튼 → `<ApprovalLineModal>`**에서 결재자 3명 지정 (영업담당/팀장/CEO) → PENDING_TEAM_LEAD
5. 팀장 서명(PENDING_CEO) → CEO 서명(APPROVED) — `sign API`는 TEAM_LEADER/CEO 단계만 처리
6. CEO 승인 시 트랜잭션으로 자동 생성 (BUSINESS_RULES §10.2):
   - `MAContract` 1건 (품의서 단위)
   - `MABilling` N건 — `buildBillingSchedule`이 시작 월~종료 월 중 주기에 해당하는 월만 생성 (월 단위, **일할 계산 없음**)
   - 각 MABilling은 `isActive=true` + invoiceStatus=PENDING(아직 InvoiceRecord 없음)
7. 경영팀이 매월 계산서 발행 시 `/api/management/invoices/issue` 호출 → MABilling 기반 `InvoiceRecord`(source=MA_BILLING) **파생 생성 + ISSUED 전이** (BUSINESS_RULES §10.1 B-2)
8. 수정 필요 시 revise — v1 MABilling `isActive=false`, ISSUED 파생 InvoiceRecord → `NEEDS_AMENDMENT`, PENDING → `CANCELLED(REVISED_v{n})`

## 설계 규칙 요약 (`BUSINESS_RULES.md` §10)

- **원장 역할**: `MABilling` = MA 전용 원장 (영업의 `SalesLedger`/`PurchaseLedger`와 병렬 존재)
- **계산서**: `InvoiceRecord` 단일 진실 소스 — MABilling에서 `/api/management/invoices/issue` 호출 시 파생 생성 (`source=MA_BILLING`, `maBillingId` 세팅)
- **revise**: v2 승인 시 v1 MABilling `isActive=false`, ISSUED 계산서 → `NEEDS_AMENDMENT`, PENDING 계산서 → `CANCELLED`
- **세금**: VAT 10% 고정, **카테고리**: MA 고정 (UI 선택 없음)
- **청구 기준일**: `MAApprovalItem.billingDayOfMonth` (기본 31 = 말일, 계약마다 설정 가능, `billing-schedule.ts`가 월 말일로 자동 clamp)

## 완료

### 스키마 (PR #9)
- ✅ `MAContract` 모델 신설 (품의서 승인 시 생성되는 계약 레코드)
- ✅ `MABilling` 모델 신설 — `billingMonth`, `dueDate`, `supplyAmount`/`vatAmount`/`totalAmount`, `invoiceStatus`, `isActive`, `cancelReason`, `maContractId`, `approvalVersion`
- ✅ `MAApproval` 결재 필드 추가 — `salesManagerId`/`teamLeaderId`/`ceoId` + 각 단계 서명/반려 필드
- ✅ `MAApprovalItem.billingDayOfMonth Int? @default(31)` 추가
- ✅ `BillingCycle` enum (매월/격월/분기/반기/연간/일시불), `MAApprovalItem.billingCycle` 필드 추가

### API (PR #10, #13)
- ✅ `POST /api/ma-approvals/[id]/submit` — 상신 시 body로 결재자 3명 수신 + 영업담당 서명 기록 (BUSINESS_RULES §5)
- ✅ `POST /api/ma-approvals/[id]/sign` — TEAM_LEADER/CEO 단계 서명 + **CEO 승인 시 MAContract + MABilling N건 트랜잭션 생성** (`buildBillingSchedule` 사용, BUSINESS_RULES §10.2)
- ✅ `POST /api/ma-approvals/[id]/reject` — 반려 (사유 기록 + 이전 단계로 복귀)
- ✅ `POST /api/ma-approvals/[id]/withdraw` — 회수 (PENDING 계열 → DRAFT, 서명 초기화)
- ✅ `/api/management/invoices/issue` MABilling 소스 지원 — body `{ maBillingId, invoiceType }` 전달 시 InvoiceRecord(source=MA_BILLING) 파생 생성 + ISSUED 세팅 (PR #13)
- ✅ `/api/management/invoices/amend` — 원본의 `source`/`maBillingId` 복제하여 체인 유지
- ✅ revise API — ISSUED 파생 InvoiceRecord → `NEEDS_AMENDMENT`, PENDING → `CANCELLED(REVISED_v{n})` 전이

### UI (PR #12, #15)
- ✅ 3단계 서명 UI (상세 페이지 결재 테이블, 기안/서명/반려/회수 버튼)
- ✅ `<ApprovalLineModal>` 공유 컴포넌트 연동 (영업과 동일)
- ✅ `billingCycle` 드롭다운 (매월/격월/분기/반기/연간/일시불)
- ✅ `billingDayOfMonth` 입력 필드 (기본 31, 월 말일 자동 clamp)

### 집계 연동 (PR #14)
- ✅ 매출장/매입장 API — SalesLedger + MABilling UNION 조회
- ✅ 경영 통계 `stats/annual-report` — MA 집계 포함 (salesApproval/maBilling breakdown)
- ✅ 계산서 발행 현황 — `maGroups` 섹션 (MAContract 단위 그룹핑 + 파생 InvoiceRecord 포함)

### 기본 기능 (기존)
- ✅ MA 품의서 CRUD, 검색/상태 필터/페이지네이션
- ✅ 엑셀 업로드 파싱 (`billingCycle` 자유 문자열 → enum 매핑은 `normalizeBillingCycle`)
- ✅ 품의번호 자동 생성 (MA-YYYY-NNNN)

## 남은 것

- ⏳ 반복 실행 E2E 테스트 (다달이 반복 청구 시나리오)
- ⏳ CEO 대시보드에 MA 원장 연동 (결정대기 #4 대시보드 재정의 후)
- ⏳ 인증된 사용자 ID 연동 (현재 일부 경로 `createdById = 'dummy-user-id'` 잔존)

## 관련 화면

- `/ma/approvals` (MA 품의서 목록)
- `/ma/approvals/new` (신규 작성 — billingCycle / billingDayOfMonth 입력)
- `/ma/approvals/[id]` (상세 조회 + 결재 테이블 + 결재선 모달)
- `/ma/approvals/[id]/edit` (수정 — DRAFT/반려 상태만)

---

<details>
<summary>🔧 기술 정보 (개발자용)</summary>

**Entry points**
- `app/(main)/ma/approvals/page.tsx` — MA 품의서 목록
- `app/(main)/ma/approvals/[id]/page.tsx` — 상세 + 3단계 결재 테이블
- `app/api/ma-approvals/route.ts` — 목록/생성
- `app/api/ma-approvals/[id]/submit/route.ts` — 상신 (결재자 3명 body 수신)
- `app/api/ma-approvals/[id]/sign/route.ts` — TEAM_LEADER/CEO 서명 + **CEO 시 MAContract + MABilling 트랜잭션 생성**
- `app/api/ma-approvals/[id]/reject/route.ts` — 반려
- `app/api/ma-approvals/[id]/withdraw/route.ts` — 회수
- `app/api/ma-approvals/parse/route.ts` / `upload/route.ts` — 엑셀 파싱/업로드
- `lib/ma/billing-cycle.ts` — 자유 문자열 → BillingCycle enum 매핑 (`normalizeBillingCycle`), `cycleToIntervalMonths`
- `lib/ma/billing-schedule.ts` — 시작/종료/주기/청구일 → `{ billingMonth, dueDate }[]` 스케줄 생성 (UTC 기준, 일시불 특수 처리, 월 말일 clamp)
- `components/documents/ApprovalLineModal.tsx` — 영업/MA 공유 결재선 지정 모달

**주요 라이브러리**: exceljs

**의존성 서비스**: PostgreSQL (Prisma — MAApproval / MAApprovalItem / MAContract / MABilling / InvoiceRecord)

**핵심 난제 (메모)**:
- 스케줄 생성은 **UTC 고정**으로 처리 (`billing-schedule.ts`) — Prisma `@db.Date` 컬럼이 타임존 보정 없이 저장되므로 KST 로컬 Date를 쓰면 전날로 밀림
- 일시불은 첫 달 1건만, 그 외 주기는 `i % interval === 0` 월에 청구
- MA revise 시 InvoiceRecord 전이는 `source=MA_BILLING` 행만 대상 — 영업 InvoiceRecord와 간섭하지 않음

**스키마 변화**:

*2026-04-22 (PR #9) — MA 결재·원장 스키마*:
- `MAContract`, `MABilling` 모델 신설
- `MAApproval`에 결재 3인 필드 (salesManagerId/teamLeaderId/ceoId + *SignedAt/*RejectedAt)
- `MAApprovalItem.billingDayOfMonth`, `billingCycle` 추가, `BillingCycle` enum 신설

*2026-04-22 (PR #10) — 결재 API 4종 + 자동 생성 트랜잭션*

*2026-04-22 (PR #11) — `<ApprovalLineModal>` 공유 컴포넌트 + submit API 개정 (영업과 공유)*

*2026-04-22 (PR #12) — 상세 페이지 3단계 서명 UI*

*2026-04-22 (PR #13) — `InvoiceRecord.source` + `maBillingId` 추가, issue API MABilling 파생 지원, amend source 복제, MA revise 시 파생 전이*

*2026-04-22 (PR #14) — 집계 API UNION (sales-ledger / purchase-ledger / stats/annual-report / invoice-status maGroups)*

*2026-04-22 (PR #15) — UI 개선 (billingCycle 드롭다운 + billingDayOfMonth 입력)*

</details>
