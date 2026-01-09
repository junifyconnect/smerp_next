# SMERP 기능설계서

## 1. 개요

SMERP는 영업 및 유지보수(MA) 업무를 위한 ERP 시스템입니다.

### 1.1 문서 타입

| 구분  | 문서 타입              | 설명                   |
| ----- | ---------------------- | ---------------------- |
| Sales | 견적서 (SalesQuote)    | 고객에게 제안하는 견적 |
| Sales | 품의서 (SalesApproval) | 영업 건 승인 요청      |
| Sales | 수주 (SalesOrder)      | 확정된 주문            |
| MA    | 견적서 (MAQuote)       | 유지보수 견적          |
| MA    | 품의서 (MAApproval)    | 유지보수 품의 승인     |

### 1.2 핵심 개념: Deal (거래)

Deal은 **하나의 영업 건을 처음부터 끝까지 묶는 단위**입니다.

```
Deal: "ABC회사 서버 구축 건"
├── 고객: ABC회사
├── 담당자: 김영업
├── 상태: WON (수주 성공)
│
├── [견적서] (1/5) 서버 10대 - 첫 견적 → REJECTED
├── [견적서] (1/7) 서버 10대 - 수정 견적 → REJECTED
├── [견적서] (1/9) 서버 10대 - 최종 견적 → ACCEPTED ✓
│
├── [품의서] SA-2025-0001 (1/10) - 1차 납품분 → APPROVED ✓
├── [품의서] SA-2025-0002 (1/10) - 2차 납품분 → APPROVED ✓
│
└── [수주]   SO-2025-0001 (1/11) - 진행중
```

**Deal의 역할:**

- 관련 문서들을 하나의 거래로 그룹핑
- 영업 진행 상황 추적 (견적중 → 협상중 → 수주완료/실패)
- 고객별 거래 이력 관리

---

## 2. Deal (거래)

### 2.1 데이터 모델

```prisma
model Deal {
  id          String     @id @default(cuid())
  name        String     // "ABC회사 서버 구축 건"
  description String?    // 거래 설명

  customerId  String?
  customer    Customer?  @relation(fields: [customerId], references: [id])

  ownerId     String?    // 담당 영업사원
  owner       User?      @relation(fields: [ownerId], references: [id])

  status      DealStatus @default(QUOTING)

  // 연결된 문서들
  salesQuotes    SalesQuote[]
  salesApprovals SalesApproval[]
  salesOrders    SalesOrder[]
  maQuotes       MAQuote[]
  maApprovals    MAApproval[]

  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
}

enum DealStatus {
  QUOTING      // 견적 진행중
  NEGOTIATING  // 협상중 (견적 발송 후)
  WON          // 수주 성공
  LOST         // 수주 실패
  ON_HOLD      // 보류
}
```

### 2.2 기능 목록

| #   | 기능      | 설명                             | 상태         |
| --- | --------- | -------------------------------- | ------------ |
| 1   | Deal 생성 | 새 거래 생성                     | 🔨 구현 필요 |
| 2   | Deal 목록 | 거래 목록 조회/검색/필터         | 🔨 구현 필요 |
| 3   | Deal 상세 | 거래 상세 및 연결된 문서 조회    | 🔨 구현 필요 |
| 4   | Deal 수정 | 거래 정보 수정                   | 🔨 구현 필요 |
| 5   | 상태 변경 | 거래 상태 변경 (자동/수동)       | 🔨 구현 필요 |
| 6   | 문서 연결 | 견적서/품의서/수주를 Deal에 연결 | 🔨 구현 필요 |

### 2.3 상태 전환 규칙

```
QUOTING ──(견적 발송)──→ NEGOTIATING
    │                        │
    │                        ├──(견적 수락)──→ WON
    │                        │
    │                        └──(견적 거절, 재견적 없음)──→ LOST
    │
    └──(보류)──→ ON_HOLD
```

---

## 3. Sales 견적서 (SalesQuote)

### 3.1 업무 흐름

```
[Deal 생성/선택] → 견적서 작성 → 견적서 발송 → (재견적 요청 시) 새 견적서 작성
```

### 3.2 수정 규칙

| 상황           | 처리 방식                         |
| -------------- | --------------------------------- |
| 발송 전 수정   | 기존 견적서 덮어쓰기              |
| 발송 후 재견적 | 새 견적서 생성 (같은 Deal에 추가) |

### 3.3 기능 목록

| #   | 기능             | 설명                                   | 상태         |
| --- | ---------------- | -------------------------------------- | ------------ |
| 1   | 웹 견적서 작성   | 폼을 통한 견적서 직접 입력             | ✅ 완료      |
| 2   | DB 저장          | 작성한 견적서 데이터베이스 저장        | ✅ 완료      |
| 3   | 엑셀 다운로드    | 템플릿 기반 엑셀 파일 생성 및 다운로드 | ✅ 완료      |
| 4   | 엑셀 템플릿 관리 | 견적서 양식 템플릿 보관                | ✅ 완료      |
| 5   | 원본 파일 보관   | 직인 찍힌 최종본 S3 업로드/다운로드    | 🔨 구현 필요 |
| 6   | 견적서 수정      | 발송 전 수정 (덮어쓰기)                | 🔨 구현 필요 |
| 7   | 재견적 생성      | 발송 후 새 견적서 생성 (같은 Deal)     | 🔨 구현 필요 |
| 8   | 견적서 복사      | 기존 견적서 기반 새 견적서 생성        | 🔨 구현 필요 |
| 9   | 상태 관리        | DRAFT → SENT → ACCEPTED/REJECTED       | 🔨 구현 필요 |
| 10  | 고객사 연동      | 고객사 선택 시 정보 자동 입력          | 🔨 구현 필요 |
| 11  | Deal 연결        | Deal에 견적서 연결                     | 🔨 구현 필요 |

### 3.4 데이터 모델

```prisma
model SalesQuote {
  id          String      @id @default(cuid())
  // 문서번호 없음 - 날짜/고객사/담당자/물품명으로 식별

  // Deal 연결 (필수)
  dealId      String
  deal        Deal        @relation(fields: [dealId], references: [id])

  // 고객 정보
  customerId  String?
  customer    Customer?   @relation(fields: [customerId], references: [id])
  customerName    String?
  contactName     String?
  contactEmail    String?
  contactPhone    String?

  // 견적 정보
  quoteDate       DateTime
  productName     String?     // 물품명 (식별용)
  validUntil      DateTime?
  totalAmount     Decimal?
  notes           String?

  // 상태
  status      QuoteStatus @default(DRAFT)

  // 원본 파일 보관
  originalFileUrl   String?
  originalFileName  String?
  uploadedAt        DateTime?
  uploadedBy        String?

  // 품목
  items       SalesQuoteItem[]

  // 연결된 품의서들
  approvals   SalesApproval[]

  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  createdBy   String?
}

enum QuoteStatus {
  DRAFT      // 작성중
  SENT       // 발송됨
  ACCEPTED   // 수락됨
  REJECTED   // 거절됨
}
```

### 3.5 견적서 식별 방식

문서번호 대신 다음 조합으로 식별:

- **견적일자** (quoteDate)
- **고객사** (customerName)
- **담당자** (contactName)
- **물품명** (productName)

파일명 예시: `2025.01.09_(서버 10대)_(ABC회사)_(김담당)_견적서.xlsx`

### 3.6 원본 파일 보관

**용도:**

- 직인/서명이 포함된 최종 견적서 파일 보관
- 고객에게 실제 발송한 파일의 원본 유지

**기능:**

1. 파일 업로드 (담당자가 직접 업로드)
2. 파일 다운로드
3. 파일 교체 (새 파일 업로드 시 기존 파일 대체)

---

## 4. 고객사 마스터

### 4.1 데이터 모델

```prisma
model Customer {
  id          String   @id @default(cuid())
  name        String   // 회사명
  bizNumber   String?  // 사업자등록번호
  address     String?  // 주소
  phone       String?  // 대표전화
  fax         String?  // 팩스

  contacts    CustomerContact[]  // 담당자 목록
  deals       Deal[]             // 관련 거래

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model CustomerContact {
  id          String   @id @default(cuid())
  customerId  String
  customer    Customer @relation(fields: [customerId], references: [id])

  name        String   // 담당자명
  position    String?  // 직책
  department  String?  // 부서
  email       String?  // 이메일
  phone       String?  // 연락처
  isPrimary   Boolean  @default(false)  // 주 담당자 여부

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### 4.2 기능 목록

| #   | 기능        | 설명                                          | 상태         |
| --- | ----------- | --------------------------------------------- | ------------ |
| 1   | 고객사 등록 | 새 고객사 정보 등록                           | 🔨 구현 필요 |
| 2   | 고객사 수정 | 기존 고객사 정보 수정                         | 🔨 구현 필요 |
| 3   | 고객사 목록 | 고객사 목록 조회/검색                         | 🔨 구현 필요 |
| 4   | 담당자 관리 | 고객사별 담당자 추가/수정/삭제                | 🔨 구현 필요 |
| 5   | 견적서 연동 | 견적서 작성 시 고객사 선택하면 정보 자동 입력 | 🔨 구현 필요 |

---

## 5. Sales 품의서 (SalesApproval)

### 5.1 업무 흐름

```
견적 수락 → 품의서 작성 → 승인 요청 → 승인/반려
```

### 5.2 문서 연결

- **Deal**: 필수 - 어떤 거래의 품의서인지
- **견적서**: 선택 - 어떤 견적서 기반인지 (1개 견적서에 N개 품의서 가능)

**예시: 분할 납품**

```
Deal: ABC회사 서버 구축
└── 견적서: 서버 10대 (1억)
    ├── 품의서: SA-2025-0001 (1차 납품 5대, 5천만)
    └── 품의서: SA-2025-0002 (2차 납품 5대, 5천만)
```

### 5.3 기능 목록

| #   | 기능           | 설명                    | 상태         |
| --- | -------------- | ----------------------- | ------------ |
| 1   | 웹 품의서 작성 | 매출/매입 항목 입력     | ✅ 완료      |
| 2   | DB 저장        | 품의서 데이터 저장      | ✅ 완료      |
| 3   | 엑셀 다운로드  | 템플릿 기반 생성        | ✅ 완료      |
| 4   | 승인 요청      | 상태를 PENDING으로 변경 | 🔨 구현 필요 |
| 5   | 승인/반려 처리 | 승인권자의 승인/반려    | 🔨 구현 필요 |
| 6   | Deal 연결      | Deal에 품의서 연결      | 🔨 구현 필요 |
| 7   | 견적서 연결    | 관련 견적서 참조 (선택) | 🔨 구현 필요 |

### 5.4 데이터 모델

```prisma
model SalesApproval {
  id          String   @id @default(cuid())
  docNumber   String   @unique  // SA-2025-0001

  // Deal 연결 (필수)
  dealId      String
  deal        Deal     @relation(fields: [dealId], references: [id])

  // 견적서 연결 (선택)
  quoteId     String?
  quote       SalesQuote? @relation(fields: [quoteId], references: [id])

  // 상태
  status      ApprovalStatus @default(DRAFT)

  // 매출/매입 항목
  salesItems    SalesApprovalItem[]
  purchaseItems SalesApprovalPurchaseItem[]

  // ... 기타 필드
}

enum ApprovalStatus {
  DRAFT     // 작성중
  PENDING   // 승인대기
  APPROVED  // 승인됨
  REJECTED  // 반려됨
}
```

---

## 6. Sales 수주 (SalesOrder)

### 6.1 업무 흐름

```
품의 승인 → 수주 생성 → 납품/완료
```

### 6.2 문서 연결

- **Deal**: 필수
- **품의서**: 선택 (N:N 가능 - 여러 품의서를 하나의 수주로)

### 6.3 기능 목록

| #   | 기능        | 설명                              | 상태         |
| --- | ----------- | --------------------------------- | ------------ |
| 1   | 수주 등록   | 수주 정보 입력                    | ✅ 완료      |
| 2   | DB 저장     | 수주 데이터 저장                  | ✅ 완료      |
| 3   | Deal 연결   | Deal에 수주 연결                  | 🔨 구현 필요 |
| 4   | 품의서 연결 | 승인된 품의서 기반 수주 생성      | 🔨 구현 필요 |
| 5   | 상태 관리   | PENDING → IN_PROGRESS → COMPLETED | 🔨 구현 필요 |

---

## 7. MA 견적서 (MAQuote)

Sales 견적서와 동일한 구조로 구현 (Deal 연결 포함)

| #   | 기능           | 설명               | 상태         |
| --- | -------------- | ------------------ | ------------ |
| 1   | 웹 견적서 작성 | 폼을 통한 입력     | ✅ 완료      |
| 2   | DB 저장        | 데이터베이스 저장  | ✅ 완료      |
| 3   | 엑셀 다운로드  | 템플릿 기반 생성   | ✅ 완료      |
| 4   | Deal 연결      | Deal에 견적서 연결 | 🔨 구현 필요 |
| 5   | 원본 파일 보관 | S3 업로드          | 🔨 구현 필요 |

---

## 8. MA 품의서 (MAApproval)

Sales 품의서와 동일한 구조로 구현 (Deal 연결 포함)

| #   | 기능           | 설명                | 상태         |
| --- | -------------- | ------------------- | ------------ |
| 1   | 웹 품의서 작성 | 매출/매입 항목 입력 | ✅ 완료      |
| 2   | DB 저장        | 품의서 데이터 저장  | ✅ 완료      |
| 3   | 엑셀 다운로드  | 템플릿 기반 생성    | ✅ 완료      |
| 4   | Deal 연결      | Deal에 품의서 연결  | 🔨 구현 필요 |
| 5   | 승인 처리      | 승인/반려 기능      | 🔨 구현 필요 |

---

## 9. 공통 기능

### 9.1 인증/권한

| #   | 기능      | 설명             | 상태         |
| --- | --------- | ---------------- | ------------ |
| 1   | 로그인    | 사용자 인증      | ✅ 완료      |
| 2   | 권한 관리 | 역할별 접근 제어 | 🔨 구현 필요 |

### 9.2 파일 관리

| #   | 기능        | 설명               | 상태    |
| --- | ----------- | ------------------ | ------- |
| 1   | S3 업로드   | 파일 업로드        | ✅ 완료 |
| 2   | S3 다운로드 | 파일 다운로드      | ✅ 완료 |
| 3   | 엑셀 템플릿 | 문서별 템플릿 관리 | ✅ 완료 |

---

## 10. 구현 우선순위

### Phase 1 (핵심 기능)

1. ✅ Deal 모델 추가
2. 고객사 마스터 (Customer, CustomerContact)
3. Deal CRUD 기능
4. 견적서-Deal 연결

### Phase 2 (문서 연결)

1. 품의서-Deal 연결
2. 품의서-견적서 연결 (선택)
3. 수주-Deal 연결
4. 원본 파일 업로드/다운로드

### Phase 3 (승인 프로세스)

1. 품의서 승인/반려 기능
2. 상태 자동 전환

### Phase 4 (편의 기능)

1. 견적서 복사/재견적 기능
2. 상태별 목록 필터링
3. Deal 대시보드/통계

---

## 변경 이력

| 날짜       | 버전 | 변경 내용                                         |
| ---------- | ---- | ------------------------------------------------- |
| 2025-01-09 | 1.0  | 초안 작성                                         |
| 2025-01-09 | 1.1  | Deal 개념 추가, 문서 연결 구조 정리               |
| 2025-01-09 | 1.2  | 견적서 문서번호 제거, 날짜/고객사/물품명으로 식별 |
