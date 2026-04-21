'use client'

export default function SystemArchitecturePage() {
  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">SMERP 시스템 구조도</h1>
        <p className="text-sm text-gray-500 mt-1">문서 처리 흐름 및 데이터 연동 관계</p>
      </div>

      {/* 전체 흐름도 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">문서 처리 흐름</h2>

        {/* Deal */}
        <div className="flex justify-center mb-8">
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-8 py-4 rounded-xl shadow-lg">
            <div className="text-center">
              <div className="text-lg font-bold">Deal (거래)</div>
              <div className="text-xs opacity-80 mt-1">하나의 거래 건에 모든 문서가 연결됨</div>
              <div className="text-xs mt-2 bg-white/20 rounded px-2 py-1">
                QUOTING → NEGOTIATING → WON/LOST
              </div>
            </div>
          </div>
        </div>

        {/* 화살표 */}
        <div className="flex justify-center mb-4">
          <div className="w-px h-8 bg-gray-300"></div>
        </div>

        {/* 3개 부서 */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          {/* 영업 */}
          <div className="border-2 border-blue-300 rounded-xl p-4 bg-blue-50">
            <div className="text-center mb-4">
              <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-medium">영업 (Sales)</span>
            </div>

            {/* 견적서 */}
            <div className="bg-white rounded-lg p-3 mb-3 border border-blue-200">
              <div className="font-medium text-blue-900">📋 견적서</div>
              <div className="text-xs text-gray-500 mt-1">SalesQuote</div>
              <div className="text-xs text-gray-600 mt-2">
                • 고객에게 제시할 가격<br/>
                • 품목별 단가/수량
              </div>
              <div className="mt-2 text-xs bg-blue-100 rounded px-2 py-1">
                DRAFT → SENT → ACCEPTED
              </div>
            </div>

            {/* 화살표 */}
            <div className="flex justify-center my-2">
              <div className="text-blue-400">▼</div>
            </div>

            {/* 품의서 */}
            <div className="bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg p-3 mb-3 border-2 border-blue-400 shadow">
              <div className="font-bold text-blue-900">⭐ 품의서</div>
              <div className="text-xs text-gray-500">SalesApproval (핵심)</div>
              <div className="text-xs text-gray-600 mt-2">
                • 매출 품목 + 매입 품목<br/>
                • 3단계 결재<br/>
                • 마진 자동 계산
              </div>
              <div className="mt-2 text-xs bg-blue-200 rounded px-2 py-1">
                DRAFT → PENDING → APPROVED
              </div>
            </div>

            {/* 화살표 분기 */}
            <div className="flex justify-center gap-8 my-2">
              <div className="text-blue-400">↙</div>
              <div className="text-blue-400">↘</div>
            </div>

            {/* 발주서 */}
            <div className="bg-white rounded-lg p-2 border border-blue-200 mb-2">
              <div className="font-medium text-blue-900 text-sm">📦 발주서</div>
              <div className="text-xs text-gray-500">SalesOrder</div>
            </div>
          </div>

          {/* MA */}
          <div className="border-2 border-green-300 rounded-xl p-4 bg-green-50">
            <div className="text-center mb-4">
              <span className="bg-green-600 text-white px-3 py-1 rounded-full text-sm font-medium">MA (유지보수)</span>
            </div>

            <div className="bg-white rounded-lg p-3 mb-3 border border-green-200">
              <div className="font-medium text-green-900">📋 MA 견적서</div>
              <div className="text-xs text-gray-500">MAQuote</div>
              <div className="text-xs text-gray-600 mt-2">
                • MA 서비스 견적<br/>
                • 기기별 유지보수 기간
              </div>
            </div>

            <div className="flex justify-center my-2">
              <div className="text-green-400">▼</div>
            </div>

            <div className="bg-white rounded-lg p-3 border border-green-200">
              <div className="font-medium text-green-900">📝 MA 품의서</div>
              <div className="text-xs text-gray-500">MAApproval</div>
              <div className="text-xs text-gray-600 mt-2">
                • MA 계약 품의
              </div>
            </div>
          </div>

          {/* 경영 (계산서 → 대장) */}
          <div className="border-2 border-purple-300 rounded-xl p-4 bg-purple-50">
            <div className="text-center mb-4">
              <span className="bg-purple-600 text-white px-3 py-1 rounded-full text-sm font-medium">경영 (Management)</span>
            </div>

            {/* 품의서 승인 → 계산서 발행현황 연결 */}
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded border border-green-300 font-medium">품의서 APPROVED</span>
              <span className="text-purple-400">▼</span>
            </div>

            {/* 계산서 발행현황 */}
            <div className="bg-purple-100 border-2 border-purple-400 rounded-lg p-3 mb-3">
              <div className="font-medium text-purple-900">🧾 계산서 발행현황</div>
              <div className="text-xs text-gray-500">InvoiceStatus</div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <div className="bg-blue-50 rounded p-1.5 text-center">
                  <div className="text-blue-700 font-medium">매출 계산서</div>
                </div>
                <div className="bg-orange-50 rounded p-1.5 text-center">
                  <div className="text-orange-700 font-medium">매입 계산서</div>
                </div>
              </div>
            </div>

            {/* 화살표 분기 */}
            <div className="flex justify-center gap-8 my-2">
              <div className="text-purple-400">↙</div>
              <div className="text-purple-400">↘</div>
            </div>

            {/* 대장 */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-emerald-50 border border-emerald-300 rounded-lg p-2">
                <div className="font-medium text-emerald-900 text-sm">📊 매출대장</div>
                <div className="text-xs text-gray-500">SalesLedger</div>
                <div className="text-xs text-emerald-600 mt-1">발행 시 자동생성</div>
              </div>
              <div className="bg-orange-50 border border-orange-300 rounded-lg p-2">
                <div className="font-medium text-orange-900 text-sm">📊 매입대장</div>
                <div className="text-xs text-gray-500">PurchaseLedger</div>
                <div className="text-xs text-orange-600 mt-1">수신 시 자동생성</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 품의서 상세 구조 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">품의서 (SalesApproval) 상세 구조</h2>
        <p className="text-sm text-gray-500 mb-6">시스템의 핵심 문서 - 대부분의 관리 기능이 품의서를 참조</p>

        <div className="grid grid-cols-2 gap-6">
          {/* 좌측: 기본 구조 */}
          <div className="space-y-4">
            {/* 기본 정보 */}
            <div className="bg-gray-50 rounded-lg p-4 border">
              <div className="font-medium text-gray-900 mb-2">📌 기본 정보</div>
              <div className="text-sm space-y-1 text-gray-600">
                <div><code className="bg-gray-200 px-1 rounded">approvalNumber</code> SA-2025-0001 (자동생성)</div>
                <div><code className="bg-gray-200 px-1 rounded">approvalCode</code> D251202-01 (수동입력)</div>
                <div><code className="bg-gray-200 px-1 rounded">dealId</code> Deal과 연결 (버전 관리)</div>
              </div>
            </div>

            {/* 금액 */}
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="font-medium text-blue-900 mb-2">💰 금액</div>
              <div className="text-sm space-y-1 text-gray-600">
                <div className="flex justify-between">
                  <span>매출 합계</span>
                  <code className="bg-blue-100 px-1 rounded">totalAmount</code>
                </div>
                <div className="flex justify-between">
                  <span>매입 합계</span>
                  <code className="bg-purple-100 px-1 rounded">purchaseTotal</code>
                </div>
                <div className="flex justify-between font-medium text-emerald-700">
                  <span>마진</span>
                  <span>= 매출 - 매입</span>
                </div>
              </div>
            </div>

            {/* 결재 */}
            <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
              <div className="font-medium text-amber-900 mb-2">✍️ 3단계 결재</div>
              <div className="text-sm space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 bg-amber-200 rounded-full flex items-center justify-center text-xs">1</span>
                  <span>영업담당</span>
                  <code className="bg-amber-100 px-1 rounded text-xs">salesManager</code>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 bg-amber-300 rounded-full flex items-center justify-center text-xs">2</span>
                  <span>영업팀장</span>
                  <code className="bg-amber-100 px-1 rounded text-xs">teamLeader</code>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 bg-amber-400 rounded-full flex items-center justify-center text-xs">3</span>
                  <span>대표이사</span>
                  <code className="bg-amber-100 px-1 rounded text-xs">ceo</code>
                </div>
              </div>
            </div>
          </div>

          {/* 우측: 품목 구조 */}
          <div className="space-y-4">
            {/* 매출 품목 */}
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-300">
              <div className="font-medium text-blue-900 mb-2">📦 매출 품목 (items)</div>
              <div className="bg-white rounded p-3 text-sm">
                <div className="font-medium">SalesApprovalItem</div>
                <div className="text-gray-600 mt-1 space-y-1">
                  <div>• productName (품목명)</div>
                  <div>• quantity, unitPrice, totalPrice</div>
                </div>
                <div className="mt-2 pl-4 border-l-2 border-blue-200">
                  <div className="text-xs text-gray-500">details[] (하위 품목)</div>
                  <div className="text-xs text-gray-600">
                    • partNumber (P/N, 시리얼)<br/>
                    • description<br/>
                    • quantity
                  </div>
                </div>
              </div>
            </div>

            {/* 매입 품목 */}
            <div className="bg-purple-50 rounded-lg p-4 border border-purple-300">
              <div className="font-medium text-purple-900 mb-2">📦 매입 품목 (purchaseItems)</div>
              <div className="bg-white rounded p-3 text-sm">
                <div className="font-medium">SalesApprovalPurchaseItem</div>
                <div className="text-gray-600 mt-1 space-y-1">
                  <div>• productName (품목명)</div>
                  <div>• quantity, unitPrice, totalPrice</div>
                  <div className="text-purple-600">• vendorCompany (매입처)</div>
                </div>
                <div className="mt-2 pl-4 border-l-2 border-purple-200">
                  <div className="text-xs text-gray-500">details[] (하위 품목)</div>
                  <div className="text-xs text-gray-600">
                    • partNumber, description, quantity
                  </div>
                </div>
              </div>
            </div>

            {/* UI 참고 */}
            <div className="bg-gray-100 rounded-lg p-3 text-sm">
              <div className="text-gray-600">
                💡 <strong>UI에서는 매출/매입이 1:1로 연결</strong><br/>
                각 매출 품목 카드에 매입처, 매입단가 입력란 포함
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 데이터 연동 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">데이터 연동 관계</h2>

        <div className="grid grid-cols-3 gap-6">
          {/* 견적서 → 품의서 */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="font-medium text-blue-900 mb-3">1. 견적서 → 품의서</div>
            <div className="text-sm space-y-2">
              <div className="bg-white rounded p-2 border">견적서 생성</div>
              <div className="text-center text-blue-400">▼ "품의서로 전환"</div>
              <div className="bg-blue-100 rounded p-2 border border-blue-300">
                품의서 신규 생성<br/>
                <span className="text-xs text-gray-500">
                  • 고객정보 복사<br/>
                  • 품목 복사 (구조 변환)<br/>
                  • dealId 연결
                </span>
              </div>
            </div>
          </div>

          {/* 품의서 → 계산서/대장 */}
          <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
            <div className="font-medium text-purple-900 mb-3">2. 품의서 → 계산서 → 대장</div>
            <div className="text-sm space-y-2">
              <div className="bg-purple-100 rounded p-2 border border-purple-300">
                품의서 승인완료<br/>
                <span className="text-xs">(APPROVED)</span>
              </div>
              <div className="text-center text-purple-400">▼</div>
              <div className="bg-white rounded p-2 border">
                계산서 발행 현황<br/>
                <span className="text-xs text-gray-500">
                  • 매출 계산서 (발행일)<br/>
                  • 매입 계산서 (수신일)
                </span>
              </div>
              <div className="flex justify-center gap-4 text-purple-400">
                <span>↙</span>
                <span>↘</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-emerald-100 rounded p-2 border border-emerald-300 text-xs text-center">
                  매출대장<br/>
                  <span className="text-emerald-600">발행 시 자동생성</span>
                </div>
                <div className="bg-orange-100 rounded p-2 border border-orange-300 text-xs text-center">
                  매입대장<br/>
                  <span className="text-orange-600">수신 시 자동생성</span>
                </div>
              </div>
            </div>
          </div>

          {/* 버전 관리 */}
          <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
            <div className="font-medium text-amber-900 mb-3">3. 품의서 버전 관리</div>
            <div className="text-sm">
              <div className="bg-white rounded p-2 border mb-2">
                <div className="font-medium">Deal &quot;ABC회사 서버 구축&quot;</div>
              </div>
              <div className="space-y-1 pl-4">
                <div className="flex items-center gap-2">
                  <span className="text-red-500">✗</span>
                  <span className="text-gray-500">v1 SA-2025-0001 (반려)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>v2 SA-2025-0002 (승인)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-blue-500">●</span>
                  <span className="text-blue-600">v3 SA-2025-0003 (작성중)</span>
                </div>
              </div>
              <div className="mt-3 text-xs text-gray-500 bg-amber-100 rounded p-2">
                <code>/api/.../versions</code> - 버전 목록<br/>
                <code>/api/.../revise</code> - 새 버전 생성
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* API 구조 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">API 엔드포인트</h2>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium text-gray-700 mb-2">영업 문서</h3>
            <div className="bg-gray-50 rounded-lg p-3 font-mono text-sm space-y-1">
              <div>/api/sales-quotes/ <span className="text-gray-400">견적서</span></div>
              <div>/api/sales-approvals/ <span className="text-gray-400">품의서</span></div>
              <div className="pl-4 text-gray-500">
                ├── /[id]/excel <span className="text-gray-400">엑셀</span><br/>
                ├── /[id]/versions <span className="text-gray-400">버전</span><br/>
                ├── /[id]/revise <span className="text-gray-400">새버전</span><br/>
                └── /[id]/sign <span className="text-gray-400">결재</span>
              </div>
              <div>/api/sales-orders/ <span className="text-gray-400">발주서</span></div>
            </div>
          </div>
          <div>
            <h3 className="font-medium text-gray-700 mb-2">관리 문서</h3>
            <div className="bg-gray-50 rounded-lg p-3 font-mono text-sm space-y-1">
              <div>/api/management/</div>
              <div className="pl-4 text-gray-500">
                ├── /invoice-status/ <span className="text-gray-400">계산서</span><br/>
                ├── /sales-ledger/ <span className="text-gray-400">매출대장</span><br/>
                └── /purchase-ledger/ <span className="text-gray-400">매입대장</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 비즈니스 로직 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">핵심 비즈니스 로직</h2>

        <div className="grid grid-cols-3 gap-6">
          {/* 금액 계산 */}
          <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
            <div className="font-medium text-emerald-900 mb-2">💰 금액 자동 계산</div>
            <div className="font-mono text-xs bg-white rounded p-2 space-y-1">
              <div className="text-blue-600">// 매출</div>
              <div>totalAmount = Σ(qty × price)</div>
              <div>vatAmount = total × 0.1</div>
              <div>totalWithVat = total + vat</div>
              <div className="text-purple-600 mt-2">// 매입</div>
              <div>purchaseTotal = Σ(qty × price)</div>
              <div className="text-emerald-600 mt-2">// 마진</div>
              <div>margin = 매출 - 매입</div>
            </div>
          </div>

          {/* 결재 흐름 */}
          <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
            <div className="font-medium text-amber-900 mb-2">✍️ 결재 흐름</div>
            <div className="text-sm space-y-1">
              <div className="flex items-center gap-2">
                <span className="bg-gray-200 px-2 py-0.5 rounded text-xs">DRAFT</span>
                <span className="text-gray-400">작성중</span>
              </div>
              <div className="text-gray-300 pl-4">↓ 영업담당 서명</div>
              <div className="flex items-center gap-2">
                <span className="bg-yellow-200 px-2 py-0.5 rounded text-xs">PENDING_TEAM</span>
              </div>
              <div className="text-gray-300 pl-4">↓ 팀장 서명</div>
              <div className="flex items-center gap-2">
                <span className="bg-orange-200 px-2 py-0.5 rounded text-xs">PENDING_CEO</span>
              </div>
              <div className="text-gray-300 pl-4">↓ CEO 서명</div>
              <div className="flex items-center gap-2">
                <span className="bg-green-200 px-2 py-0.5 rounded text-xs">APPROVED</span>
                <span className="text-green-600">✓</span>
              </div>
              <div className="mt-2 text-xs text-red-500">
                * 어느 단계에서든 반려 가능 → REJECTED
              </div>
            </div>
          </div>

          {/* 문서번호 */}
          <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
            <div className="font-medium text-indigo-900 mb-2">🔢 문서번호 자동생성</div>
            <div className="font-mono text-sm space-y-2">
              <div className="bg-white rounded p-2">
                <span className="text-gray-500">견적서:</span><br/>
                SQ-{'{년도}'}-{'{순번4자리}'}<br/>
                <span className="text-xs text-gray-400">예) SQ-2025-0001</span>
              </div>
              <div className="bg-white rounded p-2">
                <span className="text-gray-500">품의서:</span><br/>
                SA-{'{년도}'}-{'{순번4자리}'}<br/>
                <span className="text-xs text-gray-400">예) SA-2025-0001</span>
              </div>
              <div className="bg-white rounded p-2">
                <span className="text-gray-500">발주서:</span><br/>
                SO-{'{년도}'}-{'{순번4자리}'}<br/>
                <span className="text-xs text-gray-400">예) SO-2025-0001</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 확정된 업무 흐름 */}
      <div className="bg-emerald-50 rounded-xl border-2 border-emerald-400 p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">✅</span>
          <h2 className="text-lg font-semibold text-emerald-900">확정된 업무 흐름</h2>
        </div>
        <p className="text-sm text-emerald-700 mb-6">계산서 발행현황 → 매출장/매입장 연동 구조</p>

        {/* 전체 흐름도 */}
        <div className="bg-white rounded-lg p-6 border border-emerald-200 mb-4">
          <h3 className="font-medium text-gray-900 mb-4">업무 처리 순서</h3>

          <div className="space-y-4">
            {/* Step 1 */}
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold shrink-0">1</div>
              <div className="flex-1">
                <div className="font-medium text-gray-900">품의서 승인</div>
                <div className="text-sm text-gray-500 mt-1">SalesApproval (APPROVED)</div>
                <div className="mt-2 text-sm bg-blue-50 rounded p-2 border border-blue-200">
                  품의서에 매출 품목 + 매입 품목 정보 포함
                </div>
              </div>
            </div>

            <div className="ml-4 border-l-2 border-gray-200 h-6"></div>

            {/* Step 2 */}
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold shrink-0">2</div>
              <div className="flex-1">
                <div className="font-medium text-gray-900">계산서 발행현황 입력</div>
                <div className="text-sm text-gray-500 mt-1">InvoiceStatus (품의서 기반 자동 생성)</div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div className="text-sm bg-blue-50 rounded p-2 border border-blue-200">
                    <div className="font-medium text-blue-800">매출 계산서</div>
                    <div className="text-xs text-gray-600">발행 예정 / 발행 완료</div>
                  </div>
                  <div className="text-sm bg-purple-50 rounded p-2 border border-purple-200">
                    <div className="font-medium text-purple-800">매입 계산서</div>
                    <div className="text-xs text-gray-600">수신 예정 / 수신 완료</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="ml-4 border-l-2 border-gray-200 h-6"></div>

            {/* Step 3 - 분기 */}
            <div className="grid grid-cols-2 gap-6">
              {/* 매출 경로 */}
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-emerald-500 text-white rounded-full flex items-center justify-center font-bold shrink-0">3A</div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">납품 완료 → 매출 계산서 발행</div>
                  <div className="text-sm text-gray-500 mt-1">매출 계산서 발행일 입력</div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-emerald-600">→</span>
                    <div className="text-sm bg-emerald-50 rounded p-2 border border-emerald-300 flex-1">
                      <div className="font-medium text-emerald-800">매출장 자동 생성</div>
                      <div className="text-xs text-gray-600">SalesLedger (계산서 발행일 기준)</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 매입 경로 */}
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold shrink-0">3B</div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">매입 세금계산서 수신</div>
                  <div className="text-sm text-gray-500 mt-1">매입 계산서 수신일 입력</div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-orange-600">→</span>
                    <div className="text-sm bg-orange-50 rounded p-2 border border-orange-300 flex-1">
                      <div className="font-medium text-orange-800">매입장 자동 생성</div>
                      <div className="text-xs text-gray-600">PurchaseLedger (계산서 수신일 기준)</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 데이터 구조 — 재설계(2026-04) 이후 */}
        <div className="bg-white rounded-lg p-4 border border-emerald-200">
          <h3 className="font-medium text-gray-900 mb-3">
            계산서 발행현황 구조 (InvoiceRecord 기반)
          </h3>
          <p className="text-xs text-gray-500 mb-3">
            재설계 이후 계산서 상태/발행 정보는 Product/SalesItem이 아닌 별도 테이블
            <code className="mx-1 px-1 bg-gray-100 rounded">InvoiceRecord</code>가
            단일 Source of Truth. 매출/매입 모두 한 레코드 = 한 계산서.
          </p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-blue-50 rounded p-3">
              <div className="font-medium text-blue-900 mb-2">매출 InvoiceRecord</div>
              <div className="font-mono text-xs space-y-1 text-gray-600">
                <div>invoiceType = &apos;SALES&apos;</div>
                <div>approvalId + productId + salesItemId</div>
                <div>status = PENDING / ISSUED / NEEDS_AMENDMENT / CANCELLED</div>
                <div>invoiceDate, invoiceNumber, remarks</div>
                <div>amendedFromId → 수정발행 체인</div>
                <div className="text-emerald-600 mt-1">→ 발행(issue) 시 SalesLedger 생성</div>
              </div>
            </div>
            <div className="bg-purple-50 rounded p-3">
              <div className="font-medium text-purple-900 mb-2">매입 InvoiceRecord</div>
              <div className="font-mono text-xs space-y-1 text-gray-600">
                <div>invoiceType = &apos;PURCHASE&apos;</div>
                <div>approvalId + vendorCompany (제품 경계 초월)</div>
                <div>같은 품의서 내 동일 매입처는 1건으로 집계</div>
                <div>status/invoiceDate/invoiceNumber/remarks 동일 구조</div>
                <div className="text-orange-600 mt-1">→ 수신 시 PurchaseLedger 생성</div>
              </div>
            </div>
          </div>
          <div className="mt-3 text-xs text-gray-500">
            상태 전이는 전용 API(<code>/api/management/invoices/issue|amend|cancel</code>)로만
            처리. PATCH endpoint는 invoiceDate/invoiceNumber/remarks 메타만 수정.
          </div>
        </div>
      </div>

      {/* 실무자 확인 필요 사항 */}
      <div className="bg-amber-50 rounded-xl border-2 border-amber-300 p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">📋</span>
          <h2 className="text-lg font-semibold text-amber-900">실무자 확인 필요 사항</h2>
        </div>
        <p className="text-sm text-amber-700 mb-6">시스템 구현 전 실무자와 확인이 필요한 질문들 (영역별 정리)</p>

        {/* ===== 1. 품의서 영역 ===== */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b-2 border-indigo-300">
            <span className="w-8 h-8 bg-indigo-500 text-white rounded-full flex items-center justify-center font-bold">1</span>
            <h3 className="text-lg font-semibold text-indigo-900">품의서 (SalesApproval)</h3>
          </div>

          <div className="space-y-4">
            {/* Q2-1 */}
            <div className="bg-white rounded-lg p-4 border border-indigo-200">
              <div className="flex items-start gap-3">
                <span className="px-2 py-1 bg-indigo-500 text-white text-xs font-bold rounded shrink-0">Q2-1</span>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">결재 라인은 고정인가요?</div>
                  <div className="text-sm text-gray-500 mt-1">현재: 담당자 → 팀장 → 대표이사 (3단계)</div>
                  <div className="mt-3 space-y-2 text-sm">
                    <label className="flex items-center gap-2 p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100">
                      <input type="radio" name="q2-1" className="text-indigo-600" />
                      <span><strong>A.</strong> 현재 3단계로 고정</span>
                    </label>
                    <label className="flex items-center gap-2 p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100">
                      <input type="radio" name="q2-1" className="text-indigo-600" />
                      <span><strong>B.</strong> 금액별로 결재 단계 다름 (1000만 이하는 2단계 등)</span>
                    </label>
                    <label className="flex items-center gap-2 p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100">
                      <input type="radio" name="q2-1" className="text-indigo-600" />
                      <span><strong>C.</strong> 유동적 (품의서별로 결재자 지정)</span>
                    </label>
                  </div>
                  <div className="mt-2 p-2 bg-indigo-50 rounded text-xs text-indigo-800">
                    <strong>현재 구현:</strong> 담당자 → 팀장 → CEO 3단계 고정
                  </div>
                </div>
              </div>
            </div>

            {/* Q2-2 */}
            <div className="bg-white rounded-lg p-4 border border-indigo-200">
              <div className="flex items-start gap-3">
                <span className="px-2 py-1 bg-indigo-500 text-white text-xs font-bold rounded shrink-0">Q2-2</span>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">반려 시 처리 방식은?</div>
                  <div className="mt-3 space-y-2 text-sm">
                    <label className="flex items-center gap-2 p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100">
                      <input type="radio" name="q2-2" className="text-indigo-600" />
                      <span><strong>A.</strong> 기존 품의서 수정 후 재결재</span>
                    </label>
                    <label className="flex items-center gap-2 p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100">
                      <input type="radio" name="q2-2" className="text-indigo-600" />
                      <span><strong>B.</strong> 새 버전으로 품의서 생성</span>
                    </label>
                    <label className="flex items-center gap-2 p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100">
                      <input type="radio" name="q2-2" className="text-indigo-600" />
                      <span><strong>C.</strong> 상황에 따라 선택</span>
                    </label>
                  </div>
                  <div className="mt-2 p-2 bg-indigo-50 rounded text-xs text-indigo-800">
                    <strong>현재 구현:</strong> 새 버전 생성 (revise API)
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* ===== 2. 발주서 영역 ===== */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b-2 border-green-300">
            <span className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-bold">2</span>
            <h3 className="text-lg font-semibold text-green-900">발주서 (SalesOrder)</h3>
          </div>

          <div className="space-y-4">
            {/* Q3-1 */}
            <div className="bg-white rounded-lg p-4 border border-green-200">
              <div className="flex items-start gap-3">
                <span className="px-2 py-1 bg-green-500 text-white text-xs font-bold rounded shrink-0">Q3-1</span>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">발주서는 언제 생성되나요?</div>
                  <div className="mt-3 space-y-2 text-sm">
                    <label className="flex items-center gap-2 p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100">
                      <input type="radio" name="q3-1" className="text-green-600" />
                      <span><strong>A.</strong> 품의서 승인 시 자동 생성</span>
                    </label>
                    <label className="flex items-center gap-2 p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100">
                      <input type="radio" name="q3-1" className="text-green-600" />
                      <span><strong>B.</strong> 품의서 승인 후 수동 생성</span>
                    </label>
                    <label className="flex items-center gap-2 p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100">
                      <input type="radio" name="q3-1" className="text-green-600" />
                      <span><strong>C.</strong> 품의서와 별개로 독립 생성</span>
                    </label>
                  </div>
                  <div className="mt-2 p-2 bg-green-50 rounded text-xs text-green-800">
                    <strong>현재 구현:</strong> 품의서 승인 후 수동 생성 (품의서 연결)
                  </div>
                </div>
              </div>
            </div>

            {/* Q3-2 */}
            <div className="bg-white rounded-lg p-4 border border-green-200">
              <div className="flex items-start gap-3">
                <span className="px-2 py-1 bg-green-500 text-white text-xs font-bold rounded shrink-0">Q3-2</span>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">발주서는 매입처별로 생성하나요?</div>
                  <div className="text-sm text-gray-500 mt-1">예: 다나와, 컴퓨존에 각각 발주</div>
                  <div className="mt-3 space-y-2 text-sm">
                    <label className="flex items-center gap-2 p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100">
                      <input type="radio" name="q3-2" className="text-green-600" />
                      <span><strong>A.</strong> 매입처별로 각각 발주서 생성</span>
                    </label>
                    <label className="flex items-center gap-2 p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100">
                      <input type="radio" name="q3-2" className="text-green-600" />
                      <span><strong>B.</strong> 품의서 1건당 발주서 1건 (매입처 통합)</span>
                    </label>
                    <label className="flex items-center gap-2 p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100">
                      <input type="radio" name="q3-2" className="text-green-600" />
                      <span><strong>C.</strong> 자유롭게 선택</span>
                    </label>
                  </div>
                  <div className="mt-2 p-2 bg-green-50 rounded text-xs text-green-800">
                    <strong>현재 구현:</strong> 매입처별로 발주서 생성 가능 (vendorCompany 필드)
                  </div>
                </div>
              </div>
            </div>

            {/* Q3-3 */}
            <div className="bg-white rounded-lg p-4 border border-green-200">
              <div className="flex items-start gap-3">
                <span className="px-2 py-1 bg-green-500 text-white text-xs font-bold rounded shrink-0">Q3-3</span>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">발주서 출력/발송 기능이 필요한가요?</div>
                  <div className="mt-3 space-y-2 text-sm">
                    <label className="flex items-center gap-2 p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100">
                      <input type="radio" name="q3-3" className="text-green-600" />
                      <span><strong>A.</strong> 엑셀/PDF 출력 필요</span>
                    </label>
                    <label className="flex items-center gap-2 p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100">
                      <input type="radio" name="q3-3" className="text-green-600" />
                      <span><strong>B.</strong> 이메일 발송 기능 필요</span>
                    </label>
                    <label className="flex items-center gap-2 p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100">
                      <input type="radio" name="q3-3" className="text-green-600" />
                      <span><strong>C.</strong> 내부 관리용 (출력 불필요)</span>
                    </label>
                  </div>
                  <div className="mt-2 p-2 bg-green-50 rounded text-xs text-green-800">
                    <strong>현재 구현:</strong> 기본 CRUD만 구현, 출력/발송 미구현
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ===== 3. 계산서/결제 영역 ===== */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b-2 border-purple-300">
            <span className="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold">3</span>
            <h3 className="text-lg font-semibold text-purple-900">계산서 발행현황 / 결제</h3>
          </div>

          <div className="space-y-4">
            {/* Q4-1 */}
            <div className="bg-white rounded-lg p-4 border border-purple-200">
              <div className="flex items-start gap-3">
                <span className="px-2 py-1 bg-purple-500 text-white text-xs font-bold rounded shrink-0">Q4-1</span>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">매출 계산서는 어떻게 발행하나요?</div>
                  <div className="mt-3 space-y-2 text-sm">
                    <label className="flex items-center gap-2 p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100">
                      <input type="radio" name="q4-1" className="text-purple-600" />
                      <span><strong>A.</strong> 품목별로 각각 발행 (조립PC 1건, 모니터 1건)</span>
                    </label>
                    <label className="flex items-center gap-2 p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100">
                      <input type="radio" name="q4-1" className="text-purple-600" />
                      <span><strong>B.</strong> 품의서 단위로 합산 발행 (품의서 1건 = 계산서 1건)</span>
                    </label>
                    <label className="flex items-center gap-2 p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100">
                      <input type="radio" name="q4-1" className="text-purple-600" />
                      <span><strong>C.</strong> 상황에 따라 다름 (유연하게 선택)</span>
                    </label>
                  </div>
                  <div className="mt-2 p-2 bg-purple-50 rounded text-xs text-purple-800">
                    <strong>현재 구현:</strong> 품목별로 각각 SalesInvoiceStatus 생성
                  </div>
                </div>
              </div>
            </div>

            {/* Q4-2 */}
            <div className="bg-white rounded-lg p-4 border border-purple-200">
              <div className="flex items-start gap-3">
                <span className="px-2 py-1 bg-purple-500 text-white text-xs font-bold rounded shrink-0">Q4-2</span>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">매입 계산서는 어떻게 관리하나요?</div>
                  <div className="text-sm text-gray-500 mt-1">예: 조립PC 1대를 만들기 위해 CPU, RAM, GPU 등을 각각 다른 매입처에서 구매</div>
                  <div className="mt-3 space-y-2 text-sm">
                    <label className="flex items-center gap-2 p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100">
                      <input type="radio" name="q4-2" className="text-purple-600" />
                      <span><strong>A.</strong> 부품별로 각각 관리 (CPU 1건, RAM 1건, GPU 1건...)</span>
                    </label>
                    <label className="flex items-center gap-2 p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100">
                      <input type="radio" name="q4-2" className="text-purple-600" />
                      <span><strong>B.</strong> 매입처별로 합산 관리 (다나와 1건, 컴퓨존 1건...)</span>
                    </label>
                    <label className="flex items-center gap-2 p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100">
                      <input type="radio" name="q4-2" className="text-purple-600" />
                      <span><strong>C.</strong> 품의서 단위로 합산 관리 (매입 총액 1건)</span>
                    </label>
                  </div>
                  <div className="mt-2 p-2 bg-purple-50 rounded text-xs text-purple-800">
                    <strong>현재 구현:</strong> 부품별로 각각 PurchaseInvoiceStatus 생성
                  </div>
                </div>
              </div>
            </div>

            {/* Q4-3 */}
            <div className="bg-white rounded-lg p-4 border border-purple-200">
              <div className="flex items-start gap-3">
                <span className="px-2 py-1 bg-purple-500 text-white text-xs font-bold rounded shrink-0">Q4-3</span>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">분할 결제는 어떻게 처리하나요?</div>
                  <div className="text-sm text-gray-500 mt-1">예: 1000만원 계약 → 선금 500만, 잔금 500만</div>
                  <div className="mt-3 space-y-2 text-sm">
                    <label className="flex items-center gap-2 p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100">
                      <input type="radio" name="q4-3" className="text-purple-600" />
                      <span><strong>A.</strong> 계산서 1건 + 결제내역 여러 건</span>
                    </label>
                    <label className="flex items-center gap-2 p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100">
                      <input type="radio" name="q4-3" className="text-purple-600" />
                      <span><strong>B.</strong> 계산서 자체를 분할 발행 (선금 계산서, 잔금 계산서)</span>
                    </label>
                    <label className="flex items-center gap-2 p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100">
                      <input type="radio" name="q4-3" className="text-purple-600" />
                      <span><strong>C.</strong> 분할 결제 없음 (항상 일시불)</span>
                    </label>
                  </div>
                  <div className="mt-2 p-2 bg-purple-50 rounded text-xs text-purple-800">
                    <strong>현재 구현:</strong> 계산서 1건 + PaymentHistory로 결제내역 관리
                  </div>
                </div>
              </div>
            </div>

            {/* Q4-4 */}
            <div className="bg-white rounded-lg p-4 border border-purple-200">
              <div className="flex items-start gap-3">
                <span className="px-2 py-1 bg-purple-500 text-white text-xs font-bold rounded shrink-0">Q4-4</span>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">실제 세금계산서 발행은 어디서 하나요?</div>
                  <div className="mt-3 space-y-2 text-sm">
                    <label className="flex items-center gap-2 p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100">
                      <input type="radio" name="q4-4" className="text-purple-600" />
                      <span><strong>A.</strong> 홈택스에서 직접 발행 (ERP는 현황 관리만)</span>
                    </label>
                    <label className="flex items-center gap-2 p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100">
                      <input type="radio" name="q4-4" className="text-purple-600" />
                      <span><strong>B.</strong> 세금계산서 솔루션 연동 (바로빌, 팝빌 등)</span>
                    </label>
                    <label className="flex items-center gap-2 p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100">
                      <input type="radio" name="q4-4" className="text-purple-600" />
                      <span><strong>C.</strong> ERP에서 직접 발행 기능 필요</span>
                    </label>
                  </div>
                  <div className="mt-2 p-2 bg-purple-50 rounded text-xs text-purple-800">
                    <strong>현재 구현:</strong> 현황 관리만 (실제 발행 기능 없음)
                  </div>
                </div>
              </div>
            </div>

            {/* Q4-5 */}
            <div className="bg-white rounded-lg p-4 border border-purple-200">
              <div className="flex items-start gap-3">
                <span className="px-2 py-1 bg-purple-500 text-white text-xs font-bold rounded shrink-0">Q4-5</span>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">같은 매입처에서 여러 품의서 부품을 구매한 경우?</div>
                  <div className="text-sm text-gray-500 mt-1">예: 다나와에서 품의서A CPU + 품의서B CPU 동시 구매</div>
                  <div className="mt-3 space-y-2 text-sm">
                    <label className="flex items-center gap-2 p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100">
                      <input type="radio" name="q4-5" className="text-purple-600" />
                      <span><strong>A.</strong> 품의서별로 따로 관리</span>
                    </label>
                    <label className="flex items-center gap-2 p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100">
                      <input type="radio" name="q4-5" className="text-purple-600" />
                      <span><strong>B.</strong> 매입처별로 합산 관리 (월별 정산)</span>
                    </label>
                    <label className="flex items-center gap-2 p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100">
                      <input type="radio" name="q4-5" className="text-purple-600" />
                      <span><strong>C.</strong> 실제 계산서 단위로 관리 (묶음 배송이면 1건)</span>
                    </label>
                  </div>
                  <div className="mt-2 p-2 bg-purple-50 rounded text-xs text-purple-800">
                    <strong>현재 구현:</strong> 품의서별로 따로 관리
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ===== 4. 대장 영역 ===== */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b-2 border-orange-300">
            <span className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold">4</span>
            <h3 className="text-lg font-semibold text-orange-900">매출장 / 매입장 (Ledger)</h3>
          </div>

          <div className="space-y-4">
            {/* Q5-1 */}
            <div className="bg-white rounded-lg p-4 border border-orange-200">
              <div className="flex items-start gap-3">
                <span className="px-2 py-1 bg-orange-500 text-white text-xs font-bold rounded shrink-0">Q5-1</span>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">계산서 발행현황 → 매출장/매입장 연동은?</div>
                  <div className="mt-3 space-y-2 text-sm">
                    <label className="flex items-center gap-2 p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100">
                      <input type="radio" name="q5-1" className="text-orange-600" />
                      <span><strong>A.</strong> 계산서 발행 시 자동으로 대장에 추가</span>
                    </label>
                    <label className="flex items-center gap-2 p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100">
                      <input type="radio" name="q5-1" className="text-orange-600" />
                      <span><strong>B.</strong> 계산서와 대장은 별개로 관리</span>
                    </label>
                    <label className="flex items-center gap-2 p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100">
                      <input type="radio" name="q5-1" className="text-orange-600" />
                      <span><strong>C.</strong> 대장이 필요 없음 (계산서만으로 충분)</span>
                    </label>
                  </div>
                  <div className="mt-2 p-2 bg-orange-50 rounded text-xs text-orange-800">
                    <strong>현재 구현:</strong> 미구현 (계산서 발행현황만 있음)
                  </div>
                </div>
              </div>
            </div>

            {/* Q5-2 */}
            <div className="bg-white rounded-lg p-4 border border-orange-200">
              <div className="flex items-start gap-3">
                <span className="px-2 py-1 bg-orange-500 text-white text-xs font-bold rounded shrink-0">Q5-2</span>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">대장에서 어떤 집계/통계가 필요한가요?</div>
                  <div className="mt-3 space-y-2 text-sm">
                    <label className="flex items-center gap-2 p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100">
                      <input type="radio" name="q5-2" className="text-orange-600" />
                      <span><strong>A.</strong> 월별 매출/매입 합계</span>
                    </label>
                    <label className="flex items-center gap-2 p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100">
                      <input type="radio" name="q5-2" className="text-orange-600" />
                      <span><strong>B.</strong> 거래처별 매출/매입 합계</span>
                    </label>
                    <label className="flex items-center gap-2 p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100">
                      <input type="radio" name="q5-2" className="text-orange-600" />
                      <span><strong>C.</strong> 위 항목 전부 필요</span>
                    </label>
                  </div>
                  <div className="mt-2 p-2 bg-orange-50 rounded text-xs text-orange-800">
                    <strong>현재 구현:</strong> 기본 목록 API만 구현
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ===== 5. MA 영역 ===== */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b-2 border-teal-300">
            <span className="w-8 h-8 bg-teal-500 text-white rounded-full flex items-center justify-center font-bold">5</span>
            <h3 className="text-lg font-semibold text-teal-900">MA (유지보수)</h3>
          </div>

          <div className="space-y-4">
            {/* Q6-1 */}
            <div className="bg-white rounded-lg p-4 border border-teal-200">
              <div className="flex items-start gap-3">
                <span className="px-2 py-1 bg-teal-500 text-white text-xs font-bold rounded shrink-0">Q6-1</span>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">MA 계약과 영업(Sales)은 별개로 관리하나요?</div>
                  <div className="mt-3 space-y-2 text-sm">
                    <label className="flex items-center gap-2 p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100">
                      <input type="radio" name="q6-1" className="text-teal-600" />
                      <span><strong>A.</strong> 완전히 별개 (MA 전용 견적/품의)</span>
                    </label>
                    <label className="flex items-center gap-2 p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100">
                      <input type="radio" name="q6-1" className="text-teal-600" />
                      <span><strong>B.</strong> 영업 품의서에 MA 포함 가능</span>
                    </label>
                    <label className="flex items-center gap-2 p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100">
                      <input type="radio" name="q6-1" className="text-teal-600" />
                      <span><strong>C.</strong> MA는 후순위 (나중에 구현)</span>
                    </label>
                  </div>
                  <div className="mt-2 p-2 bg-teal-50 rounded text-xs text-teal-800">
                    <strong>현재 구현:</strong> MA 전용 테이블 있음 (MAQuote, MAApproval)
                  </div>
                </div>
              </div>
            </div>

            {/* Q6-2 */}
            <div className="bg-white rounded-lg p-4 border border-teal-200">
              <div className="flex items-start gap-3">
                <span className="px-2 py-1 bg-teal-500 text-white text-xs font-bold rounded shrink-0">Q6-2</span>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">MA 계약 만료 알림이 필요한가요?</div>
                  <div className="mt-3 space-y-2 text-sm">
                    <label className="flex items-center gap-2 p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100">
                      <input type="radio" name="q6-2" className="text-teal-600" />
                      <span><strong>A.</strong> 만료 N일 전 알림 필요</span>
                    </label>
                    <label className="flex items-center gap-2 p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100">
                      <input type="radio" name="q6-2" className="text-teal-600" />
                      <span><strong>B.</strong> 대시보드에 만료 예정 목록 표시</span>
                    </label>
                    <label className="flex items-center gap-2 p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100">
                      <input type="radio" name="q6-2" className="text-teal-600" />
                      <span><strong>C.</strong> 알림 불필요 (수동 확인)</span>
                    </label>
                  </div>
                  <div className="mt-2 p-2 bg-teal-50 rounded text-xs text-teal-800">
                    <strong>현재 구현:</strong> 미구현
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ===== 6. 공통/기타 영역 ===== */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b-2 border-gray-400">
            <span className="w-8 h-8 bg-gray-600 text-white rounded-full flex items-center justify-center font-bold">6</span>
            <h3 className="text-lg font-semibold text-gray-900">공통 / 기타</h3>
          </div>

          <div className="space-y-4">
            {/* Q7-1 */}
            <div className="bg-white rounded-lg p-4 border border-gray-300">
              <div className="flex items-start gap-3">
                <span className="px-2 py-1 bg-gray-600 text-white text-xs font-bold rounded shrink-0">Q7-1</span>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">문서 삭제 정책은?</div>
                  <div className="mt-3 space-y-2 text-sm">
                    <label className="flex items-center gap-2 p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100">
                      <input type="radio" name="q7-1" className="text-gray-600" />
                      <span><strong>A.</strong> 실제 삭제 (DB에서 제거)</span>
                    </label>
                    <label className="flex items-center gap-2 p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100">
                      <input type="radio" name="q7-1" className="text-gray-600" />
                      <span><strong>B.</strong> 소프트 삭제 (삭제 플래그만)</span>
                    </label>
                    <label className="flex items-center gap-2 p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100">
                      <input type="radio" name="q7-1" className="text-gray-600" />
                      <span><strong>C.</strong> 승인된 문서는 삭제 불가</span>
                    </label>
                  </div>
                  <div className="mt-2 p-2 bg-gray-100 rounded text-xs text-gray-800">
                    <strong>현재 구현:</strong> 실제 삭제 (Hard Delete)
                  </div>
                </div>
              </div>
            </div>

            {/* Q7-2 */}
            <div className="bg-white rounded-lg p-4 border border-gray-300">
              <div className="flex items-start gap-3">
                <span className="px-2 py-1 bg-gray-600 text-white text-xs font-bold rounded shrink-0">Q7-2</span>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">엑셀 출력에 어떤 정보가 포함되어야 하나요?</div>
                  <div className="text-sm text-gray-500 mt-1">품의서, 견적서, 발주서 등</div>
                  <div className="mt-3 space-y-2 text-sm">
                    <label className="flex items-center gap-2 p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100">
                      <input type="radio" name="q7-2" className="text-gray-600" />
                      <span><strong>A.</strong> 기존 엑셀 양식 그대로</span>
                    </label>
                    <label className="flex items-center gap-2 p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100">
                      <input type="radio" name="q7-2" className="text-gray-600" />
                      <span><strong>B.</strong> 새 양식으로 변경</span>
                    </label>
                    <label className="flex items-center gap-2 p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100">
                      <input type="radio" name="q7-2" className="text-gray-600" />
                      <span><strong>C.</strong> 상황별로 다른 양식</span>
                    </label>
                  </div>
                  <div className="mt-2 p-2 bg-gray-100 rounded text-xs text-gray-800">
                    <strong>현재 구현:</strong> 품의서 엑셀 출력 구현됨
                  </div>
                </div>
              </div>
            </div>

            {/* Q7-3 */}
            <div className="bg-white rounded-lg p-4 border border-gray-300">
              <div className="flex items-start gap-3">
                <span className="px-2 py-1 bg-gray-600 text-white text-xs font-bold rounded shrink-0">Q7-3</span>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">사용자 권한 구분이 필요한가요?</div>
                  <div className="mt-3 space-y-2 text-sm">
                    <label className="flex items-center gap-2 p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100">
                      <input type="radio" name="q7-3" className="text-gray-600" />
                      <span><strong>A.</strong> 역할별 권한 (영업/경영/관리자)</span>
                    </label>
                    <label className="flex items-center gap-2 p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100">
                      <input type="radio" name="q7-3" className="text-gray-600" />
                      <span><strong>B.</strong> 문서별 권한 (본인 문서만)</span>
                    </label>
                    <label className="flex items-center gap-2 p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100">
                      <input type="radio" name="q7-3" className="text-gray-600" />
                      <span><strong>C.</strong> 전체 공개 (권한 구분 없음)</span>
                    </label>
                  </div>
                  <div className="mt-2 p-2 bg-gray-100 rounded text-xs text-gray-800">
                    <strong>현재 구현:</strong> 역할별 권한 (User.role: ADMIN/SALES/MANAGEMENT)
                  </div>
                </div>
              </div>
            </div>

            {/* Q7-4 */}
            <div className="bg-white rounded-lg p-4 border border-gray-300">
              <div className="flex items-start gap-3">
                <span className="px-2 py-1 bg-gray-600 text-white text-xs font-bold rounded shrink-0">Q7-4</span>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">알림/노티피케이션이 필요한가요?</div>
                  <div className="mt-3 space-y-2 text-sm">
                    <label className="flex items-center gap-2 p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100">
                      <input type="radio" name="q7-4" className="text-gray-600" />
                      <span><strong>A.</strong> 결재 요청/완료 시 알림</span>
                    </label>
                    <label className="flex items-center gap-2 p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100">
                      <input type="radio" name="q7-4" className="text-gray-600" />
                      <span><strong>B.</strong> 이메일 알림</span>
                    </label>
                    <label className="flex items-center gap-2 p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100">
                      <input type="radio" name="q7-4" className="text-gray-600" />
                      <span><strong>C.</strong> 알림 불필요</span>
                    </label>
                  </div>
                  <div className="mt-2 p-2 bg-gray-100 rounded text-xs text-gray-800">
                    <strong>현재 구현:</strong> 미구현
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 메모 영역 */}
        <div className="mt-6 p-4 bg-white rounded-lg border border-amber-200">
          <div className="font-medium text-gray-900 mb-2">실무자 미팅 메모</div>
          <textarea
            className="w-full h-32 p-3 border border-gray-200 rounded text-sm resize-none"
            placeholder="실무자 미팅 후 확인된 사항을 여기에 기록..."
          />
        </div>

        {/* 요약 */}
        <div className="mt-6 p-4 bg-amber-100 rounded-lg border border-amber-300">
          <div className="font-medium text-amber-900 mb-4">진행 현황</div>

          {/* 남은 질문 요약 */}
          <div className="bg-amber-50 rounded-lg p-3 text-center border border-amber-300 mb-4">
            <div className="text-3xl font-bold text-amber-600">18</div>
            <div className="text-sm text-amber-800">남은 질문</div>
          </div>

          <div className="font-medium text-amber-900 mb-2">영역별 현황</div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-indigo-600">2</div>
              <div className="text-gray-600">품의서</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">3</div>
              <div className="text-gray-600">발주서</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">5</div>
              <div className="text-gray-600">계산서/결제</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">2</div>
              <div className="text-gray-600">대장</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-teal-600">2</div>
              <div className="text-gray-600">MA</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">4</div>
              <div className="text-gray-600">공통/기타</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
