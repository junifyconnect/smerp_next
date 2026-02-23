# SMERP v2 스키마 초안

> 기존 4단계 → 2단계 단순화. Deal 모델 제거.

## 변경 요약

| 삭제 | 신규/변경 |
|------|-----------|
| Deal, DealStatus | 제거 |
| SalesApprovalItemDetail | 제거 (텍스트로 대체) |
| SalesApprovalPurchaseItem | 제거 |
| SalesApprovalPurchaseItemDetail | 제거 |
| SalesQuoteProduct | 유지 (이름만 정리) |
| SalesQuoteItem | 유지 |

## 견적서 (SalesQuote)

```prisma
// 견적서 - 변경 없음 (dealId만 제거)
model SalesQuote {
  id     String      @id @default(uuid())
  status QuoteStatus @default(DRAFT)

  // 버전 관리
  version    Int      @default(1)
  originalId String?  @map("original_id")
  isLatest   Boolean  @default(true) @map("is_latest")
  original   SalesQuote?  @relation("QuoteVersions", fields: [originalId], references: [id])
  versions   SalesQuote[] @relation("QuoteVersions")

  // 프로젝트 정보
  projectName String? @map("project_name")
  managerName String? @map("manager_name")

  // 매출처 정보
  clientCompany String? @map("client_company")
  clientContact String? @map("client_contact")
  clientPhone   String? @map("client_phone")
  clientFax     String? @map("client_fax")
  clientMobile  String? @map("client_mobile")
  clientEmail   String? @map("client_email")

  // 금액
  totalAmount  Decimal @default(0) @map("total_amount") @db.Decimal(15, 2)
  vatAmount    Decimal @default(0) @map("vat_amount") @db.Decimal(15, 2)
  totalWithVat Decimal @default(0) @map("total_with_vat") @db.Decimal(15, 2)

  // 조건
  quoteDate      DateTime? @map("quote_date") @db.Date
  deliveryDate   DateTime? @map("delivery_date") @db.Date
  validityPeriod String?   @map("validity_period")
  paymentTerms   String?   @map("payment_terms")
  notes          String?   @db.Text

  // 메타
  createdById String   @map("created_by")
  createdBy   User     @relation("SalesQuoteCreatedBy", fields: [createdById], references: [id])
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  // 관계
  products SalesQuoteProduct[]
  files    SalesQuoteFile[]

  @@index([status])
  @@index([createdById])
  @@index([isLatest])
  @@index([originalId])
  @@index([createdAt(sort: Desc)])
  @@map("sales_quotes")
}

// 견적서 제품 (매출 단위)
model SalesQuoteProduct {
  id      String @id @default(uuid())
  quoteId String @map("quote_id")

  sortOrder  Int      @default(0) @map("sort_order")
  name       String   // 제품명 (예: "영상편집용 조립PC")
  quantity   Int      @default(1)
  unitPrice  Decimal? @map("unit_price") @db.Decimal(15, 2)
  totalPrice Decimal? @map("total_price") @db.Decimal(15, 2)

  quote SalesQuote      @relation(fields: [quoteId], references: [id], onDelete: Cascade)
  items SalesQuoteItem[]

  createdAt DateTime @default(now()) @map("created_at")

  @@index([quoteId])
  @@map("sales_quote_products")
}

// 견적서 품목 (개별 부품 - 매입 정보 없음)
model SalesQuoteItem {
  id        String @id @default(uuid())
  productId String @map("product_id")

  sortOrder   Int      @default(0) @map("sort_order")
  partNumber  String?  @map("part_number")  // P/N (예: CPU, BOARD)
  description String?  @db.Text             // 상세 스펙
  quantity    Int      @default(1)
  unitPrice   Decimal? @map("unit_price") @db.Decimal(15, 2)   // 개별 매출단가 (선택)
  totalPrice  Decimal? @map("total_price") @db.Decimal(15, 2)

  product   SalesQuoteProduct @relation(fields: [productId], references: [id], onDelete: Cascade)
  createdAt DateTime          @default(now()) @map("created_at")

  @@index([productId])
  @@map("sales_quote_items")
}
```

## 품의서 (SalesApproval) — 핵심 변경

```prisma
enum ApprovalStatus {
  DRAFT
  PENDING           // 영업담당 승인대기
  PENDING_TEAM_LEAD // 팀장 승인대기
  PENDING_CEO       // 대표 승인대기
  APPROVED
  REJECTED
  WITHDRAWN         // 회수됨
}

// 품의서 본체 - dealId 제거, 나머지 유지
model SalesApproval {
  id             String         @id @default(uuid())
  approvalNumber String         @unique @map("approval_number")
  status         ApprovalStatus @default(DRAFT)

  // 원본 견적서 (데이터 복사용, 약한 참조)
  sourceQuoteId String?     @map("source_quote_id")
  sourceQuote   SalesQuote? @relation(fields: [sourceQuoteId], references: [id])

  // 기본 정보
  approvalCode String?   @map("approval_code")
  approvalDate DateTime? @map("approval_date") @db.Date
  managerName  String?   @map("manager_name")

  // 버전 관리
  version    Int      @default(1)
  originalId String?  @map("original_id")
  isLatest   Boolean  @default(true) @map("is_latest")
  original   SalesApproval?  @relation("ApprovalVersions", fields: [originalId], references: [id])
  versions   SalesApproval[] @relation("ApprovalVersions")

  // 매출처 정보
  clientCompany String? @map("client_company")
  clientContact String? @map("client_contact")
  clientPhone   String? @map("client_phone")
  endUser       String? @map("end_user")
  mtSnInfo      String? @map("mt_sn_info")  // MT&S/N

  // 금액 (자동 계산)
  totalSalesAmount    Decimal @default(0) @map("total_sales_amount") @db.Decimal(15, 2)
  totalPurchaseAmount Decimal @default(0) @map("total_purchase_amount") @db.Decimal(15, 2)
  profitAmount        Decimal @default(0) @map("profit_amount") @db.Decimal(15, 2)  // 매출-매입

  // 조건
  paymentTerms       String?   @map("payment_terms")
  deliveryAddress    String?   @map("delivery_address")
  deliveryDate       DateTime? @map("delivery_date") @db.Date
  invoiceEmail       String?   @map("invoice_email")
  invoiceDueDate     String?   @map("invoice_due_date")  // 계산서 발행예정일 (텍스트)
  receiverName       String?   @map("receiver_name")
  receiverPhone      String?   @map("receiver_phone")
  notes              String?   @db.Text

  // 결재 서명 (기존과 동일)
  salesManagerId       String?   @map("sales_manager_id")
  salesManager         User?     @relation("SalesManagerSigner", fields: [salesManagerId], references: [id])
  salesManagerSignedAt DateTime? @map("sales_manager_signed_at")

  teamLeaderId       String?   @map("team_leader_id")
  teamLeader         User?     @relation("TeamLeaderSigner", fields: [teamLeaderId], references: [id])
  teamLeaderSignedAt DateTime? @map("team_leader_signed_at")

  ceoId       String?   @map("ceo_id")
  ceo         User?     @relation("CeoSigner", fields: [ceoId], references: [id])
  ceoSignedAt DateTime? @map("ceo_signed_at")

  rejectedById    String?   @map("rejected_by_id")
  rejectedBy      User?     @relation("ApprovalRejector", fields: [rejectedById], references: [id])
  rejectedAt      DateTime? @map("rejected_at")
  rejectionReason String?   @map("rejection_reason") @db.Text

  // 메타
  createdById String   @map("created_by")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  // 관계
  products       SalesApprovalProduct[]
  files          SalesApprovalFile[]
  invoiceRecords InvoiceRecord[]

  @@index([status])
  @@index([createdById])
  @@index([isLatest])
  @@index([originalId])
  @@index([approvalCode])
  @@index([createdAt(sort: Desc)])
  @@unique([approvalCode, version])
  @@map("sales_approvals")
}

// ★ 품의서 제품 (매출 단위 = 매출 계산서 단위)
model SalesApprovalProduct {
  id         String @id @default(uuid())
  approvalId String @map("approval_id")

  sortOrder  Int      @default(0) @map("sort_order")
  name       String   // 제품명 (예: "영상편집용 조립PC")
  quantity   Int      @default(1)
  unitPrice  Decimal? @map("unit_price") @db.Decimal(15, 2)   // 매출 단가
  totalPrice Decimal? @map("total_price") @db.Decimal(15, 2)  // 매출 합계

  // 매출 계산서
  salesInvoiceStatus String    @default("PENDING") @map("sales_invoice_status")  // PENDING, ISSUED
  salesInvoiceDate   DateTime? @map("sales_invoice_date") @db.Date

  // 버전 추적 (revise 시 원본 Product ID)
  sourceProductId String? @map("source_product_id")

  approval SalesApproval       @relation(fields: [approvalId], references: [id], onDelete: Cascade)
  items    SalesApprovalItem[]

  createdAt DateTime @default(now()) @map("created_at")

  @@index([approvalId])
  @@index([sourceProductId])
  @@map("sales_approval_products")
}

// ★ 품의서 품목 (개별 부품 + 매입 정보)
model SalesApprovalItem {
  id        String @id @default(uuid())
  productId String @map("product_id")

  sortOrder   Int      @default(0) @map("sort_order")
  partNumber  String?  @map("part_number")   // P/N (예: CPU, BOARD)
  description String?  @db.Text              // 상세 스펙

  // 매출 (선택 - 품목별 매출가 필요할 때)
  quantity       Int      @default(1)
  salesUnitPrice Decimal? @map("sales_unit_price") @db.Decimal(15, 2)  // nullable 예비

  // 매입
  vendorName    String?   @map("vendor_name")     // 매입처명
  purchaseQty   Int       @default(1) @map("purchase_qty")
  purchasePrice Decimal?  @map("purchase_price") @db.Decimal(15, 2)  // 매입 단가
  purchaseTotal Decimal?  @map("purchase_total") @db.Decimal(15, 2)  // 매입 합계
  purchaseDate  DateTime? @map("purchase_date") @db.Date              // 매입일

  // 매입 계산서
  purchaseInvoiceStatus String    @default("PENDING") @map("purchase_invoice_status")
  purchaseInvoiceDate   DateTime? @map("purchase_invoice_date") @db.Date

  // 버전 추적
  sourceItemId String? @map("source_item_id")

  product   SalesApprovalProduct @relation(fields: [productId], references: [id], onDelete: Cascade)
  createdAt DateTime             @default(now()) @map("created_at")

  @@index([productId])
  @@index([vendorName])
  @@index([sourceItemId])
  @@map("sales_approval_items")
}
```

## 계산서 자동생성 로직

```
품의서 APPROVED 시:

1. 매출 계산서 (Product 단위)
   FOR EACH product IN approval.products:
     → InvoiceRecord 생성 (type: SALES, amount: product.totalPrice)

2. 매입 계산서 (매입처 단위)
   GROUP items BY vendorName:
     → InvoiceRecord 생성 (type: PURCHASE, vendor: vendorName, amount: SUM(purchaseTotal))
```

## 엑셀 매핑 (조립PC 예시)

```
SalesApprovalProduct:
  name: "영상편집용 조립PC"
  quantity: 1
  unitPrice: 4,500,000
  totalPrice: 4,500,000

SalesApprovalItem[]:
  | partNumber | description              | qty | vendorName   | purchasePrice | purchaseTotal |
  |------------|--------------------------|-----|--------------|---------------|---------------|
  | CPU        | 인텔 i9-285K             | 1   | 다나와       | 900,000       | 900,000       |
  | BOARD      | 기가바이트 Z890          | 1   | 컴퓨존       | 327,000       | 327,000       |
  | RAM        | DDR5 16GB                | 2   | 조이젠       | 750,000       | 1,500,000     |
  | M.2 SSD    | 500GB NVMe              | 1   | 아싸컴       | 200,000       | 200,000       |
  | M.2 SSD    | 1TB NVMe                | 1   | 컴스클럽     | 400,000       | 400,000       |
  | COOLER     | 3RSYS RC1900N           | 1   | 견적왕       | 108,000       | 108,000       |
  | POWER      | MSI MAG A850GL 850W     | 1   | 쿠팡         | 133,000       | 133,000       |
  | CASE       | 3RSYS R200              | 1   | 네이버스토어 | 480,000       | 480,000       |
  | GPU        | RTX 5060 8GB            | 1   | 오버시스템   | 400,000       | 400,000       |
  | OS         | Windows 11 Pro          | 1   | 퀘이사존     | 250,000       | 250,000       |

자동생성 계산서:
  매출: 주니파이커넥트 ← 4,500,000원 (1건)
  매입: 다나와 900,000 / 컴퓨존 327,000 / 조이젠 1,500,000 / ... (10건)
```
