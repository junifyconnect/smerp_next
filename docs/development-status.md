# SMERP 개발 현황 정리

> 최종 업데이트: 2026-01-27

---

## ✅ 완료된 작업

### 1. 세일즈 문서 버전 관리 시스템

| 문서 | 버전 필드 | DRAFT 본인만 보기 | 기안/발송 API |
|------|----------|-----------------|--------------|
| SalesApproval (품의서) | ✅ version, originalId, isLatest | ✅ | ✅ /submit |
| SalesQuote (견적서) | ✅ | ✅ | ✅ /submit |
| SalesOrder (발주서) | ✅ | ✅ | ✅ /submit |

**구현 내용:**
- 스키마에 `version`, `originalId`, `isLatest` 필드 추가
- 목록 API에서 DRAFT 상태는 본인 작성 문서만 조회
- `/submit` API로 DRAFT → PENDING/SENT 상태 전환
- `/revise` API로 새 버전 생성 (이전 버전 isLatest=false)

### 2. 계산서 버전 관리 스키마

`SalesInvoiceStatus`, `PurchaseInvoiceStatus` 모델에 추가:
- `status`: ACTIVE (기본값) / SUPERSEDED (대체됨)
- `supersededByApprovalId`: 대체한 새 버전 품의서 ID

---

## ⏸️ 보류/결정 필요 사항

### 1. 품의서 수정 시 계산서 처리 방식

**상황:**
```
품의서 v1 승인 → 계산서 A, B 생성
품의서 v2 수정 (품목 C 추가)
품의서 v2 승인 → 기존 계산서 A, B는 어떻게?
```

**옵션:**

| 옵션 | 설명 | 장점 | 단점 |
|------|------|------|------|
| **A. 품목별 매칭** | partNumber/itemName으로 비교, 변경된 것만 SUPERSEDED | 정확함 | 구현 복잡, 매칭 기준 모호할 수 있음 |
| **B. 발행 여부 기준** | invoiceDate 있으면 유지, 없으면 SUPERSEDED | 단순함 | 발행 전 수정 시 중복 가능 |
| **C. 수정 버전은 자동생성 X** | 첫 승인만 자동생성, 이후는 경영팀 수동 | 안전함 | 수작업 필요 |
| **D. 알림만** | 자동 처리 안 함, "품의서 수정됨" 표시만 | 유연함 | 경영팀 수동 판단 필요 |

**현재 구현:** 전체 SUPERSEDED 처리 → **변경 필요**

**고려 케이스:**
| 케이스 | v1 | v2 | 원하는 처리 |
|--------|----|----|------------|
| 품목 추가 | A, B | A, B, C | A, B 유지 / C 신규 |
| 품목 삭제 | A, B, C | A, B | A, B 유지 / C는? |
| 수량 변경 | A(100개) | A(150개) | ? |
| 금액 변경 | A(1000원) | A(1200원) | ? |
| 계산서 이미 발행 | A(발행완료) | A(수정) | 변경 불가? |

---

## 📝 미완료 작업

### 1. MA(경영) 문서 버전 관리
- [ ] MAApproval 버전 관리 (version, originalId, isLatest)
- [ ] MAApproval DRAFT 본인만 보기
- [ ] MAApproval 기안 API (/submit)

### 2. 계산서 관련
- [ ] `sales-invoice-status` API에 `includeSuperseded` 필터 추가
- [ ] 계산서 목록 UI에 SUPERSEDED 표시/필터 추가
- [ ] 품의서 수정 시 계산서 처리 로직 확정 및 구현

### 3. 프론트엔드
- [ ] 품의서 상세에서 "이전 버전의 계산서가 있습니다" 안내
- [ ] 계산서 목록에서 대체된 계산서 보기 토글

### 4. 테스트
- [ ] 계산서 발행 현황 페이지 테스트
- [ ] 버전 관리 플로우 E2E 테스트

---

## 🔗 관련 파일

### 스키마
```
prisma/schema.prisma
```

### 품의서 (SalesApproval)
```
app/api/sales-approvals/route.ts              # 목록 (DRAFT 필터링)
app/api/sales-approvals/[id]/submit/route.ts  # 기안 (DRAFT → PENDING)
app/api/sales-approvals/[id]/sign/route.ts    # 서명 + 계산서 생성
app/api/sales-approvals/[id]/revise/route.ts  # 새 버전 생성
app/api/sales-approvals/[id]/versions/route.ts # 버전 목록
app/(main)/sales/approvals/[id]/page.tsx      # 상세 페이지
```

### 견적서 (SalesQuote)
```
app/api/sales-quotes/route.ts
app/api/sales-quotes/[id]/submit/route.ts
app/api/sales-quotes/[id]/revise/route.ts
app/api/sales-quotes/[id]/versions/route.ts
app/(main)/sales/quotes/[id]/page.tsx
```

### 발주서 (SalesOrder)
```
app/api/sales-orders/route.ts
app/api/sales-orders/[id]/submit/route.ts
app/api/sales-orders/[id]/revise/route.ts
app/api/sales-orders/[id]/versions/route.ts
app/(main)/sales/orders/[id]/page.tsx
```

### 계산서 발행현황
```
app/api/management/sales-invoice-status/route.ts
app/api/management/purchase-invoice-status/route.ts
```

---

## 📌 참고: 상태 흐름

### 품의서 (SalesApproval)
```
DRAFT (작성중, 본인만)
  → [기안] → PENDING (기안됨)
  → [영업담당 서명] → PENDING_TEAM_LEAD
  → [팀장 서명] → PENDING_CEO
  → [대표 서명] → APPROVED (승인완료) → 계산서 자동 생성
```

### 견적서 (SalesQuote)
```
DRAFT (작성중, 본인만)
  → [발송] → SENT (발송됨)
```

### 발주서 (SalesOrder)
```
DRAFT (작성중, 본인만)
  → [발송] → SENT (발송됨)
```
