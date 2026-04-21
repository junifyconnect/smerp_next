---
feature: MA 견적서
domain: MA
nature: ui_center
status: 완료
progress: 100
last_reviewed: 2026-04-20
_files:
  - "app/(main)/ma/quotes/**"
  - "app/api/ma-quotes/**"
  - "components/documents/MADocumentForm.tsx"
---

# MA 견적서 🟢

유지보수(Maintenance Agreement) 계약용 견적서를 작성하고 관리한다. MA 전용 품목 구조(기기명/M-T/모델/S-N/서비스레벨/기간/시작일/종료일)를 사용한다.

**진행률** ████████████████████ 100%

## 사용자 플로우

1. MA 견적서 목록에서 신규 작성 또는 엑셀 업로드
2. 고객사 정보 입력 (회사명/담당자)
3. MA 전용 품목 추가 (기기명, 모델, 시리얼넘버, 서비스레벨, 계약 시작일/종료일)
4. 유효기간/결제조건/서비스조건/특이사항 입력
5. 저장 후 고객에게 전달

## 완료

- ✅ MA 견적서 CRUD (목록/상세/생성/수정)
- ✅ 검색, 상태 필터
- ✅ 엑셀 업로드 파싱
- ✅ MA 전용 품목 구조 (MAQuoteItem: productName/modelType/model/serialNumber/serviceLevel/period/startDate/endDate)

## 남은 것

없음.

## 관련 화면

- `/ma/quotes` (MA 견적서 목록)
- `/ma/quotes/new` (신규 작성)
- `/ma/quotes/[id]` (상세 조회)
- `/ma/quotes/[id]/edit` (수정)

---

<details>
<summary>🔧 기술 정보 (개발자용)</summary>

**Entry points**
- `app/(main)/ma/quotes/page.tsx` — MA 견적서 목록
- `app/api/ma-quotes/route.ts` — CRUD API
- `app/api/ma-quotes/upload/route.ts` — 엑셀 업로드 파싱

**주요 라이브러리**: exceljs

**의존성 서비스**: PostgreSQL (Prisma — MAQuote/MAQuoteItem)

</details>
