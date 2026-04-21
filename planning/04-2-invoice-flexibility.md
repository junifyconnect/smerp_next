# 04-2. 계산서 발행 단위 유연화 설계

## 문제 정의

현재 계산서 발행 단위가 고정되어 있다:
- 매출 계산서 → Product 단위만 (SalesApprovalProduct.salesInvoiceStatus)
- 매입 계산서 → Item 단위만 (SalesApprovalItem.purchaseInvoiceStatus)

실제 업무에서는 유연성이 필요하다:
- 매출 계산서를 Item 단위로 발행해야 할 때 (부분 납품, 품목별 별도 청구)
- 매입 계산서를 Product 단위로 합산해야 할 때 (같은 매입처에서 통합 계산서 수신)

---

## 핵심 설계

### 두 가지 분리된 개념

```
1. invoiceRequired (체크박스) → "이 아이템, 계산서 발행 대상인가?"
2. invoiceStatus (상태값)     → "발행 절차가 어디까지 갔는가?"
```

이 둘은 별개다:
- 체크 해제 → 자동으로 NOT_REQUIRED
- 체크 되어 있으면 → PENDING → ISSUED → NEEDS_AMENDMENT 등 상태 흐름

### 발행 단위 설정

Product마다 매출/매입 각각의 발행 단위를 선택:

```
salesInvoiceUnit:    'PRODUCT' (기본) | 'ITEM'
purchaseInvoiceUnit: 'ITEM' (기본)    | 'PRODUCT'
```

- **Product 단위로 발행** → 소유한 Item 중 `invoiceRequired = true`인 것만 묶어서 계산서 1장
- **Item 단위로 발행** → `invoiceRequired = true`인 Item 각각 계산서 1장씩

---

## 상태 흐름

```
[invoiceRequired = false]
  → NOT_REQUIRED (끝)

[invoiceRequired = true]
  → PENDING (미발행)
    → ISSUED (발행 완료)
      → NEEDS_AMENDMENT (품의서 revise로 변경 감지 시)
        → ISSUED (수정 계산서 발행)
      → CANCELLED (취소)
```

### revise 시 수정 필요 감지

품의서가 revise되면:
1. 이전 버전에서 ISSUED 상태였던 계산서 확인
2. 새 버전에서 해당 Item의 금액/수량이 변경되었으면 → NEEDS_AMENDMENT로 변경
3. 변경 없으면 → ISSUED 유지

---

## 스키마 변경

### SalesApprovalProduct

```prisma
model SalesApprovalProduct {
  // ... 기존 필드 (salesInvoiceStatus, salesInvoiceDate, salesInvoiceRemarks 유지) ...

  // ★ 발행 단위 설정
  salesInvoiceUnit    String @default("PRODUCT") @map("sales_invoice_unit")
  purchaseInvoiceUnit String @default("ITEM") @map("purchase_invoice_unit")

  // ★ 매입 계산서 — purchaseInvoiceUnit = 'PRODUCT'일 때 사용
  purchaseInvoiceStatus  String    @default("PENDING") @map("purchase_invoice_status")
  purchaseInvoiceDate    DateTime? @map("purchase_invoice_date") @db.Date
  purchaseInvoiceRemarks String?   @map("purchase_invoice_remarks") @db.Text
}
```

### SalesApprovalItem

```prisma
model SalesApprovalItem {
  // ... 기존 필드 (purchaseInvoiceStatus, purchaseInvoiceDate 유지) ...

  // ★ 계산서 필요 여부 (매출/매입 공통)
  salesInvoiceRequired    Boolean @default(true) @map("sales_invoice_required")
  purchaseInvoiceRequired Boolean @default(true) @map("purchase_invoice_required")

  // ★ 매출 계산서 — salesInvoiceUnit = 'ITEM'일 때 사용
  salesInvoiceStatus  String    @default("PENDING") @map("sales_invoice_status")
  salesInvoiceDate    DateTime? @map("sales_invoice_date") @db.Date
  salesInvoiceRemarks String?   @map("sales_invoice_remarks") @db.Text
}
```

---

## 동작 예시

### 예시 1: 매출 계산서를 Product 단위 발행 (기본)

```
Product: 영상편집 세트 (salesInvoiceUnit = 'PRODUCT')
  ├─ Item: 본체  [salesInvoiceRequired: ☑] → Product 계산서에 포함
  ├─ Item: 모니터 [salesInvoiceRequired: ☑] → Product 계산서에 포함
  └─ Item: 케이블 [salesInvoiceRequired: ☐] → 제외 (NOT_REQUIRED)

→ Product.salesInvoiceStatus = PENDING
→ 발행하면 ISSUED (본체 + 모니터 금액 합산)
```

### 예시 2: 매출 계산서를 Item 단위 발행

```
Product: 영상편집 세트 (salesInvoiceUnit = 'ITEM')
  ├─ Item: 본체   [salesInvoiceRequired: ☑, salesInvoiceStatus: PENDING]
  ├─ Item: 모니터  [salesInvoiceRequired: ☑, salesInvoiceStatus: ISSUED] ← 먼저 납품
  └─ Item: 케이블  [salesInvoiceRequired: ☐, salesInvoiceStatus: NOT_REQUIRED]

→ 모니터만 먼저 계산서 발행 가능
```

### 예시 3: 매입 계산서를 Product 단위 합산

```
Product: HPE 서버 (purchaseInvoiceUnit = 'PRODUCT')
  ├─ Item: CPU  [매입처: A사, purchaseInvoiceRequired: ☑]
  ├─ Item: RAM  [매입처: A사, purchaseInvoiceRequired: ☑]
  └─ Item: SSD  [매입처: A사, purchaseInvoiceRequired: ☑]

→ Product.purchaseInvoiceStatus = PENDING
→ A사에서 합산 계산서 1장 받으면 ISSUED
```

### 예시 4: revise 후 수정 필요 감지

```
v1: 모니터 단가 500,000 → 매출 계산서 ISSUED
v2: 모니터 단가 600,000으로 변경
→ 모니터 salesInvoiceStatus → NEEDS_AMENDMENT
→ 경영팀이 수정 계산서 발행 후 ISSUED로 변경
```

---

## 계산서 발행현황 화면 (invoice-status)

발행 단위에 따라 행 구조가 달라진다:

```
Case 1: salesInvoiceUnit=PRODUCT, purchaseInvoiceUnit=ITEM (현행 기본)
┌──────────────────────┬──────────────────────┐
│ 매출: Product 1건     │ 매입: Item A (벤더1)  │
│ (rowSpan=3)          │ 매입: Item B (벤더2)  │
│                      │ 매입: Item C (벤더3)  │
└──────────────────────┴──────────────────────┘

Case 2: salesInvoiceUnit=ITEM, purchaseInvoiceUnit=ITEM
┌──────────────────────┬──────────────────────┐
│ 매출: Item A          │ 매입: Item A (벤더1)  │
│ 매출: Item B          │ 매입: Item B (벤더2)  │
│ 매출: Item C          │ 매입: Item C (벤더3)  │
└──────────────────────┴──────────────────────┘

Case 3: salesInvoiceUnit=PRODUCT, purchaseInvoiceUnit=PRODUCT
┌──────────────────────┬──────────────────────┐
│ 매출: Product 1건     │ 매입: Product 1건     │
│                      │ (합산 계산서)          │
└──────────────────────┴──────────────────────┘

Case 4: salesInvoiceUnit=ITEM, purchaseInvoiceUnit=PRODUCT
┌──────────────────────┬──────────────────────┐
│ 매출: Item A          │ 매입: Product 1건     │
│ 매출: Item B          │ (rowSpan=3, 합산)     │
│ 매출: Item C          │                      │
└──────────────────────┴──────────────────────┘
```

모든 Case에서 `invoiceRequired = false`인 항목은 표시하지 않거나, 회색 처리.

---

## 읽기 로직

### 매출 계산서 상태 조회

```typescript
function getSalesInvoices(product, items) {
  if (product.salesInvoiceUnit === 'PRODUCT') {
    // Product 1건 — 포함된 Item 중 required만 합산
    const includedItems = items.filter(i => i.salesInvoiceRequired)
    return [{
      level: 'PRODUCT',
      id: product.id,
      status: product.salesInvoiceStatus,
      date: product.salesInvoiceDate,
      remarks: product.salesInvoiceRemarks,
      amount: product.totalPrice,
      includedItemCount: includedItems.length,
      excludedItemCount: items.length - includedItems.length,
    }]
  } else {
    // Item별 각각
    return items.map(item => ({
      level: 'ITEM',
      id: item.id,
      status: item.salesInvoiceRequired ? item.salesInvoiceStatus : 'NOT_REQUIRED',
      date: item.salesInvoiceDate,
      remarks: item.salesInvoiceRemarks,
      amount: item.salesUnitPrice * item.quantity,
      required: item.salesInvoiceRequired,
    }))
  }
}
```

### 매입 계산서 상태 조회

```typescript
function getPurchaseInvoices(product, items) {
  if (product.purchaseInvoiceUnit === 'ITEM') {
    // Item별 각각 (현행)
    return items
      .filter(item => item.vendorName && Number(item.purchaseTotal) > 0)
      .map(item => ({
        level: 'ITEM',
        id: item.id,
        vendorName: item.vendorName,
        status: item.purchaseInvoiceRequired ? item.purchaseInvoiceStatus : 'NOT_REQUIRED',
        date: item.purchaseInvoiceDate,
        amount: item.purchaseTotal,
        required: item.purchaseInvoiceRequired,
      }))
  } else {
    // Product 합산 1건
    const includedItems = items.filter(i => i.purchaseInvoiceRequired)
    const totalAmount = includedItems.reduce((sum, i) => sum + Number(i.purchaseTotal || 0), 0)
    return [{
      level: 'PRODUCT',
      id: product.id,
      vendorName: includedItems[0]?.vendorName,
      status: product.purchaseInvoiceStatus,
      date: product.purchaseInvoiceDate,
      remarks: product.purchaseInvoiceRemarks,
      amount: totalAmount,
      includedItemCount: includedItems.length,
    }]
  }
}
```

---

## 원장(Ledger) 연동과의 관계

원장과 계산서는 **분리된 관심사**:
- 원장 = "거래가 발생했다"는 재무 기록 → 항상 Product=매출 1행, Item=매입 N행
- 계산서 = "세금계산서를 발행했다"는 세무 기록 → 발행 단위에 따라 유연

계산서 발행 단위가 바뀌어도 원장 생성 로직은 영향 없음.

---

## UI 변경

### 품의서 작성 화면

제품 추가 시:

```
[제품명: 영상편집 세트]
  매출 계산서: (●) 제품 단위  ( ) 품목별
  매입 계산서: ( ) 제품 단위  (●) 품목별

  품목 목록:
  ┌──────────┬──────────┬───────┬───────────────┬───────────────┐
  │ P/N      │ 품명     │ 수량  │ 매출계산서 필요 │ 매입계산서 필요 │
  ├──────────┼──────────┼───────┼───────────────┼───────────────┤
  │ CPU-001  │ CPU      │ 1     │ [☑]           │ [☑]           │
  │ RAM-002  │ RAM 64GB │ 2     │ [☑]           │ [☑]           │
  │ CBL-003  │ 케이블   │ 5     │ [☐]           │ [☐]           │
  └──────────┴──────────┴───────┴───────────────┴───────────────┘
```

### 계산서 발행현황 화면

발행 상태 인라인 수정:
- PENDING → 드롭다운으로 ISSUED / NOT_REQUIRED / CANCELLED 선택
- ISSUED → NEEDS_AMENDMENT (revise 시 자동) → 수정 발행 후 ISSUED
- 발행일/비고 인라인 수정 (현행 PATCH API 유지)

---

## 구현 순서

1. **스키마 마이그레이션**
   - Product: salesInvoiceUnit, purchaseInvoiceUnit, purchaseInvoice 필드 추가
   - Item: salesInvoiceRequired, purchaseInvoiceRequired, salesInvoice 필드 추가
   - 기본값: salesInvoiceUnit='PRODUCT', purchaseInvoiceUnit='ITEM', required=true

2. **품의서 작성 UI**
   - 제품별 발행 단위 라디오 버튼
   - 품목별 계산서 필요 여부 체크박스

3. **sign/route.ts** — CEO 승인 시 InvoiceRecord 생성 로직 분기

4. **revise/route.ts** — 수정 시 NEEDS_AMENDMENT 자동 감지
   - 이전 버전의 ISSUED 계산서 확인
   - 금액/수량 변경 감지 → NEEDS_AMENDMENT

5. **invoice-status API** — 발행 단위별 행 생성 로직

6. **PATCH API** — 수정 대상 분기 (Product or Item, 발행 단위에 따라)

7. **계산서 발행현황 UI** — 4가지 Case 렌더링 + required=false 회색 처리
