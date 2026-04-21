# 05. 데이터 모델

## 5.1 현재 스키마 요약

현재 Prisma 스키마에 정의된 모델들:

### 사용자/권한
- `User` - 사용자 (사번, 이메일, 부서, 직급, 역할, 서명URL, 연차)
- `Session` - NextAuth 세션
- `Role` - 역할 정의 (ADMIN, SALES_MANAGER 등)
- `UserRole` - 사용자-역할 매핑
- `UserMenuPermission` - 메뉴별 접근 권한 (NONE/READ/FULL)

### 거래처/매입처
- `Customer` - 거래처 (회사명, 전화, 팩스, 주소)
- `CustomerContact` - 거래처 담당자 (이름, 부서, 직급, 연락처)
- `Vendor` - 매입처 (이름, 담당자, 사용빈도)

### 영업 문서
- `SalesQuote` - 영업 견적서 (상태, 고객정보, 금액, 버전관리)
- `SalesQuoteProduct` - 견적서 제품 그룹
- `SalesQuoteItem` - 견적서 품목 상세
- `SalesQuoteFile` - 견적서 첨부파일
- `SalesApproval` - 영업 품의서 (상태, 고객정보, 매출/매입 금액, 3단계 결재, 버전관리)
- `SalesApprovalProduct` - 품의서 제품 (매출 계산서 단위)
- `SalesApprovalItem` - 품의서 품목 (매입 정보 포함)
- `SalesApprovalFile` - 품의서 첨부파일
- `SalesOrder` - 영업 발주서 (상태, 매입처정보, 금액, 버전관리)
- `SalesOrderItem` - 발주서 품목
- `SalesOrderFile` - 발주서 첨부파일

### MA 문서
- `MAQuote` - MA 견적서 (고객정보, 금액, 조건)
- `MAQuoteItem` - MA 견적 장비 (기기명, M/T, Model, S/N, 서비스레벨, 기간)
- `MAApproval` - MA 품의서 (금액, 매입)
- `MAApprovalItem` - MA 품의 품목 (매출/매입 청구구분)
- `MAApprovalPurchaseItem` - MA 매입 품목 (deprecated)

### 경영관리
- `SalesLedger` - 매출 원장 (거래일, 매출처, 카테고리, 금액, 결제상태, GP)
- `PurchaseLedger` - 매입 원장 (계산서일, 매입처, 금액, 결제상태, 유형)
- `InvoiceRecord` - 계산서 발행 기록 (매출/매입, 스냅샷, 수정이력)

### 부가
- `CalendarEvent` - 캘린더 이벤트
- `CalendarEventParticipant` - 이벤트 참여자
- `LeaveRequest` - 휴가 신청
- `Notification` - 알림
- `ExcelImport` - 엑셀 임포트 이력
- `ExcelTemplate` - 엑셀 양식 + 필드 매핑

## 5.2 신규 모델 설계 (추가 필요)

### MAContract (MA 계약)

```prisma
model MAContract {
  id             String   @id @default(uuid())
  contractNumber String   @unique @map("contract_number") // MC-2025-0001

  // 상태
  status String @default("ACTIVE") // ACTIVE, EXPIRING, EXPIRED, CANCELLED

  // 고객 정보
  customerId    String  @map("customer_id")
  clientCompany String  @map("client_company")
  endUser       String? @map("end_user")

  // 계약 기간
  startDate DateTime @map("start_date") @db.Date
  endDate   DateTime @map("end_date") @db.Date

  // 금액
  monthlyAmount   Decimal @map("monthly_amount") @db.Decimal(15, 2)   // 월 매출
  totalAmount     Decimal @map("total_amount") @db.Decimal(15, 2)     // 총 매출
  purchaseMonthly Decimal @map("purchase_monthly") @db.Decimal(15, 2) // 월 매입
  purchaseTotal   Decimal @map("purchase_total") @db.Decimal(15, 2)   // 총 매입

  // 청구
  billingCycle  String @default("MONTHLY") @map("billing_cycle") // MONTHLY, QUARTERLY, YEARLY
  billingDay    Int    @default(1) @map("billing_day") // 매월 몇일 청구

  // 갱신
  autoRenew      Boolean @default(false) @map("auto_renew")
  renewalAlertDays Int[]  @default([30, 60, 90]) @map("renewal_alert_days")

  // 연결
  maApprovalId String? @map("ma_approval_id") // 승인된 MA 품의서
  managerId    String? @map("manager_id")
  managerName  String? @map("manager_name")

  notes String? @db.Text

  // 관계
  items    MAContractItem[]
  billings MABilling[]

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@index([status])
  @@index([customerId])
  @@index([endDate])
  @@index([managerId])
  @@map("ma_contracts")
}

model MAContractItem {
  id         String @id @default(uuid())
  contractId String @map("contract_id")

  sortOrder    Int      @default(0) @map("sort_order")
  productName  String?  @map("product_name")  // 기기명
  modelType    String?  @map("model_type")     // M/T
  model        String?                          // Model
  serialNumber String?  @map("serial_number")  // S/N
  serviceLevel String?  @map("service_level")  // 서비스 레벨
  monthlyPrice Decimal? @map("monthly_price") @db.Decimal(15, 2)

  contract MAContract @relation(fields: [contractId], references: [id], onDelete: Cascade)

  @@index([contractId])
  @@map("ma_contract_items")
}

model MABilling {
  id         String @id @default(uuid())
  contractId String @map("contract_id")

  // 청구 기간
  billingMonth DateTime @map("billing_month") @db.Date // 청구 월 (2025-01-01)
  amount       Decimal  @db.Decimal(15, 2)              // 청구 금액

  // 상태
  status String @default("PENDING") // PENDING, BILLED, PAID

  // 매출 원장 연결
  salesLedgerId String? @map("sales_ledger_id")

  contract MAContract @relation(fields: [contractId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now()) @map("created_at")

  @@unique([contractId, billingMonth])
  @@index([billingMonth])
  @@index([status])
  @@map("ma_billings")
}
```

### Payment (입금/출금 기록)

미수금/미지급금 관리를 위한 결제 기록 모델:

```prisma
model Payment {
  id String @id @default(uuid())

  // 유형
  type String // INCOME (입금) / EXPENSE (출금)

  // 연결
  salesLedgerId    String? @map("sales_ledger_id")
  purchaseLedgerId String? @map("purchase_ledger_id")

  // 금액
  amount      Decimal  @db.Decimal(15, 2) // 입금/출금 금액
  paymentDate DateTime @map("payment_date") @db.Date

  // 방법
  method String? // 계좌이체, 자동이체, 현금, 카드 등

  notes String? @db.Text

  createdAt DateTime @default(now()) @map("created_at")

  @@index([salesLedgerId])
  @@index([purchaseLedgerId])
  @@index([paymentDate])
  @@index([type])
  @@map("payments")
}
```

## 5.3 기존 모델 수정 제안

### Vendor 모델 확장

현재 담당자 1명만 관리 가능 → 복수 담당자 지원:

```prisma
model VendorContact {
  id       String @id @default(uuid())
  vendorId String @map("vendor_id")

  name       String
  department String?
  position   String?
  phone      String?
  email      String?
  isDefault  Boolean @default(false) @map("is_default")

  vendor Vendor @relation(fields: [vendorId], references: [id], onDelete: Cascade)

  @@index([vendorId])
  @@map("vendor_contacts")
}
```

### SalesApproval ↔ SalesOrder 연결

현재 품의서와 발주서 간 연결이 없음:

```prisma
// SalesOrder에 추가
model SalesOrder {
  // ... 기존 필드 ...
  sourceApprovalId String? @map("source_approval_id")
  // sourceApproval SalesApproval? @relation(...)
}
```

### MAApproval 결재 필드 추가

현재 MA 품의서에 결재 워크플로우 필드가 없음. SalesApproval과 동일한 결재 구조 추가 필요:

```prisma
model MAApproval {
  // ... 기존 필드 ...

  // 결재/서명 (SalesApproval과 동일 구조)
  salesManagerId       String?
  salesManagerSignedAt DateTime?
  teamLeaderId         String?
  teamLeaderSignedAt   DateTime?
  ceoId                String?
  ceoSignedAt          DateTime?
  rejectedById         String?
  rejectedAt           DateTime?
  rejectionReason      String?
}
```

## 5.4 데이터 흐름 (연동 로직)

```
[영업 품의서 승인]
    ├── SalesLedger 자동 생성 (매출 항목별)
    ├── PurchaseLedger 자동 생성 (매입 항목별)
    ├── InvoiceRecord 자동 생성 (계산서 추적용)
    └── Notification 생성 (경영팀에게)

[MA 품의서 승인]
    ├── MAContract 자동 생성
    ├── MAContractItem 생성 (장비 목록)
    └── Notification 생성

[월간 MA 청구 (크론잡)]
    ├── 활성 MAContract 조회
    ├── MABilling 레코드 생성
    ├── SalesLedger 자동 등록 (월간 매출)
    └── PurchaseLedger 자동 등록 (월간 매입)

[입금 확인]
    ├── Payment 기록 생성
    ├── SalesLedger.paymentStatus 업데이트
    └── 미수금 잔액 재계산

[출금 처리]
    ├── Payment 기록 생성
    ├── PurchaseLedger.paymentStatus 업데이트
    └── 미지급금 잔액 재계산
```
