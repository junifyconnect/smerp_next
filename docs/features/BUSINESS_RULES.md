# smerp_next 업무 규칙

`DOMAINS.md`가 "기능을 어느 도메인에 넣을지"를 정한다면, 이 파일은 **기능 구현 시 반드시 지켜야 하는 업무 규칙**을 고정한다. 실무에서 쓰지 않는 옵션이 과잉 구현되어 실수를 유발하는 상황을 막기 위함.

`/project-spec:update`, `/project-spec:work`, `/project-spec:e2e` 등 모든 스킬은 이 파일을 참고해야 한다.

---

## 1. 품의서 카테고리 (`ProductCategory` enum)

**허용값**: `상품` / `MA`

| 카테고리 | 플로우 | 비고 |
|---|---|---|
| 상품 | 영업 품의서 (`/sales/approvals`) | 일반 제품 판매 |
| MA | MA 품의서 (`/ma/approvals`) | 유지보수 계약, 별도 결재 라인 |

**제외 (2026-04 정리)**:
- `건물임대`, `장비임대`, `일반경비` — 실무에서 쓰지 않으므로 UI/스키마/원장에서 제거됨
- 과거 `planning/*.md`에 등장해도 히스토리 참고용일 뿐, 구현하지 않음

---

## 2. 세금 (VAT)

**규칙**: 모든 거래는 **부가세 10% 고정**.

- `calculateVat(supplyAmount) = Math.round(supplyAmount * 0.1)` — 분기 없음
- 과거 스키마 필드 `taxType` (TAX/ZERO/EXEMPT)은 **제거됨**
- 영세율(ZERO), 면세(EXEMPT)는 **구현하지 않음**

근거: 회사 실무에서 수출·면세사업자 거래가 없으므로 분기 불필요.

---

## 3. 매출 계산서 발행 단위

**규칙**: 항상 **제품 단위(PRODUCT)** 로 발행.

- `SalesApprovalProduct` 1건당 매출 `InvoiceRecord` 1건 생성
- 과거 `salesInvoiceUnit` 필드 (PRODUCT/ITEM 선택)는 **제거됨**
- `InvoiceRecord.salesItemId` 컬럼도 제거 — 매출 식별 키는 `(approvalId, productId)` 고정

---

## 4. 매입 계산서 발행 단위

**규칙**: 항상 **매입처(vendorCompany)별 자동 그룹핑**.

- 품의서 내 여러 제품/품목이 같은 매입처를 쓰면, 하나의 매입 `InvoiceRecord`로 합쳐짐
- 식별 키: `(approvalId, vendorCompany)` — 제품 경계를 초월
- 과거 `purchaseInvoiceUnit` 선택 UI는 설계 단계에서 삭제됨

---

## 5. 결재 단계 (영업 품의서)

```
DRAFT → PENDING_TEAM_LEAD → PENDING_CEO → APPROVED
  ^                                            |
  |--------- withdraw(DRAFT 복귀) -------------|
                   reject(반려) → 작성자에게 돌아감
```

- **서명자**: SALES_MANAGER(영업담당) → TEAM_LEADER(팀장) → CEO
- **서명 이미지 필수**: `signatureUrl`이 없으면 서명 거부 (400)
- **CEO 승인 즉시** 트랜잭션으로 자동 생성:
  - 매출장(SalesLedger) · 매입장(PurchaseLedger) — VAT 10% 반영
  - 매출/매입 InvoiceRecord (PENDING) — 계산서 미발행 상태
- **회수(withdraw)** 시: DRAFT 복귀 + PENDING 상태 InvoiceRecord 삭제

---

## 6. 계산서 상태 (InvoiceRecord)

```
PENDING → ISSUED ──(수정 필요)──> AMEND
                   │                 │ (원본 CANCELLED + 신규 PENDING, amendedFromId 연결)
                   │                 ↓
                   └──(착오 발행)─── CANCEL → CANCELLED
                                      (중복 CANCEL은 409)
```

- **PENDING**: 아직 계산서 미발행
- **ISSUED**: 경영팀이 실제 계산서를 끊은 상태 (국세청 전송 등)
- **NEEDS_AMENDMENT**: 품의서 revise로 인해 수정세금계산서 발행이 필요한 상태
- **CANCELLED**: 취소됨 (취소 사유 `cancelReason` 필수)

---

## 7. 품의서 revise (버전 관리)

- APPROVED된 품의서 내용 변경 시 **새 버전 생성** (삭제 아님)
- v2 승인 시:
  - 이전 버전(v1) 원장들은 `isActive=false`, `cancelReason='REVISED_v2'`로 비활성화
  - v1의 ISSUED 계산서는 `NEEDS_AMENDMENT`로 전이 (경영팀이 수정세금계산서 발행 유도)
  - v1의 PENDING 계산서는 `CANCELLED('REVISED_v2')` 로 전이
- 체인 루트 추적: `rootApprovalId = originalId || id`

---

## 8. 거래처 필드명

- `Customer.name` (매출처), `Vendor.name` (매입처) — **둘 다 `name`** 으로 통일
- 품의서 내부의 스냅샷 컬럼 `clientCompany` / `vendorCompany`는 유지 (역할 구분 명확)
- 알림·콜백 계약의 중립 파라미터명 `companyName`은 유지

---

## 9. 추적/역참조

원장·InvoiceRecord는 모두 원본 품의서 행으로 역참조 가능해야 한다:
- `SalesLedger.sourceProductId` → `SalesApprovalProduct.id`
- `PurchaseLedger.sourceItemId` → `SalesApprovalItem.id`
- `MABilling.maContractId` → `MAContract.id` → `MAApproval.id`
- `approvalVersion`: 어느 버전에서 생성됐는지 기록

---

## 10. MA 품의서 (2026-04-22 설계 확정)

MA는 영업과 **시간축이 다른 플로우**다. 일회성 거래가 아닌 **월별 반복 청구**를 전제로 한다.

### 10.1 원장 구조 (이중 체계)

| 플로우 | 원장 | 계산서 기록 |
|---|---|---|
| 영업 | `SalesLedger` / `PurchaseLedger` | `InvoiceRecord` (직접 생성) |
| MA | `MABilling` (원장 대체) | `InvoiceRecord` (MABilling에서 파생) |

**집계 API는 항상 양쪽을 UNION 처리**:
- `경영 통계`, `매출장 매입장` 등에서 영업 원장 + MABilling 합산
- `계산서 발행 현황`은 InvoiceRecord 단일 진실 소스로 그대로 유지

### 10.2 MA 승인 시 자동 생성

```
MAApproval APPROVED (3단계 결재 완료) →
  · MAContract 1건
  · MABilling N건 (계약 시작 월 ~ 종료 월까지 월별 1건씩)
```

**InvoiceRecord는 이 시점에 생성하지 않는다.** 경영팀이 각 월별로 `/api/management/invoices/issue` 호출 시 **MABilling에서 파생 생성**.

### 10.3 계약 기간 & 청구 기준일

- `MAApprovalItem.startDate` / `endDate`: 필수
- `MAApprovalItem.billingDayOfMonth`: 매월 청구일 (기본 31 = 말일)
- **일할 계산 없음**: 시작 월/종료 월 모두 **통째로 1개월치** 청구
  - 예: 4/15 시작 → 4월분 1개월치 (4/15~4/30 일할 아님)
  - 예: 7/20 종료 → 7월분 1개월치 (7/1~7/20 일할 아님)
- MABilling 각 행:
  - `billingMonth`: 월 식별자 (2026-04-01 같은 1일 고정)
  - `dueDate`: 실제 청구일 (`billingMonth` + `billingDayOfMonth - 1`, 해당 월 말일을 넘지 않음)

### 10.4 MA revise 동작 (영업과 동일 원칙)

v2 승인 시:
- v1 MABilling 전체 `isActive=false`, `cancelReason='REVISED_v{n}'`
- v1 MABilling에서 파생된 **ISSUED 상태 InvoiceRecord** → `NEEDS_AMENDMENT` (보존, 수정세금계산서 유도)
- v1 MABilling에서 파생된 **PENDING 상태 InvoiceRecord** → `CANCELLED('REVISED_v{n}')` (버림)
- v2 MAContract + MABilling 신규 생성

### 10.5 세금/카테고리

- 세금: VAT 10% 고정 (§2와 동일)
- 카테고리: `ProductCategory.MA` (§1)
- MA 품의서에는 카테고리 선택 UI 없음 (항상 MA 고정)

---

## 11. revise vs amend 의사결정 (TODO)

_작성 예정 — `_결정대기.md` #5 참조._

---

## 변경 이력

- **2026-04-22 (2)**: §10 MA 품의서 규칙 추가 (`_결정대기.md` #1 확정). MABilling이 원장 대체 엔티티, InvoiceRecord는 파생 생성, 계약 기간 유연 처리, 청구 기준일 계약마다 설정 가능, 일할 계산 없음.
- **2026-04-22 (1)**: 최초 작성. PR #3 (UI 간소화) + PR #4 (스키마 정리) 기반.
- 기존 `planning/*.md`의 과도한 옵션(세금 3종, PRODUCT/ITEM 선택, 카테고리 5종)은 모두 제거됨. 히스토리는 `planning/` 폴더에 보존.
