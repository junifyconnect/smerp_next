# ERP 시스템 개발 작업계획서

## 📋 프로젝트 개요

| 항목       | 내용                                         |
| ---------- | -------------------------------------------- |
| 프로젝트명 | 사내 ERP 시스템 (견적/품의/발주 관리)        |
| 기술스택   | Next.js 14+ (App Router), PostgreSQL, AWS S3 |
| 개발인원   | 프론트엔드 1명, 백엔드 1명                   |
| 핵심기능   | 문서 작성/관리, 엑셀 호환, 결재 시스템       |

---

## 🏗️ 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                      Next.js App                            │
│  ┌─────────────────────┐    ┌─────────────────────┐        │
│  │   Frontend (React)   │    │   Backend (API)     │        │
│  │   - Pages/Components │    │   - Route Handlers  │        │
│  │   - TanStack Query   │    │   - Server Actions  │        │
│  └─────────────────────┘    └─────────────────────┘        │
└────────────────┬────────────────────────┬───────────────────┘
                 │                        │
    ┌────────────▼────────────┐    ┌─────▼─────┐
    │      PostgreSQL         │    │   AWS S3   │
    │  - 사용자/권한          │    │  - 엑셀    │
    │  - 문서 데이터          │    │  - 첨부    │
    │  - 결재 이력            │    │  - 템플릿  │
    └─────────────────────────┘    └───────────┘
```

---

## 👥 사용자 권한 구조

### 역할(Role) 정의

| 역할            | 설명            | 주요 권한                 |
| --------------- | --------------- | ------------------------- |
| `ADMIN`         | 시스템 관리자   | 전체 권한, 사용자 관리    |
| `SALES_MANAGER` | 영업 관리자     | 영업 문서 전체, 결재 승인 |
| `SALES_STAFF`   | 영업 담당자     | 영업 문서 작성/조회       |
| `MA_MANAGER`    | 유지보수 관리자 | MA 문서 전체, 결재 승인   |
| `MA_STAFF`      | 유지보수 담당자 | MA 문서 작성/조회         |
| `FINANCE`       | 경영/재무팀     | 전체 문서 조회, 리포트    |

### 문서별 권한 매트릭스

| 문서         | 작성      | 수정           | 삭제     | 조회               | 결재     |
| ------------ | --------- | -------------- | -------- | ------------------ | -------- |
| Sales 견적서 | SALES\_\* | 작성자/MANAGER | MANAGER+ | SALES\_\*, FINANCE | -        |
| Sales 품의서 | SALES\_\* | 작성자/MANAGER | MANAGER+ | SALES\_\*, FINANCE | MANAGER+ |
| Sales 발주서 | SALES\_\* | 작성자/MANAGER | MANAGER+ | SALES\_\*, FINANCE | MANAGER+ |
| MA 견적서    | MA\_\*    | 작성자/MANAGER | MANAGER+ | MA\_\*, FINANCE    | -        |
| MA 품의서    | MA\_\*    | 작성자/MANAGER | MANAGER+ | MA\_\*, FINANCE    | MANAGER+ |

---

## 🗄️ 데이터베이스 스키마

### ERD 개요

```
users ──┬── documents ──┬── document_items
        │               ├── document_files
        │               └── approvals
        │
        └── user_roles ── roles
```

### 테이블 정의

#### 1. 사용자 관련

```sql
-- 사용자
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  department VARCHAR(50), -- 'SALES', 'MA', 'FINANCE', 'ADMIN'
  position VARCHAR(50),   -- 직급
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 역할
CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  description VARCHAR(255)
);

-- 사용자-역할 매핑
CREATE TABLE user_roles (
  user_id UUID REFERENCES users(id),
  role_id INTEGER REFERENCES roles(id),
  PRIMARY KEY (user_id, role_id)
);
```

#### 2. 문서 관련

```sql
-- 문서 (공통)
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 문서 식별
  doc_type VARCHAR(20) NOT NULL,        -- 'SALES_QUOTE', 'SALES_APPROVAL', 'SALES_ORDER', 'MA_QUOTE', 'MA_APPROVAL'
  doc_number VARCHAR(50) UNIQUE NOT NULL, -- 'Q-2025-0001', 'A-2025-0001', 'PO-2025-0001'

  -- 상태
  status VARCHAR(20) DEFAULT 'DRAFT',   -- 'DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'COMPLETED'

  -- 기본 정보
  title VARCHAR(255),
  project_name VARCHAR(255),

  -- 매출처 (고객)
  client_company VARCHAR(255),
  client_contact VARCHAR(100),
  client_phone VARCHAR(50),
  client_fax VARCHAR(50),
  client_email VARCHAR(255),

  -- 매입처 (공급사) - 품의서, 발주서용
  vendor_company VARCHAR(255),
  vendor_contact VARCHAR(100),
  vendor_phone VARCHAR(50),
  vendor_email VARCHAR(255),

  -- 금액
  total_amount DECIMAL(15,2) DEFAULT 0,
  vat_amount DECIMAL(15,2) DEFAULT 0,
  total_with_vat DECIMAL(15,2) DEFAULT 0,

  -- 매입 금액 (품의서용)
  purchase_amount DECIMAL(15,2),
  margin_amount DECIMAL(15,2),
  margin_rate DECIMAL(5,2),

  -- 조건
  quote_date DATE,
  delivery_date DATE,
  valid_until DATE,
  payment_terms TEXT,

  -- 기타
  notes TEXT,

  -- 연결 문서
  parent_doc_id UUID REFERENCES documents(id),  -- 품의서 → 견적서, 발주서 → 품의서

  -- 메타
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 문서 품목
CREATE TABLE document_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,

  sort_order INTEGER DEFAULT 0,
  part_number VARCHAR(100),       -- P/N
  description TEXT,               -- 품목 설명
  quantity INTEGER DEFAULT 1,
  srp_price DECIMAL(15,2),        -- 정가
  unit_price DECIMAL(15,2),       -- 단가
  total_price DECIMAL(15,2),      -- 합계

  -- 매입 정보 (품의서용)
  purchase_price DECIMAL(15,2),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 첨부파일
CREATE TABLE document_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,

  file_type VARCHAR(20),          -- 'EXCEL_ORIGINAL', 'EXCEL_GENERATED', 'CLIENT_PO', 'ATTACHMENT'
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL, -- S3 key
  file_size INTEGER,
  mime_type VARCHAR(100),

  uploaded_by UUID REFERENCES users(id),
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 결재
CREATE TABLE approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,

  step INTEGER NOT NULL,           -- 결재 순서
  approver_id UUID REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'REJECTED'
  comment TEXT,

  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 3. 마이그레이션/업로드 관련

```sql
-- 기존 엑셀 파일 일괄 업로드 이력
CREATE TABLE excel_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  file_name VARCHAR(255),
  file_path VARCHAR(500),
  doc_type VARCHAR(20),

  status VARCHAR(20) DEFAULT 'PENDING', -- 'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'
  total_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  error_log JSONB,

  imported_by UUID REFERENCES users(id),
  imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 인덱스

```sql
CREATE INDEX idx_documents_doc_type ON documents(doc_type);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_created_by ON documents(created_by);
CREATE INDEX idx_documents_client_company ON documents(client_company);
CREATE INDEX idx_documents_created_at ON documents(created_at DESC);
CREATE INDEX idx_document_items_document_id ON document_items(document_id);
CREATE INDEX idx_approvals_document_id ON approvals(document_id);
CREATE INDEX idx_approvals_approver_id ON approvals(approver_id);
```

---

## 📁 프로젝트 구조

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── layout.tsx
│   │
│   ├── (dashboard)/
│   │   ├── layout.tsx                    # 사이드바 + 헤더
│   │   ├── page.tsx                      # 대시보드
│   │   │
│   │   ├── sales/
│   │   │   ├── quotes/
│   │   │   │   ├── page.tsx              # 견적서 목록
│   │   │   │   ├── new/page.tsx          # 견적서 작성
│   │   │   │   └── [id]/page.tsx         # 견적서 상세/수정
│   │   │   ├── approvals/
│   │   │   │   ├── page.tsx              # 품의서 목록
│   │   │   │   ├── new/page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   └── orders/
│   │   │       ├── page.tsx              # 발주서 목록
│   │   │       ├── new/page.tsx
│   │   │       └── [id]/page.tsx
│   │   │
│   │   ├── ma/
│   │   │   ├── quotes/...
│   │   │   └── approvals/...
│   │   │
│   │   ├── admin/
│   │   │   ├── users/page.tsx            # 사용자 관리
│   │   │   └── import/page.tsx           # 엑셀 일괄 업로드
│   │   │
│   │   └── settings/
│   │       └── page.tsx
│   │
│   └── api/
│       ├── auth/
│       │   ├── login/route.ts
│       │   ├── logout/route.ts
│       │   └── me/route.ts
│       │
│       ├── documents/
│       │   ├── route.ts                  # GET (목록), POST (생성)
│       │   ├── [id]/route.ts             # GET, PUT, DELETE
│       │   ├── [id]/items/route.ts       # 품목 관리
│       │   ├── [id]/files/route.ts       # 파일 업로드
│       │   ├── [id]/approve/route.ts     # 결재 처리
│       │   └── [id]/excel/route.ts       # 엑셀 다운로드/업로드
│       │
│       ├── upload/
│       │   ├── route.ts                  # S3 업로드
│       │   └── presigned/route.ts        # Presigned URL
│       │
│       └── import/
│           ├── route.ts                  # 일괄 업로드 시작
│           └── [id]/status/route.ts      # 업로드 상태 조회
│
├── components/
│   ├── ui/                               # 공통 UI (Button, Input, Modal 등)
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   └── Breadcrumb.tsx
│   │
│   ├── documents/
│   │   ├── DocumentList.tsx              # 문서 목록 테이블
│   │   ├── DocumentForm.tsx              # 문서 작성 폼 (공통)
│   │   ├── DocumentViewer.tsx            # 문서 상세 보기
│   │   ├── ItemsTable.tsx                # 품목 테이블 (추가/삭제/수정)
│   │   ├── ApprovalFlow.tsx              # 결재 라인
│   │   └── ExcelPreview.tsx              # 원본 양식 프리뷰
│   │
│   └── excel/
│       ├── ExcelModeToggle.tsx           # 웹모드/양식모드 토글
│       └── ExcelUploader.tsx             # 엑셀 업로드 컴포넌트
│
├── lib/
│   ├── db/
│   │   ├── prisma.ts                     # Prisma 클라이언트
│   │   └── queries/                      # DB 쿼리 함수
│   │
│   ├── excel/
│   │   ├── parser.ts                     # 엑셀 → JSON 파싱
│   │   ├── generator.ts                  # JSON → 엑셀 생성
│   │   └── templates/                    # 엑셀 템플릿 관리
│   │
│   ├── s3/
│   │   └── client.ts                     # S3 클라이언트
│   │
│   ├── auth/
│   │   ├── session.ts                    # 세션 관리
│   │   └── permissions.ts                # 권한 체크 유틸
│   │
│   └── utils/
│       ├── doc-number.ts                 # 문서번호 생성
│       └── formatters.ts                 # 금액 포맷 등
│
├── hooks/
│   ├── useDocument.ts                    # 문서 CRUD 훅
│   ├── useExcel.ts                       # 엑셀 처리 훅
│   └── useAuth.ts                        # 인증 훅
│
├── types/
│   └── index.ts                          # 타입 정의
│
└── templates/                            # 엑셀 템플릿 파일 (.xlsx)
    ├── sales-quote.xlsx
    ├── sales-approval.xlsx
    ├── sales-order.xlsx
    ├── ma-quote.xlsx
    └── ma-approval.xlsx
```

---

## 🔌 API 명세

### 인증

| Method | Endpoint           | 설명             |
| ------ | ------------------ | ---------------- |
| POST   | `/api/auth/login`  | 로그인           |
| POST   | `/api/auth/logout` | 로그아웃         |
| GET    | `/api/auth/me`     | 현재 사용자 정보 |

### 문서

| Method | Endpoint                                 | 설명                         |
| ------ | ---------------------------------------- | ---------------------------- |
| GET    | `/api/documents?type=SALES_QUOTE&page=1` | 문서 목록                    |
| POST   | `/api/documents`                         | 문서 생성                    |
| GET    | `/api/documents/:id`                     | 문서 상세                    |
| PUT    | `/api/documents/:id`                     | 문서 수정                    |
| DELETE | `/api/documents/:id`                     | 문서 삭제                    |
| POST   | `/api/documents/:id/approve`             | 결재 처리                    |
| GET    | `/api/documents/:id/excel`               | 엑셀 다운로드                |
| POST   | `/api/documents/:id/excel`               | 엑셀 업로드 (기존 문서 갱신) |

### 파일

| Method | Endpoint                             | 설명             |
| ------ | ------------------------------------ | ---------------- |
| POST   | `/api/upload`                        | 파일 업로드      |
| GET    | `/api/upload/presigned?filename=xxx` | S3 Presigned URL |

### 마이그레이션

| Method | Endpoint                 | 설명             |
| ------ | ------------------------ | ---------------- |
| POST   | `/api/import`            | 일괄 업로드 시작 |
| GET    | `/api/import/:id/status` | 업로드 진행 상태 |

---

## 📊 엑셀 호환 전략

### 1. 템플릿 기반 생성

```typescript
// lib/excel/generator.ts
import ExcelJS from "exceljs";

export async function generateQuoteExcel(document: Document): Promise<Buffer> {
  // 1. 템플릿 로드 (로고, 직인, 스타일 보존)
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile("templates/sales-quote.xlsx");
  const sheet = workbook.getWorksheet("견적서");

  // 2. 고정 필드 채우기
  sheet.getCell("C6").value = `${document.clientCompany} 귀중`;
  sheet.getCell("C7").value = document.clientContact;
  sheet.getCell("C14").value = document.quoteDate;

  // 3. 품목 동적 삽입
  const startRow = 23;
  document.items.forEach((item, index) => {
    const row = startRow + index;
    if (index > 0) {
      sheet.insertRow(row, [], "i+"); // 스타일 복사하며 삽입
    }
    sheet.getCell(`B${row}`).value = item.partNumber;
    sheet.getCell(`C${row}`).value = item.description;
    sheet.getCell(`D${row}`).value = item.quantity;
    sheet.getCell(`G${row}`).value = item.totalPrice;
  });

  // 4. 합계 수식 업데이트
  const lastRow = startRow + document.items.length - 1;
  sheet.getCell("E28").value = { formula: `SUM(G${startRow}:G${lastRow})` };

  return await workbook.xlsx.writeBuffer();
}
```

### 2. 엑셀 파싱

```typescript
// lib/excel/parser.ts
export async function parseQuoteExcel(buffer: Buffer): Promise<ParsedDocument> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.getWorksheet("견적서");

  return {
    clientCompany: sheet.getCell("C6").value?.toString().replace(" 귀중", ""),
    clientContact: sheet.getCell("C7").value,
    quoteDate: sheet.getCell("C14").value,
    items: parseItemsTable(sheet, 23), // 23행부터 품목 파싱
    // ...
  };
}
```

### 3. 기존 파일 일괄 업로드

```typescript
// app/api/import/route.ts
export async function POST(req: Request) {
  const { files, docType } = await req.json();

  const importJob = await db.excelImports.create({
    docType,
    status: "PROCESSING",
    totalCount: files.length,
  });

  // 백그라운드 처리 (큐 사용 권장)
  processImportQueue(importJob.id, files);

  return Response.json({ jobId: importJob.id });
}
```

---

## 👨‍💻 작업 분배

### Phase 1: 기반 구축 (1주)

| 담당       | 작업                                                                                  |
| ---------- | ------------------------------------------------------------------------------------- |
| **백엔드** | DB 스키마 설계 및 마이그레이션, Prisma 설정, 인증 시스템 (NextAuth.js), 기본 API 구조 |
| **프론트** | 프로젝트 셋업, 공통 UI 컴포넌트, 레이아웃 (사이드바/헤더), 라우팅 구조                |

### Phase 2: 핵심 기능 (2주)

| 담당       | 작업                                                                       |
| ---------- | -------------------------------------------------------------------------- |
| **백엔드** | 문서 CRUD API, 엑셀 생성/파싱 모듈, S3 연동, 파일 업로드                   |
| **프론트** | 문서 목록 페이지, 문서 작성 폼, 품목 테이블 컴포넌트, 웹모드/양식모드 토글 |

### Phase 3: 결재 & 권한 (1주)

| 담당       | 작업                                                    |
| ---------- | ------------------------------------------------------- |
| **백엔드** | 결재 API, 권한 미들웨어, 알림 (이메일/슬랙 등)          |
| **프론트** | 결재 플로우 UI, 권한별 메뉴/버튼 처리, 사용자 관리 화면 |

### Phase 4: 마이그레이션 & 고도화 (1주)

| 담당       | 작업                                          |
| ---------- | --------------------------------------------- |
| **백엔드** | 일괄 업로드 API, 백그라운드 처리, 에러 핸들링 |
| **프론트** | 일괄 업로드 UI, 진행상황 표시, 대시보드 통계  |

---

## 📦 기술 스택 상세

### 필수 패키지

```json
{
  "dependencies": {
    "next": "^14.x",
    "react": "^18.x",
    "@prisma/client": "^5.x",
    "next-auth": "^4.x",
    "@aws-sdk/client-s3": "^3.x",
    "exceljs": "^4.x",
    "@tanstack/react-query": "^5.x",
    "zod": "^3.x",
    "tailwindcss": "^3.x"
  },
  "devDependencies": {
    "prisma": "^5.x",
    "typescript": "^5.x"
  }
}
```

### 환경 변수

```env
# Database
DATABASE_URL="postgresql://user:pass@host:5432/erp"

# Auth
NEXTAUTH_SECRET="xxx"
NEXTAUTH_URL="http://localhost:3000"

# AWS S3
AWS_REGION="ap-northeast-2"
AWS_ACCESS_KEY_ID="xxx"
AWS_SECRET_ACCESS_KEY="xxx"
S3_BUCKET_NAME="erp-documents"
```

---

## ✅ 체크리스트

### MVP 필수

- [ ] 로그인/로그아웃
- [ ] 역할별 권한 체크
- [ ] Sales 견적서 CRUD
- [ ] Sales 품의서 CRUD + 결재
- [ ] Sales 발주서 CRUD + 결재
- [ ] 엑셀 다운로드 (템플릿 기반)
- [ ] 엑셀 업로드 → 웹 표시
- [ ] 기존 엑셀 일괄 업로드

### 추후 확장

- [ ] MA 견적서/품의서
- [ ] 대시보드 통계
- [ ] 알림 시스템
- [ ] 감사 로그
- [ ] 검색/필터 고도화

---

## 📎 참고자료

- 화면 기획: `erp-complete_3.html`
- 엑셀 템플릿: `fwd_erp/` 폴더 내 파일들
- 견적서 구조 분석: 별도 문서 참고

---

_작성일: 2025-01-06_
