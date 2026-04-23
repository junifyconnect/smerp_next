'use client'

import Link from 'next/link'
import type { SuccessResponse } from '@/lib/response/responseHandler'
import type {
  DashboardData,
  SalesDashboardData,
  FinanceDashboardData,
  CeoDashboardData,
} from '../_types/dashboard'

interface DashboardPageClientProps {
  initialData: SuccessResponse<DashboardData>
}

const statusLabels: Record<string, { label: string; color: string }> = {
  DRAFT: { label: '작성중', color: 'bg-gray-100 text-gray-700' },
  PENDING: { label: '기안됨', color: 'bg-yellow-100 text-yellow-700' },
  PENDING_TEAM_LEAD: { label: '팀장 대기', color: 'bg-orange-100 text-orange-700' },
  PENDING_CEO: { label: '대표 대기', color: 'bg-blue-100 text-blue-700' },
  APPROVED: { label: '승인완료', color: 'bg-green-100 text-green-700' },
  REJECTED: { label: '반려', color: 'bg-red-100 text-red-700' },
}

function fmtMoney(n: number): string {
  return n.toLocaleString('ko-KR')
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '-'
  return new Date(iso).toLocaleDateString('ko-KR')
}

// ─────────────────────────────────────────
// 공통: 오늘의 일정 + 알림
// ─────────────────────────────────────────
function CommonPanel({ common }: { common: DashboardData['common'] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-800">🔔 알림</h3>
          <Link href="/api/notifications" className="text-xs text-blue-600 hover:underline">
            전체보기
          </Link>
        </div>
        <p className="text-2xl font-bold">
          {common.unreadNotifications}
          <span className="text-sm font-normal ml-1 text-gray-500">건 읽지 않음</span>
        </p>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-800">📅 오늘의 일정</h3>
          <Link href="/calendar" className="text-xs text-blue-600 hover:underline">
            캘린더
          </Link>
        </div>
        {common.todayEvents.length === 0 ? (
          <p className="text-sm text-gray-500">오늘 일정 없음</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {common.todayEvents.slice(0, 3).map((e) => (
              <li key={e.id} className="truncate">
                <span className="text-gray-500 mr-2">
                  {e.isAllDay ? '종일' : new Date(e.startDate).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                </span>
                {e.title}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────
// 영업팀 뷰
// ─────────────────────────────────────────
function SalesView({ data }: { data: SalesDashboardData }) {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">대시보드 · 영업팀</h1>
        <p className="text-sm text-gray-500 mt-1">내 작성 품의서와 이번달 매출 현황</p>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="작성중" value={data.myApprovalStatus.draft} color="gray" link="/sales/approvals?status=DRAFT" />
        <StatCard label="결재 진행 중" value={data.myApprovalStatus.pending} color="yellow" link="/sales/approvals" />
        <StatCard label="이번달 승인" value={data.myApprovalStatus.approved} color="green" link="/sales/approvals?status=APPROVED" />
        <StatCard label="반려" value={data.myApprovalStatus.rejected} color="red" link="/sales/approvals?status=REJECTED" />
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-2">💰 이번달 내 매출</h3>
          <p className="text-3xl font-bold text-emerald-600">{fmtMoney(data.thisMonthSales)}원</p>
          <p className="text-xs text-gray-500 mt-1">SalesLedger 기준 (매출장 담당자명 일치)</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-2">🎯 이번달 승인 건수</h3>
          <p className="text-3xl font-bold text-blue-600">{data.thisMonthApprovedCount}건</p>
          <p className="text-xs text-gray-500 mt-1">내가 작성한 품의서 중 이번달 APPROVED</p>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold mb-3">⏳ 내 결재 진행 중 품의서</h3>
          <ItemList
            items={data.myPendingApprovals}
            empty="결재 진행 중인 품의서가 없습니다"
            render={(a) => ({
              href: `/sales/approvals/${a.id}`,
              title: a.approvalNumber,
              sub: a.clientCompany || '거래처 미지정',
              amount: a.totalSalesAmount,
              status: a.status,
            })}
          />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold mb-3">🔴 최근 반려된 품의서</h3>
          {data.recentRejected.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">반려된 품의서가 없습니다</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {data.recentRejected.map((r) => (
                <li key={r.id} className="py-2">
                  <Link href={`/sales/approvals/${r.id}`} className="block hover:bg-gray-50 rounded px-1">
                    <p className="text-sm font-medium">{r.approvalNumber}</p>
                    <p className="text-xs text-gray-500">{fmtDate(r.rejectedAt)}{r.rejectionReason ? ` · ${r.rejectionReason}` : ''}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <CommonPanel common={data.common} />
    </div>
  )
}

// ─────────────────────────────────────────
// 경영팀 뷰
// ─────────────────────────────────────────
function FinanceView({ data }: { data: FinanceDashboardData }) {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">대시보드 · 경영팀</h1>
        <p className="text-sm text-gray-500 mt-1">계산서 발행 현황 및 입출금 관리</p>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="매출 발행 대기" value={data.pendingInvoices.sales} color="blue" link="/management/invoice-status?invoiceStatus=PENDING&invoiceType=SALES" />
        <StatCard label="매입 발행 대기" value={data.pendingInvoices.purchase} color="purple" link="/management/invoice-status?invoiceStatus=PENDING&invoiceType=PURCHASE" />
        <StatCard label="수정 필요" value={data.needsAmendment} color="yellow" link="/management/invoice-status?invoiceStatus=NEEDS_AMENDMENT" />
        <StatCard label="연체 합계" value={data.overdue.salesCount + data.overdue.purchaseCount} color="red" />
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-2">💸 외상매출금</h3>
          <p className="text-3xl font-bold text-orange-600">{fmtMoney(data.receivables)}원</p>
          <p className="text-xs text-gray-500 mt-1">PENDING 상태 매출 원장 + MABilling 합계</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-2">🔴 연체 건수</h3>
          <p className="text-lg text-gray-700">
            매출 <span className="font-bold text-red-600">{data.overdue.salesCount}</span>건 ·
            매입 <span className="font-bold text-red-600 ml-1">{data.overdue.purchaseCount}</span>건
          </p>
          <p className="text-xs text-gray-500 mt-1">paymentDueDate 경과 · paymentDate 미입력</p>
        </div>
      </section>

      <section className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold mb-3">📅 이번달 MA 청구 예정</h3>
        {data.thisMonthMABilling.length === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center">이번달 MA 청구가 없습니다</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-gray-500 border-b">
                <tr>
                  <th className="text-left py-2 px-2">청구일</th>
                  <th className="text-left px-2">매출처</th>
                  <th className="text-left px-2">품목</th>
                  <th className="text-right px-2">매출</th>
                  <th className="text-right px-2">매입</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.thisMonthMABilling.map((b) => (
                  <tr key={b.id} className="hover:bg-gray-50">
                    <td className="py-2 px-2">{fmtDate(b.dueDate)}</td>
                    <td className="px-2">{b.clientCompany}</td>
                    <td className="px-2">{b.itemName}</td>
                    <td className="px-2 text-right text-emerald-600">{fmtMoney(b.salesTotalAmount)}</td>
                    <td className="px-2 text-right text-purple-600">{fmtMoney(b.purchaseTotalAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <CommonPanel common={data.common} />
    </div>
  )
}

// ─────────────────────────────────────────
// CEO 뷰
// ─────────────────────────────────────────
function CeoView({ data }: { data: CeoDashboardData }) {
  const maxMonthly = Math.max(1, ...data.monthlyTrend.map((m) => m.sales))

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">대시보드 · 경영진</h1>
        <p className="text-sm text-gray-500 mt-1">{data.yearSummary.year}년 연간 지표</p>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="총 매출" value={fmtMoney(data.yearSummary.totalSales)} unit="원" color="emerald" />
        <StatCard label="총 매입" value={fmtMoney(data.yearSummary.totalPurchase)} unit="원" color="purple" />
        <StatCard label="매출총이익" value={fmtMoney(data.yearSummary.grossProfit)} unit="원" color="blue" />
        <StatCard label="GP율" value={data.yearSummary.gpRate} unit="%" color="yellow" />
      </section>

      <section className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold mb-3">📈 월별 매출 추이</h3>
        <div className="flex items-end gap-2 h-40">
          {data.monthlyTrend.map((m) => (
            <div key={m.month} className="flex-1 flex flex-col items-center">
              <div
                className="w-full bg-blue-500 rounded-t"
                style={{ height: `${(m.sales / maxMonthly) * 100}%` }}
                title={`${m.month}월: ${fmtMoney(m.sales)}원`}
              />
              <span className="text-[10px] text-gray-500 mt-1">{m.month}월</span>
            </div>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold mb-3">🏆 담당자별 매출 순위</h3>
          {data.byManager.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">데이터 없음</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {data.byManager.map((r, i) => (
                <li key={r.managerName} className="flex items-center justify-between py-2">
                  <span className="text-sm">
                    <span className="text-gray-400 mr-2">{i + 1}.</span>
                    {r.managerName}
                  </span>
                  <span className="text-sm font-medium">{fmtMoney(r.totalAmount)}원</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold mb-3">🎖️ 거래처별 매출 순위</h3>
          {data.byClient.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">데이터 없음</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {data.byClient.map((r, i) => (
                <li key={r.clientCompany} className="flex items-center justify-between py-2">
                  <span className="text-sm">
                    <span className="text-gray-400 mr-2">{i + 1}.</span>
                    {r.clientCompany}
                  </span>
                  <span className="text-sm font-medium">{fmtMoney(r.totalAmount)}원</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold mb-3">⏳ 내 결재 대기 품의서 (CEO 최종 결재)</h3>
        {data.myPendingApprovals.length === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center">결재 대기 중인 품의서가 없습니다</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {data.myPendingApprovals.map((a) => (
              <li key={`${a.source}-${a.id}`} className="py-2">
                <Link
                  href={a.source === 'MA' ? `/ma/approvals/${a.id}` : `/sales/approvals/${a.id}`}
                  className="flex items-center justify-between hover:bg-gray-50 rounded px-1"
                >
                  <div>
                    <p className="text-sm font-medium">
                      <span className="text-xs text-gray-400 mr-1">[{a.source}]</span>
                      {a.approvalNumber}
                    </p>
                    <p className="text-xs text-gray-500">{a.clientCompany || '거래처 미지정'}</p>
                  </div>
                  <span className="text-sm font-medium">{fmtMoney(a.totalSalesAmount)}원</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <CommonPanel common={data.common} />
    </div>
  )
}

// ─────────────────────────────────────────
// 공통 컴포넌트
// ─────────────────────────────────────────
interface StatCardProps {
  label: string
  value: string | number
  unit?: string
  color: 'gray' | 'yellow' | 'green' | 'red' | 'blue' | 'purple' | 'emerald'
  link?: string
}
function StatCard({ label, value, unit, color, link }: StatCardProps) {
  const colorMap: Record<string, string> = {
    gray: 'bg-gray-50 border-gray-200 text-gray-700',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
  }
  const inner = (
    <div className={`p-5 rounded-xl border ${colorMap[color]} ${link ? 'hover:shadow-sm transition' : ''}`}>
      <p className="text-xs font-medium opacity-80">{label}</p>
      <p className="text-2xl font-bold mt-1">
        {value}
        {unit && <span className="text-xs font-normal ml-1 opacity-70">{unit}</span>}
      </p>
    </div>
  )
  return link ? <Link href={link}>{inner}</Link> : inner
}

interface ItemListItem {
  href: string
  title: string
  sub: string
  amount: number
  status: string
}
function ItemList<T>({
  items,
  empty,
  render,
}: {
  items: T[]
  empty: string
  render: (item: T) => ItemListItem
}) {
  if (items.length === 0) {
    return <p className="text-sm text-gray-500 py-4 text-center">{empty}</p>
  }
  return (
    <ul className="divide-y divide-gray-100">
      {items.map((item, i) => {
        const r = render(item)
        return (
          <li key={i} className="py-2">
            <Link href={r.href} className="flex items-center justify-between hover:bg-gray-50 rounded px-1">
              <div>
                <p className="text-sm font-medium">{r.title}</p>
                <p className="text-xs text-gray-500">{r.sub}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">{fmtMoney(r.amount)}원</p>
                <span className={`inline-block px-2 py-0.5 text-xs rounded-full ${statusLabels[r.status]?.color || 'bg-gray-100'}`}>
                  {statusLabels[r.status]?.label || r.status}
                </span>
              </div>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

// ─────────────────────────────────────────
// Main
// ─────────────────────────────────────────
export function DashboardPageClient({ initialData }: DashboardPageClientProps) {
  const data = initialData.data

  if (data.role === 'ADMIN') return <CeoView data={data} />
  if (data.role === 'FINANCE') return <FinanceView data={data} />
  return <SalesView data={data} />
}
