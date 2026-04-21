# 04-3. MA(유지보수) 모듈 설계

## 기본 방향

MA는 Sales와 별도 체계로 관리한다. 다만 원장/계산서/통계 등 경영관리 영역에서는 동일한 데이터 구조로 합류한다.

핵심 개념: **MA 품의서 승인 시, 계약 기간에 맞춰 예정 결제 횟수만큼 청구 건을 미리 등록한다.**

---

## MA 업무 흐름

```
[고객 요청 / 계약 갱신]
    ↓
[MA 견적서 작성]
  - 장비 목록 (기기명, M/T, Model, S/N, 서비스레벨)
  - 계약 기간 (시작일~종료일)
  - 월간 단가 × 기간 = 총액
    ↓
[MA 품의서 작성]
  - 견적서 기반 or 직접 작성
  - 매출/매입 청구 정보
  - 3단계 결재 (담당자 → 팀장 → CEO)
    ↓
[승인]
    ↓
[MA 계약 + 청구 스케줄 자동 생성]
  - MAContract 생성
  - MABilling N건 생성 (계약 기간만큼)
    ↓
[매월 운영]
  - 해당 월 청구 건 → 계산서 발행 (ISSUED)
  - 입금 확인 → 결제 완료 처리
  - 미수금 추적
    ↓
[만료 관리]
  - 만료 30/60/90일 전 알림
  - 갱신 견적서 생성 유도
```

---

## 스키마 설계

### MAApproval 변경 (결재 워크플로우 추가)

```prisma
model MAApproval {
  // ... 기존 필드 유지 ...

  // ★ 결재/서명 (SalesApproval과 동일 구조)
  salesManagerId       String?   @map("sales_manager_id")
  salesManagerSignedAt DateTime? @map("sales_manager_signed_at")
  teamLeaderId         String?   @map("team_leader_id")
  teamLeaderSignedAt   DateTime? @map("team_leader_signed_at")
  ceoId                String?   @map("ceo_id")
  ceoSignedAt          DateTime? @map("ceo_signed_at")

  // 반려
  rejectedById    String?   @map("rejected_by_id")
  rejectedAt      DateTime? @map("rejected_at")
  rejectionReason String?   @map("rejection_reason") @db.Text

  // 관계
  contract MAContract? // 승인 후 생성되는 계약
}
```

### MAContract (MA 계약)

```prisma
model MAContract {
  id             String @id @default(uuid())
  contractNumber String @unique @map("contract_number") // MC-2025-0001

  // 상태
  status String @default("ACTIVE")
  // ACTIVE: 진행중 / EXPIRING: 만료임박 / EXPIRED: 만료 / CANCELLED: 취소

  // 원본 품의서 연결
  maApprovalId String   @unique @map("ma_approval_id")
  maApproval   MAApproval @relation(fields: [maApprovalId], references: [id])

  // 고객 정보
  clientCompany String  @map("client_company")
  endUser       String? @map("end_user")

  // 계약 기간
  startDate DateTime @map("start_date") @db.Date
  endDate   DateTime @map("end_date") @db.Date

  // 금액
  monthlyAmount     Decimal @map("monthly_amount") @db.Decimal(15, 2)     // 월 매출
  totalAmount       Decimal @map("total_amount") @db.Decimal(15, 2)       // 총 매출
  monthlyPurchase   Decimal @map("monthly_purchase") @db.Decimal(15, 2)   // 월 매입
  totalPurchase     Decimal @map("total_purchase") @db.Decimal(15, 2)     // 총 매입

  // 청구 설정
  billingCount    Int @map("billing_count")    // 총 청구 횟수 (12, 24, 36 등)
  billingCycle    String @default("MONTHLY") @map("billing_cycle") // MONTHLY, QUARTERLY

  // 갱신
  autoRenew        Boolean @default(false) @map("auto_renew")
  renewalAlertDays Int[]   @default([30, 60, 90]) @map("renewal_alert_days")

  // 담당자
  managerName String? @map("manager_name")

  notes String? @db.Text

  // 관계
  items    MAContractItem[]
  billings MABilling[]

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@index([status])
  @@index([clientCompany])
  @@index([endDate])
  @@map("ma_contracts")
}
```

### MAContractItem (계약 장비)

```prisma
model MAContractItem {
  id         String @id @default(uuid())
  contractId String @map("contract_id")

  sortOrder    Int      @default(0) @map("sort_order")
  productName  String?  @map("product_name")   // 기기명
  modelType    String?  @map("model_type")      // M/T
  model        String?                           // Model
  serialNumber String?  @map("serial_number")   // S/N
  serviceLevel String?  @map("service_level")   // 서비스 레벨
  monthlyPrice Decimal? @map("monthly_price") @db.Decimal(15, 2)

  contract MAContract @relation(fields: [contractId], references: [id], onDelete: Cascade)

  @@index([contractId])
  @@map("ma_contract_items")
}
```

### MABilling (청구 스케줄)

MA의 핵심 테이블. 품의서 승인 시 N건 한꺼번에 생성.

```prisma
model MABilling {
  id         String @id @default(uuid())
  contractId String @map("contract_id")

  // 청구 정보
  billingNumber Int      @map("billing_number")  // 회차 (1, 2, 3, ... 12)
  billingMonth  DateTime @map("billing_month") @db.Date  // 청구 월 (2025-01-01)
  dueDate       DateTime @map("due_date") @db.Date       // 결제 예정일

  // 매출
  salesAmount Decimal @map("sales_amount") @db.Decimal(15, 2)

  // 매입
  purchaseAmount  Decimal  @map("purchase_amount") @db.Decimal(15, 2)
  purchaseCompany String?  @map("purchase_company") // 매입처

  // 계산서 상태 (매출)
  salesInvoiceStatus  String    @default("PENDING") @map("sales_invoice_status")
  salesInvoiceDate    DateTime? @map("sales_invoice_date") @db.Date

  // 계산서 상태 (매입)
  purchaseInvoiceStatus  String    @default("PENDING") @map("purchase_invoice_status")
  purchaseInvoiceDate    DateTime? @map("purchase_invoice_date") @db.Date

  // 결제 상태
  paymentStatus String    @default("PENDING") @map("payment_status")
  // PENDING / COMPLETED / OVERDUE
  paymentDate   DateTime? @map("payment_date") @db.Date

  // 원장 연결
  salesLedgerId    String? @map("sales_ledger_id")
  purchaseLedgerId String? @map("purchase_ledger_id")

  contract MAContract @relation(fields: [contractId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now()) @map("created_at")

  @@unique([contractId, billingNumber])
  @@index([billingMonth])
  @@index([salesInvoiceStatus])
  @@index([paymentStatus])
  @@map("ma_billings")
}
```

---

## 승인 시 자동 생성 로직

### MA 품의서 CEO 승인 시

```typescript
// ma-approvals/[id]/sign/route.ts

// 1. 품의서 승인 처리
approval.status = 'APPROVED'

// 2. MAContract 생성
const contract = await tx.maContract.create({
  data: {
    contractNumber: generateContractNumber(), // MC-2025-0001
    maApprovalId: approval.id,
    status: 'ACTIVE',
    clientCompany: approval.items[0].clientCompany,
    startDate: approval.items[0].startDate,
    endDate: approval.items[0].endDate,
    monthlyAmount: 월매출합계,
    totalAmount: 총매출,
    monthlyPurchase: 월매입합계,
    totalPurchase: 총매입,
    billingCount: 계약개월수,
    managerName: approval.managerName,
  }
})

// 3. MAContractItem 생성 (장비 목록 복사)
// MAApprovalItem → MAContractItem

// 4. MABilling N건 생성
for (let i = 0; i < billingCount; i++) {
  const billingMonth = addMonths(startDate, i)
  const dueDate = endOfMonth(billingMonth) // 또는 특정 일자

  await tx.maBilling.create({
    data: {
      contractId: contract.id,
      billingNumber: i + 1,
      billingMonth,
      dueDate,
      salesAmount: contract.monthlyAmount,
      purchaseAmount: contract.monthlyPurchase,
      purchaseCompany: 매입처,
      salesInvoiceStatus: 'PENDING',
      purchaseInvoiceStatus: 'PENDING',
      paymentStatus: 'PENDING',
    }
  })

  // 5. 매출 원장 등록 (회차별)
  await tx.salesLedger.create({
    data: {
      approvalCode: approval.approvalCode || contract.contractNumber,
      transactionDate: billingMonth,
      clientCompany: contract.clientCompany,
      category: 'MA',
      subCategory: `${i + 1}/${billingCount}회`,
      description: `${contract.clientCompany} 유지보수 ${i + 1}월`,
      quantity: 1,
      unitPrice: contract.monthlyAmount,
      supplyAmount: contract.monthlyAmount,
      vatAmount: calculateVat(contract.monthlyAmount, 'TAX'),
      totalAmount: calculateTotal(contract.monthlyAmount, 'TAX'),
      paymentStatus: 'PENDING',
      paymentDueDate: dueDate,
      managerName: contract.managerName,
      maApprovalId: approval.id,
      isActive: true,
    }
  })

  // 6. 매입 원장 등록 (회차별)
  await tx.purchaseLedger.create({
    data: {
      approvalCode: approval.approvalCode || contract.contractNumber,
      invoiceDate: billingMonth,
      vendorCompany: 매입처,
      clientCompany: contract.clientCompany,
      category: 'MA',
      itemName: `유지보수 ${i + 1}/${billingCount}회`,
      quantity: 1,
      unitPrice: contract.monthlyPurchase,
      supplyAmount: contract.monthlyPurchase,
      vatAmount: calculateVat(contract.monthlyPurchase, 'TAX'),
      totalAmount: calculateTotal(contract.monthlyPurchase, 'TAX'),
      paymentStatus: 'PENDING',
      paymentDueDate: dueDate,
      maApprovalId: approval.id,
      isActive: true,
    }
  })
}
```

---

## 월간 운영

### 계산서 발행

계산서 발행현황 화면에서 MA 청구 건도 함께 조회:

```
2025년 1월 계산서 발행현황
┌──────────┬──────────┬────────┬──────────┬──────────┐
│ 구분     │ 거래처    │ 금액   │ 매출계산서 │ 매입계산서 │
├──────────┼──────────┼────────┼──────────┼──────────┤
│ 상품     │ A사      │ 500만  │ ISSUED   │ ISSUED   │
│ MA 1/12  │ B사      │ 100만  │ PENDING  │ PENDING  │  ← MABilling에서
│ MA 1/12  │ C사      │ 200만  │ ISSUED   │ PENDING  │
└──────────┴──────────┴────────┴──────────┴──────────┘
```

MABilling의 `salesInvoiceStatus`, `purchaseInvoiceStatus`를 인라인 수정하면 됨.

### 입금 확인

MABilling.paymentStatus를 COMPLETED로 변경 + paymentDate 기록.
연결된 SalesLedger.paymentStatus도 함께 업데이트.

### 연체 관리

```
매월 체크:
  MABilling WHERE paymentStatus = 'PENDING' AND dueDate < today
    → paymentStatus = 'OVERDUE'
    → 연결된 SalesLedger.paymentStatus도 OVERDUE
    → 알림 생성
```

---

## 만료 관리

### 자동 상태 변경

```
매일 체크 (크론잡 또는 API 호출):
  MAContract WHERE status = 'ACTIVE' AND endDate <= today + 90일
    → status = 'EXPIRING'
    → 알림: "B사 유지보수 계약이 90일 후 만료됩니다"
    → 캘린더 이벤트 자동 생성

  MAContract WHERE status IN ('ACTIVE', 'EXPIRING') AND endDate < today
    → status = 'EXPIRED'
    → 알림: "B사 유지보수 계약이 만료되었습니다"
```

### 갱신 플로우

```
만료 임박
  → 담당자에게 알림
  → "갱신 견적서 작성" 버튼 → MA 견적서 작성 화면으로
  → 이전 계약 정보 프리필
  → 새 견적서 → 새 품의서 → 승인 → 새 계약 생성
```

---

## 화면 설계

### MA 계약 목록

```
┌──────┬──────────┬──────────┬────────────┬────────┬──────┬────────┐
│ 상태 │ 계약번호  │ 고객사   │ 계약기간    │ 월매출 │ 잔여 │ 담당자 │
├──────┼──────────┼──────────┼────────────┼────────┼──────┼────────┤
│ 🟢   │ MC-25-01 │ A사     │ 25.01~25.12│ 100만 │ 8/12 │ 이예지 │
│ 🟡   │ MC-24-05 │ B사     │ 24.06~25.05│ 200만 │ 1/12 │ 홍승민 │
│ 🔴   │ MC-24-02 │ C사     │ 24.03~25.02│ 150만 │ 0/12 │ 이예지 │
└──────┴──────────┴──────────┴────────────┴────────┴──────┴────────┘

🟢 ACTIVE  🟡 EXPIRING  🔴 EXPIRED
```

### MA 계약 상세

```
계약번호: MC-2025-0001
고객사: A사 (END-USER: A사 본사)
계약기간: 2025.01.01 ~ 2025.12.31
월 매출: 1,000,000 / 월 매입: 800,000

[장비 목록]
┌─────────┬─────────┬─────────┬──────────┬──────────┐
│ 기기명   │ M/T     │ Model   │ S/N      │ 서비스    │
├─────────┼─────────┼─────────┼──────────┼──────────┤
│ 서버     │ 7Y51   │ SR250   │ A12345   │ 24x7     │
│ 스토리지 │ 2076   │ FS5200  │ B67890   │ 24x7     │
└─────────┴─────────┴─────────┴──────────┴──────────┘

[청구 현황]
┌──────┬──────────┬────────┬──────────┬──────────┬──────────┐
│ 회차 │ 청구월    │ 매출   │ 매출계산서 │ 매입계산서 │ 입금상태 │
├──────┼──────────┼────────┼──────────┼──────────┼──────────┤
│ 1/12 │ 2025.01  │ 100만  │ ✅ 발행  │ ✅ 발행   │ ✅ 완료  │
│ 2/12 │ 2025.02  │ 100만  │ ✅ 발행  │ ✅ 발행   │ ✅ 완료  │
│ 3/12 │ 2025.03  │ 100만  │ ✅ 발행  │ ⏳ 대기   │ ⏳ 대기  │
│ 4/12 │ 2025.04  │ 100만  │ ⏳ 대기  │ ⏳ 대기   │ ⏳ 대기  │
│ ...  │          │        │          │          │          │
│12/12 │ 2025.12  │ 100만  │ ⏳ 대기  │ ⏳ 대기   │ ⏳ 대기  │
└──────┴──────────┴────────┴──────────┴──────────┴──────────┘
```

---

## 통계/경영관리 연동

MABilling이 승인 시점에 원장(SalesLedger/PurchaseLedger)도 함께 생성하므로:

- **월별 매출 통계**: MA 매출이 자동으로 포함됨 (category = 'MA')
- **미수금 관리**: MA 월별 미수금도 동일하게 추적 (paymentStatus = PENDING/OVERDUE)
- **매출 Rank**: MA 매출도 거래처별/담당자별 랭킹에 포함
- **대시보드**: MA vs 상품 매출 비중 차트에 자연스럽게 반영

별도 집계 로직이 필요 없이, 원장 기반 쿼리에서 `category = 'MA'` 필터만 추가하면 된다.
