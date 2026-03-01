# SMERP v2 — 설계 문서

## 1. 아키텍처 개요

```
┌─────────────────────────────────────────┐
│             Next.js App Router          │
├──────────────┬──────────────────────────┤
│   Pages      │     API Routes           │
│   (SSR/CSR)  │  (/api/*)               │
├──────────────┴──────────────────────────┤
│           lib/ (비즈니스 로직)            │
│  ├── auth/     (인증/세션)              │
│  ├── db.ts     (Prisma client)         │
│  ├── s3.ts     (S3 업로드)             │
│  ├── excel/    (엑셀 파싱/생성)         │
│  └── notifications/ (알림 헬퍼) ← NEW  │
├─────────────────────────────────────────┤
│         Prisma ORM + PostgreSQL         │
│              AWS S3                     │
└─────────────────────────────────────────┘
```

### 기존 패턴 (유지)
- Server Component에서 데이터 로딩 → Client Component로 전달
- API Routes로 CRUD
- Prisma transaction으로 복잡한 작업 원자적 처리
- S3 presigned URL로 파일 접근

---

## 2. P0 기능 설계

### 2.1 알림 시스템 트리거 연동

#### 현재 상태
- 알림 모델/API 존재 (CRUD)
- NotificationBell 컴포넌트 존재
- **결재/반려 시 알림 생성 로직 없음**

#### 설계

**lib/notifications/sender.ts** (신규)
```typescript
// 알림 생성 + (선택) 이메일 발송
export async function sendNotification(params: {
  userId: string
  type: NotificationType
  title: string
  message: string
  linkUrl?: string
  relatedId?: string
  relatedType?: string
}) {
  // 1. DB에 알림 생성
  await prisma.notification.create({ data: params })
  // 2. (향후) 이메일/푸시 연동
}

// 결재 관련 알림 헬퍼
export async function notifyApprovalRequest(approval: SalesApproval, targetUserId: string)
export async function notifyApprovalApproved(approval: SalesApproval)
export async function notifyApprovalRejected(approval: SalesApproval, reason: string)
```

**트리거 포인트:**
| 이벤트 | 파일 | 수신자 |
|--------|------|--------|
| 품의서 기안(submit) | `sales-approvals/[id]/submit/route.ts` | 영업팀장 |
| 팀장 서명 | `sales-approvals/[id]/sign/route.ts` | CEO |
| CEO 승인 | `sales-approvals/[id]/sign/route.ts` | 작성자 |
| 반려 | `sales-approvals/[id]/reject/route.ts` | 작성자 |
| 회수 | `sales-approvals/[id]/withdraw/route.ts` | 결재자들 |

**수신자 조회 로직:**
```typescript
// 팀장 찾기: role이 SALES_MANAGER인 User
// CEO 찾기: position이 'CEO' 또는 role이 'CEO'
// 향후 결재라인 커스터마이징 가능하도록 추상화
```

**실시간 알림 (선택):**
- 현재: 페이지 리프레시 시 조회 (폴링)
- 향후: SSE 또는 폴링 주기 짧게 (30초)
- 이메일 알림은 P1에서 추가

---

### 2.2 거래처 CRUD UI

#### 현재 상태
- Customer/Vendor 모델 + API 완성
- CustomerSelectModal 존재 (품의서 작성 시 사용)
- **독립 관리 페이지 없음**

#### 설계

**페이지 구조:**
```
/admin/customers          → 매출처(Customer) 목록 + CRUD
/admin/customers/[id]     → 매출처 상세 (담당자 목록 포함)
/admin/vendors            → 매입처(Vendor) 목록 + CRUD
```

**매출처 목록 (`/admin/customers`)**
- 검색 (회사명)
- 테이블: 회사명, 전화, 주소, 담당자 수, 수정일
- 추가/수정 모달
- 비활성화 (soft delete)

**매출처 상세 (`/admin/customers/[id]`)**
- 회사 기본정보 수정
- 담당자 목록 CRUD (이름, 부서, 직급, 전화, 이메일)
- 기본 담당자 지정
- 이 거래처 관련 문서 목록 (견적서/품의서 히스토리)

**매입처 목록 (`/admin/vendors`)**
- 테이블: 매입처명, 담당자, 전화, 이메일, 사용횟수
- 추가/수정 모달
- 사용횟수 기준 정렬 (자주 쓰는 매입처 상단)

**컴포넌트:**
```
components/admin/
  CustomerList.tsx      (목록 + 검색 + 추가/수정 모달)
  CustomerDetail.tsx    (상세 + 담당자 CRUD)
  VendorList.tsx        (목록 + 검색 + 추가/수정 모달)
```

---

### 2.3 엑셀 다운로드

#### 현재 상태
- 엑셀 업로드 + 파싱 구현됨
- ExcelTemplate 모델 (양식 매핑 정보) 있음
- `sales-quotes/[id]/excel`, `sales-approvals/[id]/excel` 라우트 존재하지만 미구현 확인 필요

#### 설계

**lib/excel/generator.ts** (신규)
```typescript
// 양식 기반 엑셀 생성
export async function generateExcel(params: {
  templateId: string       // ExcelTemplate ID
  data: Record<string, any>  // 매핑할 데이터
  items: any[]             // 품목 배열
}): Promise<Buffer>
```

**생성 로직:**
1. ExcelTemplate에서 양식 파일(S3) 다운로드
2. `exceljs`로 양식 열기
3. `fieldMappings`에 따라 셀에 데이터 채우기
4. `salesColumnMappings`/`purchaseColumnMappings`에 따라 품목 행 채우기
5. Buffer 반환 → 클라이언트에서 다운로드

**엔드포인트:**
```
GET /api/sales-quotes/[id]/excel      → 견적서 엑셀
GET /api/sales-approvals/[id]/excel   → 품의서 엑셀
GET /api/sales-orders/[id]/excel      → 발주서 엑셀
GET /api/ma-quotes/[id]/excel         → MA 견적서 엑셀
```

**양식 없을 때:** 기본 템플릿으로 생성 (양식 독립적)

---

### 2.4 매출장/매입장 ↔ 품의서 연동

#### 현재 상태
- SalesLedger/PurchaseLedger 모델 있음
- 수동 입력 API만 존재
- **품의서 승인 시 자동 생성 없음**

#### 설계

**자동 생성 트리거: CEO 최종 승인 시**

`sales-approvals/[id]/sign/route.ts`의 CEO 승인 블록에 추가:

```typescript
// CEO 승인 완료 후
if (isCeoApproval) {
  // 매출장 자동 생성 (제품 단위 = 매출 건)
  for (const product of approval.products) {
    await tx.salesLedger.create({
      data: {
        approvalCode: approval.approvalCode,
        transactionDate: approval.approvalDate || new Date(),
        clientCompany: approval.clientCompany,
        endUser: approval.endUser,
        category: '상품',  // MA 품의서면 'MA'
        description: product.name,
        quantity: product.quantity,
        unitPrice: product.unitPrice,
        supplyAmount: product.totalPrice,
        vatAmount: product.totalPrice * 0.1,
        totalAmount: product.totalPrice * 1.1,
        grossProfit: product.totalPrice - purchaseTotal,
        managerName: approval.managerName,
        salesApprovalId: approval.id,
      }
    })
  }

  // 매입장 자동 생성 (품목별 매입처 단위)
  for (const product of approval.products) {
    for (const item of product.items) {
      if (!item.vendorName || !item.purchaseTotal) continue
      await tx.purchaseLedger.create({
        data: {
          approvalCode: approval.approvalCode,
          invoiceDate: item.purchaseDate || new Date(),
          vendorCompany: item.vendorName,
          clientCompany: approval.clientCompany,
          category: '상품',
          itemName: item.description || item.partNumber,
          quantity: item.purchaseQty,
          unitPrice: item.purchasePrice,
          supplyAmount: item.purchaseTotal,
          vatAmount: item.purchaseTotal * 0.1,
          totalAmount: item.purchaseTotal * 1.1,
          salesApprovalId: approval.id,
        }
      })
    }
  }
}
```

**수정(Revise) 시:** 이전 매출장/매입장 삭제 → 새로 생성 (또는 연결만 업데이트)

---

## 3. P1 기능 설계

### 3.1 역할별 대시보드

**영업 담당자:**
- 내 견적서/품의서 현황 (건수, 상태별)
- 결재 대기 중인 내 문서
- 최근 승인/반려된 문서
- 이번달 매출 요약

**영업 팀장 / CEO:**
- 결재 대기 문서 목록 (액션 필요)
- 팀 전체 문서 현황
- 매출/이익 요약

**경영팀:**
- 계산서 미발행 건수
- 외상매출/매입 요약
- 월별 매출/매입 추이
- 입출금 예정

**구현:** `DashboardPageClient`에서 user.role 기반으로 위젯 분기

### 3.2 감사 로그

**모델:**
```prisma
model AuditLog {
  id        String   @id @default(uuid())
  userId    String
  action    String   // CREATE, UPDATE, DELETE, SIGN, REJECT, WITHDRAW
  entity    String   // SalesApproval, SalesQuote, etc.
  entityId  String
  changes   Json?    // { before: {...}, after: {...} }
  ipAddress String?
  createdAt DateTime @default(now())
}
```

**미들웨어 패턴:** API 핸들러에서 주요 액션 후 `auditLog.create()` 호출

### 3.3 외상매출/매입 관리

**외상매출 입금예정:**
- SalesLedger에서 paymentStatus가 PENDING/PARTIAL인 건
- 결제예정일 기준 정렬
- 입금 처리 (paymentDate, paymentStatus 업데이트)

**외상매입 출금예정:**
- PurchaseLedger에서 paymentStatus가 PENDING인 건
- 출금 처리

**페이지:** `/management/receivables`, `/management/payables`

---

## 4. 폴더 구조 (신규/수정 파일)

```
lib/
  notifications/
    sender.ts           ← 알림 발송 헬퍼
  excel/
    generator.ts        ← 엑셀 생성 (다운로드)

app/(main)/
  admin/
    customers/
      page.tsx          ← 매출처 목록
      [id]/page.tsx     ← 매출처 상세
    vendors/
      page.tsx          ← 매입처 목록
  management/
    receivables/page.tsx  ← 외상매출 (P1)
    payables/page.tsx     ← 외상매입 (P1)

components/
  admin/
    CustomerList.tsx
    CustomerDetail.tsx
    VendorList.tsx

수정 필요:
  app/api/sales-approvals/[id]/sign/route.ts    ← 알림 + 매출장 연동
  app/api/sales-approvals/[id]/submit/route.ts  ← 알림
  app/api/sales-approvals/[id]/reject/route.ts  ← 알림
  app/api/sales-approvals/[id]/withdraw/route.ts ← 알림
  app/api/sales-quotes/[id]/excel/route.ts      ← 엑셀 생성
  app/api/sales-approvals/[id]/excel/route.ts   ← 엑셀 생성
  app/api/sales-orders/[id]/excel/route.ts      ← 엑셀 생성
```

---

## 5. 구현 순서 (제안)

1. **알림 헬퍼** → 결재 API에 트리거 추가 (가장 코어)
2. **거래처 UI** → 이미 API 있으니 UI만 (빠름)
3. **매출장/매입장 연동** → CEO 승인 시 자동 생성
4. **엑셀 다운로드** → 양식 기반 생성 (가장 복잡)

에이전트 분배 (구현 시):
- **클레버**: 알림 시스템 + 매출장 연동 (API 수정, 비즈니스 로직)
- **클로버**: 거래처 UI (프론트엔드 페이지)
- **조이**: 엑셀 다운로드 (exceljs 기반 생성)

---
*작성: 클레버 | 2026-03-01*
