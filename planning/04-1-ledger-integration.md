# 04-1. 품의서 ↔ 원장 연동 재설계

## 문제 정의

현재 품의서(SalesApproval)는 3단 계층 구조이고, 원장(SalesLedger/PurchaseLedger)은 단층 테이블이다. CEO 승인 시 자동 생성하는 로직(sign/route.ts)에 다음 문제가 있다:

1. 카테고리 하드코딩 (`'상품'`만), MA/임대/경비 구분 불가
2. VAT 고정 10%, 면세/영세 미지원
3. revise 시 원장 중복 (v1 원장 + v2 원장)
4. Product→Item 간 매출/매입 관계 추적이 원장에서 끊김
5. 분할 납부 시 paymentDueDate 1개로 부족

## 설계 원칙

1. **품의서가 원장의 원본(source of truth)**이다 — 원장은 품의서에서 파생된 데이터
2. **원장 행은 항상 출처를 추적**할 수 있어야 한다 — Product ID, Item ID 역참조
3. **revise 시 이전 원장은 자동 취소**되고 새 원장이 생성된다
4. **카테고리와 세금은 품의서 작성 시 지정**한다 — 자동 생성 시 그대로 사용

---

## 스키마 변경

### 1. SalesApprovalProduct에 카테고리 추가

```prisma
model SalesApprovalProduct {
  // ... 기존 필드 ...

  // ★ 추가 필드
  category    String  @default("상품")  // 상품, MA, 건물임대, 장비임대, 일반경비
  subCategory String? @map("sub_category")  // 세부분류 (월간-IBM 등)
  taxType     String  @default("TAX") @map("tax_type")  // TAX(과세10%), ZERO(영세), EXEMPT(면세)
}
```

**UI 변경**: 품의서 작성 화면에서 제품 추가 시 카테고리 선택 드롭다운 추가.

### 2. SalesApprovalItem에 세금 정보 추가

```prisma
model SalesApprovalItem {
  // ... 기존 필드 ...

  // ★ 추가 필드
  taxType       String   @default("TAX") @map("tax_type")  // TAX, ZERO, EXEMPT
  currency      String?  // 외화 시 통화코드 (USD 등)
  exchangeRate  Decimal? @map("exchange_rate") @db.Decimal(10, 4)
}
```

### 3. SalesLedger에 출처 추적 필드 추가

```prisma
model SalesLedger {
  // ... 기존 필드 ...

  // ★ 추가/변경 필드
  sourceProductId String? @map("source_product_id")  // 원본 Product ID
  approvalVersion Int?    @map("approval_version")    // 품의서 버전
  isActive        Boolean @default(true) @map("is_active")  // revise 시 false 처리
  cancelledAt     DateTime? @map("cancelled_at")
  cancelReason    String?   @map("cancel_reason")
}
```

### 4. PurchaseLedger에 출처 추적 필드 추가

```prisma
model PurchaseLedger {
  // ... 기존 필드 ...

  // ★ 추가/변경 필드
  sourceItemId    String? @map("source_item_id")  // 원본 Item ID
  sourceProductId String? @map("source_product_id")  // 상위 Product ID
  approvalVersion Int?    @map("approval_version")
  isActive        Boolean @default(true) @map("is_active")
  cancelledAt     DateTime? @map("cancelled_at")
  cancelReason    String?   @map("cancel_reason")
}
```

---

## 연동 로직 재설계

### Case 1: 최초 승인 (CEO 서명)

```
sign/route.ts — CEO 서명 완료 시:

1. SalesApproval.status = APPROVED

2. 매출 원장 생성 (Product 단위)
   for each Product:
     SalesLedger.create({
       approvalCode:    approval.approvalCode,
       sourceProductId: product.id,
       approvalVersion: approval.version,
       transactionDate: approval.approvalDate,
       clientCompany:   approval.clientCompany,
       endUser:         approval.endUser,
       category:        product.category,       // ← Product에서 가져옴
       subCategory:     product.subCategory,
       description:     product.name,
       quantity:        product.quantity,
       unitPrice:       product.unitPrice,
       supplyAmount:    product.totalPrice,
       vatAmount:       calculateVat(product.totalPrice, product.taxType),
       totalAmount:     calculateTotal(product.totalPrice, product.taxType),
       paymentStatus:   'PENDING',
       managerName:     approval.managerName,
       salesApprovalId: approval.id,
       isActive:        true,
     })

3. 매입 원장 생성 (Item 단위, 매입 정보가 있는 것만)
   for each Product → for each Item (where purchaseTotal > 0):
     PurchaseLedger.create({
       approvalCode:    approval.approvalCode,
       sourceItemId:    item.id,
       sourceProductId: product.id,
       approvalVersion: approval.version,
       invoiceDate:     item.purchaseDate || approval.approvalDate,
       vendorCompany:   item.vendorName,
       clientCompany:   approval.clientCompany,
       category:        product.category,       // ← Product 카테고리 상속
       subCategory:     product.subCategory,
       itemName:        item.description || item.partNumber || product.name,
       quantity:        item.purchaseQty,
       unitPrice:       item.purchasePrice,
       supplyAmount:    item.purchaseTotal,
       vatAmount:       calculateVat(item.purchaseTotal, item.taxType),
       totalAmount:     calculateTotal(item.purchaseTotal, item.taxType),
       paymentStatus:   'PENDING',
       salesApprovalId: approval.id,
       isActive:        true,
     })
```

### Case 2: Revise 후 재승인

```
revise/route.ts — 수정본 생성 시:
  (기존 로직 유지 — Product/Item 복사, 새 버전 생성)

sign/route.ts — 수정본 CEO 서명 완료 시:

1. 이전 버전의 원장 비활성화
   UPDATE SalesLedger
     SET isActive = false, cancelledAt = now(), cancelReason = 'REVISED_v{n}'
     WHERE salesApprovalId = approval.originalId  // 원본 품의서 ID
       AND isActive = true

   UPDATE PurchaseLedger
     SET isActive = false, cancelledAt = now(), cancelReason = 'REVISED_v{n}'
     WHERE salesApprovalId = approval.originalId
       AND isActive = true

2. 새 버전 원장 생성 (Case 1과 동일 로직)
```

**주의**: 이전 원장을 DELETE하지 않고 isActive=false로 처리한다. 이력 추적과 회계 감사를 위해.

### Case 3: 품의서 자체 취소 (삭제)

```
이 경우 원장도 비활성화:
  UPDATE SalesLedger SET isActive = false, cancelReason = 'APPROVAL_CANCELLED'
  UPDATE PurchaseLedger SET isActive = false, cancelReason = 'APPROVAL_CANCELLED'
```

---

## VAT 계산 함수

```typescript
function calculateVat(supplyAmount: Decimal, taxType: string): Decimal {
  switch (taxType) {
    case 'TAX':     return supplyAmount * 0.1   // 과세 10%
    case 'ZERO':    return 0                      // 영세율
    case 'EXEMPT':  return 0                      // 면세
    default:        return supplyAmount * 0.1
  }
}

function calculateTotal(supplyAmount: Decimal, taxType: string): Decimal {
  return supplyAmount + calculateVat(supplyAmount, taxType)
}
```

---

## 원장 조회 시 주의

모든 원장 조회 쿼리에 `isActive = true` 조건을 기본으로 포함해야 한다.

```typescript
// 매출 원장 조회
const salesLedger = await prisma.salesLedger.findMany({
  where: {
    isActive: true,  // ★ 필수
    transactionDate: { gte: startDate, lte: endDate },
    // ... 기타 필터
  }
})
```

이력 조회(감사 목적)가 필요한 경우에만 isActive 조건을 제거.

---

## 데이터 매핑 요약

```
┌─────────────────────────────┐
│ SalesApproval (품의서 헤더)  │
│ approvalCode, clientCompany │
│ endUser, managerName        │
└──────────┬──────────────────┘
           │
     ┌─────┴──────┐
     │             │
┌────▼────┐  ┌────▼────┐
│Product A│  │Product B│         ← 매출 단위
│category │  │category │
│taxType  │  │taxType  │
└────┬────┘  └────┬────┘
     │             │
     ▼             ▼
┌─────────┐  ┌─────────┐
│Sales    │  │Sales    │         ← SalesLedger (1:1 매핑)
│Ledger   │  │Ledger   │
│sourceProductId = A│  │sourceProductId = B│
└─────────┘  └─────────┘

     │Product A의 Items│
     │                 │
┌────▼────┐  ┌────▼────┐  ┌────▼────┐
│Item 1   │  │Item 2   │  │Item 3   │   ← 매입 단위
│vendor:A │  │vendor:B │  │vendor:C │
│taxType  │  │taxType  │  │taxType  │
└────┬────┘  └────┬────┘  └────┬────┘
     │             │             │
     ▼             ▼             ▼
┌─────────┐  ┌─────────┐  ┌─────────┐
│Purchase │  │Purchase │  │Purchase │   ← PurchaseLedger (1:1 매핑)
│Ledger   │  │Ledger   │  │Ledger   │
│sourceItemId = 1│ │sourceItemId = 2│ │sourceItemId = 3│
└─────────┘  └─────────┘  └─────────┘
```

---

## 구현 순서

### Step 1: 스키마 마이그레이션
- SalesApprovalProduct에 category, subCategory, taxType 추가
- SalesApprovalItem에 taxType, currency, exchangeRate 추가
- SalesLedger에 sourceProductId, approvalVersion, isActive, cancelledAt, cancelReason 추가
- PurchaseLedger에 sourceItemId, sourceProductId, approvalVersion, isActive, cancelledAt, cancelReason 추가
- 기존 데이터: isActive = true, category = '상품' 기본값

### Step 2: 품의서 작성 UI 수정
- 제품 추가 시 카테고리 선택 드롭다운 (상품 / MA / 건물임대 / 장비임대 / 일반경비)
- 세금 유형 선택 (과세 / 영세 / 면세) — 기본값: 과세

### Step 3: sign/route.ts 원장 생성 로직 교체
- 기존 하드코딩 로직 제거
- 위 Case 1 로직으로 교체

### Step 4: revise/route.ts 원장 비활성화 로직 추가
- 수정본 승인 시 이전 원장 isActive = false 처리
- 위 Case 2 로직 추가

### Step 5: 원장 조회 API/화면 수정
- 모든 쿼리에 isActive = true 조건 추가
- 이력 조회 모드 추가 (감사용)

### Step 6: 테스트
- 최초 승인 → 원장 생성 확인
- revise → 재승인 → 이전 원장 비활성화 + 새 원장 생성 확인
- 다중 매입처 케이스 → PurchaseLedger 행 수 확인
- 면세/영세 케이스 → VAT 계산 확인
