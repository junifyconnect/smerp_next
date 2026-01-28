# 품의서 구조 설계

---

## 1. 핵심 구조

### 테이블 관계

```
SalesApproval (품의서)
    │
    ├─── 1:N ───▶ SalesApprovalItem (매출 제품)
    │                   │
    │                   └─── 1:N ───▶ SalesApprovalItemDetail (매출 품목)
    │
    └─── 1:N ───▶ SalesApprovalPurchaseItem (매입 아이템)
                        │
                        ├─── salesItemId ───▶ SalesApprovalItem (매출 제품)
                        ├─── salesItemDetailId ───▶ SalesApprovalItemDetail (개별 매입 시)
                        │
                        └─── 1:N ───▶ SalesApprovalPurchaseItemDetail (매입 디테일)
```

---

## 2. 매입 구조

### 통합 매입 (isConsolidated = true)

제품 레벨에서 일괄 매입하는 경우

```
매출 제품: 서버 (500만원)
  ├─ 매출 품목: CPU
  ├─ 매출 품목: RAM
  └─ 매출 품목: SSD

매입 아이템: 1개
  ├─ salesItemId = 매출제품ID
  ├─ salesItemDetailId = null
  ├─ isConsolidated = true
  ├─ vendorCompany = "A사"
  ├─ unitPrice = 400만원
  ├─ purchaseInvoiceStatus = "PENDING"
  └─ 매입 디테일: 3개 (품목 정보만)
       ├─ CPU (partNumber, description, quantity)
       ├─ RAM
       └─ SSD
```

### 개별 매입 (isConsolidated = false)

품목별로 다른 매입처에서 매입하는 경우

```
매출 제품: 조립PC (450만원)
  ├─ 매출 품목[0]: CPU
  ├─ 매출 품목[1]: RAM
  └─ 매출 품목[2]: SSD

매입 아이템: 3개 (품목당 1개)
  ├─ 매입 아이템 1:
  │    ├─ salesItemId = 매출제품ID
  │    ├─ salesItemDetailId = 품목[0].id (CPU)
  │    ├─ isConsolidated = false
  │    ├─ vendorCompany = "다나와"
  │    ├─ unitPrice = 90만
  │    ├─ purchaseInvoiceStatus = "PENDING"
  │    └─ 매입 디테일: 1개 (CPU)
  │
  ├─ 매입 아이템 2:
  │    ├─ salesItemId = 매출제품ID
  │    ├─ salesItemDetailId = 품목[1].id (RAM)
  │    ├─ vendorCompany = "조이젠"
  │    ├─ unitPrice = 75만
  │    └─ 매입 디테일: 1개 (RAM)
  │
  └─ 매입 아이템 3:
       ├─ salesItemId = 매출제품ID
       ├─ salesItemDetailId = 품목[2].id (SSD)
       ├─ vendorCompany = "아싸컴"
       ├─ unitPrice = 40만
       └─ 매입 디테일: 1개 (SSD)
```

---

## 3. 스키마

### SalesApprovalPurchaseItem (매입 아이템)

```prisma
model SalesApprovalPurchaseItem {
  id                String  @id @default(uuid())
  approvalId        String  // 소속 품의서

  // 매출 연결
  salesItemId       String? // 연결된 매출 제품 ID
  salesItemDetailId String? // 연결된 매출 품목 ID (개별 매입 시)

  // 매입 정보
  productName     String
  isConsolidated  Boolean @default(false)
  vendorCompany   String?
  quantity        Int     @default(1)
  unitPrice       Decimal?
  totalPrice      Decimal?

  // 계산서 상태
  purchaseInvoiceStatus String @default("PENDING")
  purchaseInvoiceDate   DateTime?

  details SalesApprovalPurchaseItemDetail[]
}
```

### SalesApprovalPurchaseItemDetail (매입 디테일)

```prisma
model SalesApprovalPurchaseItemDetail {
  id          String  @id @default(uuid())
  itemId      String  // 부모 매입 아이템

  partNumber  String?
  description String?
  quantity    Int?
  sortOrder   Int     @default(0)
}
```

---

## 4. 데이터 흐름

### 저장 시 (프론트엔드 → API)

```javascript
// 통합 매입
purchaseItemsPayload.push({
  salesItemIndex: pIdx, // 매출 제품 인덱스
  isConsolidated: true,
  vendorCompany: "A사",
  unitPrice: 4000000,
  details: [{ partNumber: "CPU" }, { partNumber: "RAM" }],
});

// 개별 매입 (품목당 1개씩)
product.items.forEach((item, iIdx) => {
  purchaseItemsPayload.push({
    salesItemIndex: pIdx, // 매출 제품 인덱스
    salesItemDetailIndex: iIdx, // 매출 품목 인덱스
    isConsolidated: false,
    vendorCompany: item.vendorCompany,
    unitPrice: item.purchaseUnitPrice,
    details: [{ partNumber: item.partNumber }],
  });
});
```

### API 처리

```javascript
// 매출 아이템 생성 후 ID 맵 수집
createdSalesItemsMap = [
  { itemId: "sales-item-1", detailIds: ["detail-1", "detail-2", "detail-3"] },
];

// 매입 아이템 생성 시 실제 ID로 변환
if (item.salesItemIndex !== undefined) {
  salesItemId = createdSalesItemsMap[item.salesItemIndex].itemId;

  if (!item.isConsolidated && item.salesItemDetailIndex !== undefined) {
    salesItemDetailId =
      createdSalesItemsMap[item.salesItemIndex].detailIds[
        item.salesItemDetailIndex
      ];
  }
}
```

### 로드 시 (API → 프론트엔드)

```javascript
// 통합 매입 찾기
const consolidatedPurchase = purchaseItems.find(
  (pi) => pi.salesItemId === salesItem.id && pi.isConsolidated,
);

// 개별 매입 찾기 (품목별)
const individualPurchase = purchaseItems.find(
  (pi) => pi.salesItemDetailId === detail.id && !pi.isConsolidated,
);
```

---

## 5. 계산서 상태

### 상태 저장 위치

모든 경우에 **PurchaseItem 레벨**에서 계산서 상태를 관리합니다.

| isConsolidated | 상태 저장 위치                     | 건수 |
| -------------- | ---------------------------------- | ---- |
| true           | PurchaseItem.purchaseInvoiceStatus | 1건  |
| false          | PurchaseItem.purchaseInvoiceStatus | N건  |

### 상태 흐름

```
PENDING ──▶ ISSUED ──▶ AMENDMENT_NEEDED ──▶ AMENDED
               │
               └──▶ CANCELLATION_NEEDED ──▶ CANCELLED
```

---

## 6. 요약

| 구분              | 통합 매입         | 개별 매입         |
| ----------------- | ----------------- | ----------------- |
| 아이템 개수       | 1개               | N개 (품목 수만큼) |
| 디테일 개수       | N개 (품목 수만큼) | 각 1개            |
| salesItemId       | 있음              | 있음              |
| salesItemDetailId | 없음 (null)       | 있음 (품목별)     |
| 계산서 추적       | 아이템 레벨 (1건) | 아이템 레벨 (N건) |
| 매입처            | 아이템 레벨       | 아이템 레벨       |
| 매입가            | 아이템 레벨       | 아이템 레벨       |
