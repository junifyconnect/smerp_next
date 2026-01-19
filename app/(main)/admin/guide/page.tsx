'use client'

export default function ProcessDesignPage() {
  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">프로세스 설계도</h1>
        <p className="text-gray-500 mt-1">서버메이트 ERP 업무 흐름 및 서류 연결 구조</p>
      </div>

      {/* Sales 프로세스 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-6">
          <span className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center text-sm font-bold">S</span>
          <h2 className="text-lg font-bold text-gray-900">Sales 프로세스</h2>
          <span className="text-xs text-gray-400 ml-2">제품 판매</span>
        </div>

        {/* Sales 프로세스 흐름도 */}
        <div className="flex items-start gap-4 overflow-x-auto pb-4">
          <DocCard
            title="견적서"
            path="/sales/quotes"
            color="blue"
            keyFields={[
              { label: 'quoteId', desc: 'PK' },
              { label: '고객사', desc: '→ 품의서' },
              { label: '품목/단가', desc: '→ 품의서' },
            ]}
          />

          <FlowArrow label="quoteId" />

          <DocCard
            title="품의서"
            path="/sales/approvals"
            color="indigo"
            highlight
            keyFields={[
              { label: 'approvalId', desc: 'PK' },
              { label: 'quoteId', desc: 'FK (견적서)' },
              { label: '품의코드', desc: '→ 발주서, 계산서' },
              { label: '매출 품목', desc: '고객사, 품목, 수량, 단가' },
              { label: '매입 품목', desc: '매입처, 품목, 수량, 단가' },
            ]}
          />

          <FlowArrow label="approvalId" color="emerald" />

          <DocCardSmall
            title="발주서"
            path="/sales/orders"
            color="purple"
            keyFields={[
              { label: 'salesApprovalId', desc: 'FK' },
              { label: '품의코드', desc: '연결키' },
              { label: '매입처별 그룹', desc: '' },
            ]}
          />
        </div>

        {/* 결재 프로세스 */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex items-center gap-3 flex-wrap text-sm">
            <span className="text-gray-500">결재:</span>
            <span className="px-2 py-1 bg-amber-50 text-amber-700 rounded">영업담당 (작성자)</span>
            <span className="text-gray-400">→</span>
            <span className="px-2 py-1 bg-amber-50 text-amber-700 rounded">팀장</span>
            <span className="text-gray-400">→</span>
            <span className="px-2 py-1 bg-amber-50 text-amber-700 rounded">대표</span>
            <span className="text-gray-400">→</span>
            <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded font-medium">APPROVED</span>
          </div>
        </div>
      </div>

      {/* MA 프로세스 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-6">
          <span className="w-8 h-8 bg-orange-600 text-white rounded-lg flex items-center justify-center text-sm font-bold">M</span>
          <h2 className="text-lg font-bold text-gray-900">MA 프로세스</h2>
          <span className="text-xs text-gray-400 ml-2">유지보수</span>
        </div>

        {/* MA 프로세스 흐름도 */}
        <div className="flex items-start gap-4 overflow-x-auto pb-4">
          <DocCard
            title="MA 견적서"
            path="/ma/quotes"
            color="orange"
            keyFields={[
              { label: 'quoteId', desc: 'PK' },
              { label: '고객사', desc: '→ 품의서' },
              { label: '품목/단가', desc: '→ 품의서' },
              { label: 'MA기간', desc: '시작~종료' },
            ]}
          />

          <FlowArrow label="quoteId" />

          <DocCard
            title="MA 품의서"
            path="/ma/approvals"
            color="amber"
            highlight
            keyFields={[
              { label: 'approvalId', desc: 'PK' },
              { label: 'quoteId', desc: 'FK (견적서)' },
              { label: '품의코드', desc: '→ 계산서' },
              { label: '매출 품목', desc: '고객사, 품목, 수량, 단가' },
              { label: '매입 품목', desc: '매입처, 품목, 수량, 단가' },
            ]}
          />

          <div className="flex flex-col items-center justify-center gap-1 flex-shrink-0 pt-8">
            <span className="text-[10px] text-gray-400">발주서 없음</span>
          </div>
        </div>

        {/* Sales와 차이점 */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="text-sm text-gray-500 mb-2">Sales와 차이점:</div>
          <div className="flex gap-3 flex-wrap text-xs">
            <span className="px-2 py-1 bg-orange-50 text-orange-700 rounded">P/N 없음</span>
            <span className="px-2 py-1 bg-orange-50 text-orange-700 rounded">발주서 생성 안함</span>
            <span className="px-2 py-1 bg-orange-50 text-orange-700 rounded">MA기간 필드 있음</span>
          </div>
        </div>
      </div>

      {/* 경영 - 계산서 발행현황 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-6">
          <span className="w-8 h-8 bg-emerald-600 text-white rounded-lg flex items-center justify-center text-sm font-bold">$</span>
          <h2 className="text-lg font-bold text-gray-900">경영 - 계산서 발행현황</h2>
          <span className="text-xs text-gray-400 ml-2">/management/invoice-issue</span>
        </div>

        {/* 데이터 소스 */}
        <div className="flex items-start gap-4 overflow-x-auto pb-4">
          <div className="flex flex-col gap-2">
            <DocCardSmall
              title="Sales 품의서"
              path="APPROVED"
              color="purple"
              keyFields={[
                { label: 'salesApprovalId', desc: 'FK' },
                { label: '품의코드', desc: '' },
              ]}
            />
            <DocCardSmall
              title="MA 품의서"
              path="APPROVED"
              color="purple"
              keyFields={[
                { label: 'maApprovalId', desc: 'FK' },
                { label: '품의코드', desc: '' },
              ]}
            />
          </div>

          <FlowArrow label="승인 시 자동생성" color="emerald" />

          <DocCard
            title="계산서 발행현황"
            path="/management/invoice-issue"
            color="emerald"
            keyFields={[
              { label: 'salesApprovalId', desc: 'FK (Sales)' },
              { label: 'maApprovalId', desc: 'FK (MA)' },
              { label: '품의코드', desc: '조회/연결키' },
              { label: 'yearMonth', desc: '25.01 형식' },
            ]}
          />

          <FlowArrow label="" />

          <div className="flex flex-col gap-3">
            <div className="w-52 bg-blue-50 rounded-lg border border-blue-200 p-3">
              <div className="font-medium text-sm text-blue-700">매출 계산서</div>
              <div className="text-[10px] text-gray-500 mt-2 space-y-1">
                <div className="flex items-center gap-2">
                  <code className="px-1 py-0.5 bg-blue-100 text-blue-600 rounded">clientCompany</code>
                  <span>매출처</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="px-1 py-0.5 bg-blue-100 text-blue-600 rounded">invoiceDate</code>
                  <span>발행일</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="px-1 py-0.5 bg-blue-100 text-blue-600 rounded">invoiceStatus</code>
                  <span>발행상태</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="px-1 py-0.5 bg-blue-100 text-blue-600 rounded">paidAmount</code>
                  <span>입금액</span>
                </div>
              </div>
            </div>
            <div className="w-52 bg-purple-50 rounded-lg border border-purple-200 p-3">
              <div className="font-medium text-sm text-purple-700">매입 계산서</div>
              <div className="text-[10px] text-gray-500 mt-2 space-y-1">
                <div className="flex items-center gap-2">
                  <code className="px-1 py-0.5 bg-purple-100 text-purple-600 rounded">vendorCompany</code>
                  <span>매입처</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="px-1 py-0.5 bg-purple-100 text-purple-600 rounded">invoiceDate</code>
                  <span>발행일</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="px-1 py-0.5 bg-purple-100 text-purple-600 rounded">invoiceStatus</code>
                  <span>발행상태</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="px-1 py-0.5 bg-purple-100 text-purple-600 rounded">paidAmount</code>
                  <span>출금액</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 상태값 */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-500 mb-2">발행상태 (invoiceStatus)</div>
              <div className="flex gap-2 flex-wrap text-xs">
                <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded">미발행</span>
                <span className="px-2 py-1 bg-blue-100 text-blue-600 rounded">발행완료</span>
                <span className="px-2 py-1 bg-red-100 text-red-600 rounded">반품</span>
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500 mb-2">결제상태 (paymentStatus)</div>
              <div className="flex gap-2 flex-wrap text-xs">
                <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded">미결제</span>
                <span className="px-2 py-1 bg-amber-100 text-amber-600 rounded">부분결제</span>
                <span className="px-2 py-1 bg-emerald-100 text-emerald-600 rounded">완료</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 핵심 연결 정보 요약 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-6">
          <span className="w-8 h-8 bg-gray-700 text-white rounded-lg flex items-center justify-center text-sm font-bold">KEY</span>
          <h2 className="text-lg font-bold text-gray-900">서류 간 연결 키</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-700">연결</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">연결 키</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">전달 데이터</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">트리거</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="py-3 px-4">
                  <span className="text-blue-600">견적서</span>
                  <span className="text-gray-400 mx-2">→</span>
                  <span className="text-indigo-600">품의서</span>
                </td>
                <td className="py-3 px-4">
                  <code className="px-2 py-0.5 bg-gray-100 rounded text-xs">quoteId</code>
                </td>
                <td className="py-3 px-4 text-gray-600">고객사, 품목, 수량, 단가</td>
                <td className="py-3 px-4">
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs">견적서 선택</span>
                </td>
              </tr>
              <tr>
                <td className="py-3 px-4">
                  <span className="text-indigo-600">품의서</span>
                  <span className="text-gray-400 mx-2">→</span>
                  <span className="text-purple-600">발주서</span>
                </td>
                <td className="py-3 px-4">
                  <code className="px-2 py-0.5 bg-gray-100 rounded text-xs">salesApprovalId</code>
                  <code className="px-2 py-0.5 bg-gray-100 rounded text-xs ml-1">품의코드</code>
                </td>
                <td className="py-3 px-4 text-gray-600">매입처, 품목, 수량, 매입단가</td>
                <td className="py-3 px-4">
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded text-xs">품의서 승인</span>
                </td>
              </tr>
              <tr>
                <td className="py-3 px-4">
                  <span className="text-indigo-600">품의서</span>
                  <span className="text-gray-400 mx-2">→</span>
                  <span className="text-emerald-600">계산서현황</span>
                </td>
                <td className="py-3 px-4">
                  <code className="px-2 py-0.5 bg-gray-100 rounded text-xs">salesApprovalId / maApprovalId</code>
                  <code className="px-2 py-0.5 bg-gray-100 rounded text-xs ml-1">품의코드</code>
                </td>
                <td className="py-3 px-4 text-gray-600">
                  <div>매출: 고객사, 품목, 금액</div>
                  <div>매입: 매입처, 품목, 금액</div>
                </td>
                <td className="py-3 px-4">
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded text-xs">품의서 승인</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 품의코드 형식 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="w-8 h-8 bg-gray-600 text-white rounded-lg flex items-center justify-center text-sm font-bold">#</span>
          <h2 className="text-lg font-bold text-gray-900">품의코드 형식</h2>
        </div>

        <div className="flex items-center gap-6 flex-wrap">
          <div className="flex items-center gap-2">
            <code className="px-3 py-2 bg-blue-50 text-blue-700 rounded-lg font-mono text-lg">Y251201-01</code>
            <span className="text-gray-400">Sales</span>
          </div>
          <div className="flex items-center gap-2">
            <code className="px-3 py-2 bg-orange-50 text-orange-700 rounded-lg font-mono text-lg">M251201-01</code>
            <span className="text-gray-400">MA</span>
          </div>
        </div>

        <div className="mt-4 text-sm text-gray-600">
          <div className="flex gap-4 flex-wrap">
            <span><code className="bg-gray-100 px-1 rounded">Y/M</code> = Sales/MA 구분</span>
            <span><code className="bg-gray-100 px-1 rounded">251201</code> = 년월일 (YYMMDD)</span>
            <span><code className="bg-gray-100 px-1 rounded">01</code> = 일련번호</span>
          </div>
        </div>
      </div>

      {/* 범례 */}
      <div className="flex items-center justify-center gap-6 text-xs text-gray-500 py-4 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded"></div>
          <span>Sales / 매출</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-orange-100 border border-orange-300 rounded"></div>
          <span>MA</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-purple-100 border border-purple-300 rounded"></div>
          <span>매입</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-emerald-100 border border-emerald-300 rounded"></div>
          <span>경영 (계산서)</span>
        </div>
      </div>
    </div>
  )
}

// 문서 카드 컴포넌트
function DocCard({
  title,
  path,
  color,
  keyFields,
  highlight = false
}: {
  title: string
  path: string
  color: 'blue' | 'indigo' | 'orange' | 'amber' | 'emerald'
  keyFields: { label: string; desc: string }[]
  highlight?: boolean
}) {
  const colors = {
    blue: { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-700', badge: 'bg-blue-100' },
    indigo: { bg: 'bg-indigo-50', border: 'border-indigo-300', text: 'text-indigo-700', badge: 'bg-indigo-100' },
    orange: { bg: 'bg-orange-50', border: 'border-orange-300', text: 'text-orange-700', badge: 'bg-orange-100' },
    amber: { bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-700', badge: 'bg-amber-100' },
    emerald: { bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-700', badge: 'bg-emerald-100' },
  }
  const c = colors[color]

  return (
    <div className={`flex-shrink-0 w-56 ${c.bg} rounded-xl border-2 ${c.border} ${highlight ? 'ring-2 ring-offset-2 ring-' + color + '-400' : ''}`}>
      <div className={`px-4 py-3 border-b ${c.border}`}>
        <div className={`font-bold ${c.text}`}>{title}</div>
        <div className="text-xs text-gray-500">{path}</div>
      </div>
      <div className="px-4 py-3 space-y-2">
        {keyFields.map((field, i) => (
          <div key={i} className="flex items-center gap-2">
            <code className={`px-1.5 py-0.5 ${c.badge} ${c.text} text-[10px] rounded font-mono`}>{field.label}</code>
            {field.desc && <span className="text-[10px] text-gray-400">{field.desc}</span>}
          </div>
        ))}
      </div>
    </div>
  )
}

// 작은 문서 카드
function DocCardSmall({
  title,
  path,
  color,
  keyFields
}: {
  title: string
  path: string
  color: 'purple' | 'emerald'
  keyFields: { label: string; desc: string }[]
}) {
  const colors = {
    purple: { bg: 'bg-purple-50', border: 'border-purple-300', text: 'text-purple-700', badge: 'bg-purple-100' },
    emerald: { bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-700', badge: 'bg-emerald-100' },
  }
  const c = colors[color]

  return (
    <div className={`w-44 ${c.bg} rounded-lg border ${c.border} p-3`}>
      <div className={`font-medium text-sm ${c.text}`}>{title}</div>
      <div className="text-[10px] text-gray-500 mb-2">{path}</div>
      <div className="space-y-1">
        {keyFields.map((field, i) => (
          <div key={i} className="flex items-center gap-1">
            <code className={`px-1 py-0.5 ${c.badge} ${c.text} text-[9px] rounded font-mono`}>{field.label}</code>
            {field.desc && <span className="text-[9px] text-gray-400">{field.desc}</span>}
          </div>
        ))}
      </div>
    </div>
  )
}

// 화살표
function FlowArrow({ label, color = 'gray' }: { label: string; color?: 'gray' | 'emerald' }) {
  const arrowColor = color === 'emerald' ? 'text-emerald-500' : 'text-gray-400'
  const labelColor = color === 'emerald' ? 'text-emerald-600 bg-emerald-50' : 'text-gray-500 bg-gray-100'

  return (
    <div className="flex flex-col items-center justify-center gap-1 flex-shrink-0 pt-8">
      {label && <code className={`text-[10px] px-2 py-0.5 rounded ${labelColor}`}>{label}</code>}
      <span className={`text-2xl ${arrowColor}`}>→</span>
    </div>
  )
}
