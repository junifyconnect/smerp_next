# 계산서 발행현황 기획서

> 마지막 업데이트: 2026-02-23

## 개요

품의서(Sales + MA) 승인 시 자동생성되는 매출/매입 계산서를 통합 추적하는 화면.

---

## 데이터 구조

### 품의서 → 계산서 관계

```
품의서 1건
  └─ Product (제품) → 매출 계산서 1건
       └─ Item (품목) → 매입 계산서 1건씩 (N건)
```

**예시: D251231-01 (영상편집용 조립PC)**
| 유형 | 대상 | 금액 |
|------|------|------|
| 매출 | 영상편집용 조립PC | 4,500,000 |
| 매입 | CPU (다나와) | 900,000 |
| 매입 | BOARD (컴퓨존) | 327,000 |
| 매입 | RAM (조이젠) | 1,500,000 |
| ... | ... | ... |

= 매출 1건 + 매입 10건 = **총 11 InvoiceRecord**

### InvoiceRecord 변경사항 (기존 대비)

**현재 (잘못됨):**
- 매입 계산서: vendorName 합산 → 1 InvoiceRecord

**변경:**
- 매입 계산서: **Item 1개 = InvoiceRecord 1개**
- `itemId`로 원본 품목 연결

---

## 계산서 상태값

| 상태 | 설명 |
|------|------|
| PENDING | 미발행 (기본값) |
| ISSUED | 발행 완료 |
| NEEDS_AMENDMENT | 수정 필요 (revise로 변경 감지 시 자동 전환) |
| NOT_REQUIRED | 발행 불필요 (엑셀의 X) |
| CANCELLED | 취소됨 |

### 상태 전이

```
PENDING → ISSUED          (경영팀 수동: 계산서 발행)
PENDING → NOT_REQUIRED    (경영팀 수동: 발행 불필요 처리)
ISSUED → NEEDS_AMENDMENT  (자동: revise로 품목 변경 감지)
NEEDS_AMENDMENT → ISSUED  (경영팀 수동: 수정 세금계산서 발행)
ANY → CANCELLED           (품의서 회수 또는 수동 취소)
```

---

## 자동생성 타이밍

### 품의서 승인 (CEO sign) 시
1. Product별 매출 InvoiceRecord 생성 (PENDING)
2. Item별 매입 InvoiceRecord 생성 (PENDING)
   - vendorName 없는 Item은 스킵
   - purchaseTotal이 0이면 스킵

### 품의서 회수 (withdraw) 시
- 해당 품의서의 InvoiceRecord 전부 삭제
  - 단, ISSUED 상태인 건은 삭제 불가 → 에러 반환

### 품의서 수정발행 (revise) 시
- 기존 버전(v1) InvoiceRecord: 유지 (isLatest=false와 연결)
- 새 버전(v2) 승인 시: 새 InvoiceRecord 생성
- `amendedFromId`로 이전 버전 계산서 연결
- 변경 분석: sourceProductId/sourceItemId 기준
  - 신규: 이전 버전에 없는 품목
  - 수정: 금액/수량 변경
  - 삭제: 새 버전에 없는 품목
  - 유지: 변경 없음

---

## 발행현황 화면 (통합 뷰)

### 컬럼 구조

| 컬럼 | 설명 | 출처 |
|------|------|------|
| 품의코드 | D251231-01 | approval.approvalCode |
| P/N | CPU, BOARD 등 | item.partNumber |
| 품목 | 상세 스펙 | item.description 또는 product.name |
| 매출처 | 고객사 | approval.clientCompany |
| 수량 | 매출 수량 | product.quantity / item.quantity |
| 단가 | 매출 단가 | product.unitPrice |
| 합계 | 매출 합계 | product.totalPrice |
| 건별합계 | 같은 품의 매출 합산 | SUM by approvalCode |
| **매출계산서** | 발행일 | invoiceRecord.invoiceDate (SALES) |
| 기타사항 | 메모 | invoiceRecord.remarks |
| 매입일 | 매입 날짜 | item.purchaseDate |
| 매입처 | 매입처명 | item.vendorName |
| 매입 수량 | | item.purchaseQty |
| 매입 단가 | | item.purchasePrice |
| 매입 합계 | | item.purchaseTotal |
| 건별합계 (매입) | 같은 품의 매입 합산 | SUM by approvalCode |
| 거래명세서 | | invoiceRecord.invoiceNumber |
| **매입계산서** | 발행일 | invoiceRecord.invoiceDate (PURCHASE) |

### 필터
- 기간 (월별 시트 — 엑셀의 "25.12" 탭)
- 품의코드
- 매출처
- 매입처
- 계산서 상태 (미발행/발행/불필요)
- 문서 유형 (Sales/MA)

### 편집 가능 필드 (경영팀)
- 매출계산서 발행일
- 매입계산서 발행일
- 기타사항 (remarks)
- 상태 변경 (PENDING → ISSUED / NOT_REQUIRED)

---

## Sales vs MA 통합

- 같은 InvoiceRecord 테이블 사용
- MA 품의서에서 생성된 건은 상태가 MA이거나 별도 `docType` 필드로 구분
- 발행현황에서 한 화면에 모두 표시 (필터로 구분)

---

## 기존 코드 수정 필요

1. **sign API**: 매입 계산서를 vendorName 합산 → Item 단위로 변경
2. **InvoiceRecord 스키마**: `status`에 NOT_REQUIRED 추가
3. **withdraw API**: ISSUED 상태 체크 추가
4. **revise API**: 계산서 변경 분석 로직 추가
5. **management/invoice-status**: 프론트 화면 리뉴얼
