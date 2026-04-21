# 08. 계산서 모델 근본 재설계 (2026-04-20)

**상태**: 확정 (구현 대기)
**전임 문서**: [04-2. 발행 단위 유연화](./04-2-invoice-flexibility.md) — 본 문서로 대체

---

## 1. 왜 다시 설계하나

기존 구조는 Product/Item 테이블에 계산서 상태 필드(`salesInvoiceStatus`, `purchaseInvoiceStatus`, ...)를 직접 박아 두고, UI는 그 필드를 인라인 드롭다운으로 수정했다. 나중에 `InvoiceRecord`를 도입하면서 **진실의 원천이 두 개**가 됐고, 양쪽이 동기화 안 된 채 UI/API가 각자 다른 곳을 보고 있었다.

또 하나의 결함: 매입 계산서를 "제품 단위"로 묶을 수 있게 해뒀는데, 한 제품에 매입처가 여러 곳이면 그 단위 자체가 성립 안 한다 — 계산서는 매입처가 발행 주체라 **매입처가 곧 단위**다.

---

## 2. 근본 원칙

1. **`InvoiceRecord`가 유일한 진실의 원천.** Product/Item에는 계산서 상태 필드를 두지 않는다.
2. **매출 계산서의 단위는 제품 또는 품목.** 품의서 작성 시 제품별로 선택(`salesInvoiceUnit`).
3. **매입 계산서의 단위는 매입처뿐.** 별도 설정 컬럼 없이 (품의서 × 매입처) 기준으로 자동 그룹핑.
4. **상태 전이는 도메인 이벤트.** 필드 수정이 아니라 전용 API(`/issue`, `/amend`, `/cancel`)로만 변경.
5. **수정세금계산서는 새 레코드.** 원본은 `CANCELLED(reason=AMENDED)`로 전이, 신규 레코드가 `amendedFromId`로 체인 연결.

---

## 3. 스키마 (신규)

### 3.1 `InvoiceRecord` — 재구성

```prisma
model InvoiceRecord {
  id            String       @id @default(uuid())
  approvalId    String       @map("approval_id")
  invoiceType   InvoiceType  @map("invoice_type")  // SALES | PURCHASE

  // 매출 식별 (SALES일 때 채움)
  productId     String?      @map("product_id")
  salesItemId   String?      @map("sales_item_id")    // salesInvoiceUnit='ITEM'일 때만

  // 매입 식별 (PURCHASE일 때 채움)
  vendorCompany String?      @map("vendor_company")   // 매입처 = 매입 계산서의 자연 키

  // 공통 메타
  clientCompany String?      @map("client_company")

  // 내용 스냅샷 (발행 시점)
  productName   String       @map("product_name")
  partNumber    String?      @map("part_number")
  quantity      Int
  unitPrice     Decimal      @map("unit_price") @db.Decimal(15, 2)
  totalPrice    Decimal      @map("total_price") @db.Decimal(15, 2)

  // 상태
  status        InvoiceStatus @default(PENDING)
  invoiceNumber String?       @map("invoice_number")
  invoiceDate   DateTime?     @map("invoice_date") @db.Date
  remarks       String?       @db.Text
  cancelledAt   DateTime?     @map("cancelled_at")
  cancelReason  String?       @map("cancel_reason")

  // 체인
  amendedFromId String?       @map("amended_from_id")
  amendedFrom   InvoiceRecord?  @relation("InvoiceAmend", fields: [amendedFromId], references: [id])
  amendments    InvoiceRecord[] @relation("InvoiceAmend")

  approval      SalesApproval @relation(fields: [approvalId], references: [id], onDelete: Cascade)

  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  @@index([approvalId, invoiceType])
  @@index([approvalId, productId])
  @@index([approvalId, vendorCompany])
  @@index([amendedFromId])
  @@map("invoice_records")
}

enum InvoiceType { SALES PURCHASE }
enum InvoiceStatus { PENDING ISSUED NEEDS_AMENDMENT CANCELLED }
```

주요 변화:
- `itemId` 단일 컬럼(제품/품목 혼용) → `productId` + `salesItemId` + `vendorCompany`로 명시 분리
- `NOT_REQUIRED` 제거: 발행 대상이 아니면 레코드 자체를 만들지 않는다 (존재=발행 대상)

체인 루트 식별 규칙 (`amendedFromId=null`인 레코드 기준):
- 매출 제품 단위: `(approvalId, productId, salesItemId=null)`
- 매출 품목 단위: `(approvalId, productId, salesItemId)`
- 매입: `(approvalId, vendorCompany)`

### 3.2 `SalesApprovalProduct` / `SalesApprovalItem` — 정리

제거할 컬럼:
- `Product.salesInvoiceStatus`, `salesInvoiceDate`, `salesInvoiceRemarks`
- `Product.purchaseInvoiceStatus`, `purchaseInvoiceDate`, `purchaseInvoiceRemarks`
- `Product.purchaseInvoiceUnit` **(매입은 항상 매입처 단위)**
- `Item.salesInvoiceStatus`, `salesInvoiceDate`, `salesInvoiceRemarks`
- `Item.purchaseInvoiceStatus`, `purchaseInvoiceDate`

유지할 컬럼:
- `Product.salesInvoiceUnit` — `PRODUCT | ITEM` (매출만 해당)
- `Item.salesInvoiceRequired` — 품목별 매출 계산서 발행 여부 (ITEM 단위일 때 의미 있음)
- `Item.purchaseInvoiceRequired` — 이 품목을 매입 계산서에 포함할지

---

## 4. 계산서 생성 규칙 (품의서 승인 시점)

### 매출
```
for product in products:
    if product.salesInvoiceUnit == 'PRODUCT':
        create InvoiceRecord(productId=product.id, salesItemId=null,
                             amount=product.totalPrice, ...)
    else:  # ITEM
        for item in product.items where salesInvoiceRequired and salesUnitPrice>0:
            create InvoiceRecord(productId=product.id, salesItemId=item.id,
                                 amount=item.salesUnitPrice*item.quantity, ...)
```

### 매입
```
# (매입처) 기준으로 groupBy. 한 품의서 내 같은 매입처의 품목들을 합산.
groups = groupBy(
    items where purchaseInvoiceRequired and vendorName and purchaseTotal>0,
    key=item.vendorName
)
for vendor, items in groups:
    create InvoiceRecord(
        vendorCompany=vendor,
        amount=sum(item.purchaseTotal),
        quantity=sum(item.purchaseQty),
        productName=<대표 품목명 또는 "N건">,
        productId=null, salesItemId=null, ...
    )
```

제품 경계를 넘어서 같은 매입처면 한 계산서로 묶는다. 같은 매입처가 제품 A, B에 걸쳐 있어도 계산서 1건.

---

## 5. 버전(수정 품의서) 처리

CEO 서명 시 `currentVersion > 1`이면:
- **원장(SalesLedger/PurchaseLedger)**: 이전 버전의 활성 레코드를 `isActive=false, cancelReason='REVISED_v{n}'`로 전이 + 신규 버전 레코드 생성. (기존 로직 유지)
- **InvoiceRecord (이전 버전들)**:
  - `PENDING` → `CANCELLED(reason='REVISED_v{n}')` (미발행이므로 폐기)
  - `ISSUED` → `NEEDS_AMENDMENT` (경영팀이 `/amend` 호출로 수정세금계산서 발행)
  - `NEEDS_AMENDMENT` / `CANCELLED` → 유지
  - `amendedFromId` 연결은 `/amend` 호출 시 명시적으로 설정 (sign 시점에는 연결 안 함)
- **InvoiceRecord (신규 버전)**: 섹션 4 규칙대로 `PENDING` 생성.

---

## 6. API 구조

| 엔드포인트 | 역할 |
|---|---|
| `POST /api/sales-approvals/[id]/sign` (CEO) | 승인 + 초기 `InvoiceRecord` 생성 (PENDING) |
| `POST /api/management/invoices/issue` | `PENDING → ISSUED` (발행) |
| `POST /api/management/invoices/amend` | `ISSUED | NEEDS_AMENDMENT → CANCELLED(AMENDED)` + 신규 `PENDING`(amendedFromId 연결) |
| `POST /api/management/invoices/cancel` | 임의 상태 → `CANCELLED(reason=사용자입력)` |
| `GET /api/management/invoices?approvalId=...` | 체인 포함 레코드 목록 |
| `GET /api/management/invoice-status` | 월/거래처/매입처/상태별 집계 + 품의서 그룹 응답 |
| `PATCH /api/management/invoice-status` | 메타(`invoiceNumber`, `invoiceDate`, `remarks`)만 수정. 상태 전이는 위 전용 API로 유도. |

---

## 7. UI 재설계 방향

**행 단위를 제품/품목 → `InvoiceRecord`로 전환.**

한 행 = 한 계산서:
- 열: [품의번호][구분(매출/매입)][거래처 또는 매입처][제품/품목명][수량][금액][상태][발행일][세금계산서번호][액션]
- 품의번호는 `rowSpan` 그룹핑
- 체인 표시: `v2`, `수정발행(amendedFromId 있음)` 뱃지
- 액션:
  - `PENDING` → `[발행]`
  - `ISSUED` → `[수정발행] [취소]`
  - `NEEDS_AMENDMENT` → `[수정발행]`(강조) `[취소]`
  - `CANCELLED` → 읽기 전용
- 상세 뷰(모달/drawer)에서 체인 타임라인 전체 (원본→수정본 1→수정본 2...) 시각화

기존 `FlatInvoiceRow`/`flattenGroups` 폐기. 새 타입 `InvoiceRecordRow`로 교체.

---

## 8. 구현 순서

데이터는 날리고 새로 간다 (사용자 승인됨).

1. **스키마 변경** — `prisma/schema.prisma`
   - `InvoiceRecord` 필드 재구성 (섹션 3.1)
   - Product/Item legacy 필드 제거 (섹션 3.2)
   - `purchaseInvoiceUnit` 제거
2. **DB 리셋** — `npx prisma migrate reset` 또는 새 migration
3. **`sign/route.ts` 재작성** — 섹션 4, 5 규칙 적용
4. **`invoice-status/route.ts` 재작성** — 매입 그룹핑 기준을 매입처로, 응답도 `InvoiceRecord` 행 기반으로 재설계
5. **`/invoices/issue|amend|cancel` 수정** — 새 스키마 필드 반영
6. **`lib/invoices/chain.ts` 수정** — `itemId` 제거됐으므로 필드 조건 업데이트
7. **테스트 스크립트 업데이트** — `scripts/test-invoices.ts` 새 스키마 반영
8. **`migrate-invoice-to-records.ts` 폐기** — DB 리셋하므로 불필요
9. **UI 재작성** — 발행현황 페이지 행 단위를 `InvoiceRecord`로, 액션 버튼 도입
10. **기존 UI 타입 정리** — `_types/invoice-status.ts` 교체

---

## 9. 결정된 것 / 미결정

### 결정됨
- 매입 계산서 단위는 매입처 하나만.
- `purchaseInvoiceUnit` 컬럼 삭제.
- `InvoiceRecord.itemId` 제거, `productId`/`salesItemId`/`vendorCompany`로 분리.
- `NOT_REQUIRED` 제거, 없으면 미발행 대상.
- 기존 데이터 폐기 후 리셋.

### 미결정
- 매입 계산서의 `productName` 스냅샷: "대표 품목명" vs "품목 N건 합산" 표기 — UI 작업 시 확정.
- 체인 head 조회 속도 최적화: 현재 `createdAt DESC`로 찾는데, 체인이 깊어지면 `isLatest` 컬럼 또는 별도 view 도입 여부.
- 매입처 이름 변경 시 기존 레코드와의 매칭 (하지만 레코드는 스냅샷이라 발행 이후엔 무관).
