'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function CompanyRankTestPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<Record<string, unknown> | null>(null)

  const [filter, setFilter] = useState({
    type: 'sales',
    startDate: `${new Date().getFullYear()}-01-01`,
    endDate: `${new Date().getFullYear()}-12-31`,
    limit: '20',
  })

  const callApi = async (url: string) => {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch(url)
      const data = await res.json()
      setResult(data)
    } catch (error) {
      setResult({ error: String(error) })
    } finally {
      setLoading(false)
    }
  }

  const formatNumber = (num: number | string) => {
    return Number(num).toLocaleString()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">거래처 순위 테스트</h1>
          <p className="text-gray-500 mt-1">매출처/매입처 순위 조회</p>
        </div>
        <Link
          href="/admin/api-test"
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
        >
          ← 목록으로
        </Link>
      </div>

      {/* 조회 조건 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">조회 조건</h3>

        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">유형</label>
            <select
              value={filter.type}
              onChange={(e) => setFilter({ ...filter, type: e.target.value })}
              className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="sales">매출처</option>
              <option value="purchase">매입처</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">시작일</label>
            <input
              type="date"
              value={filter.startDate}
              onChange={(e) => setFilter({ ...filter, startDate: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">종료일</label>
            <input
              type="date"
              value={filter.endDate}
              onChange={(e) => setFilter({ ...filter, endDate: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">표시 개수</label>
            <select
              value={filter.limit}
              onChange={(e) => setFilter({ ...filter, limit: e.target.value })}
              className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="10">10개</option>
              <option value="20">20개</option>
              <option value="50">50개</option>
              <option value="100">100개</option>
            </select>
          </div>
          <button
            onClick={() => callApi(`/api/management/stats/company-rank?type=${filter.type}&startDate=${filter.startDate}&endDate=${filter.endDate}&limit=${filter.limit}`)}
            disabled={loading}
            className="px-6 py-2 bg-purple-500 text-white rounded-lg text-sm hover:bg-purple-600 disabled:opacity-50"
          >
            {loading ? '조회중...' : '조회'}
          </button>
        </div>
      </div>

      {/* 결과 */}
      {result && (
        <div className="space-y-6">
          {result.error ? (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="text-red-600">{String(result.error)}</div>
            </div>
          ) : (
            <>
              {/* 요약 */}
              <div className="grid grid-cols-3 gap-6">
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="text-sm text-gray-500 mb-1">조회 유형</div>
                  <div className="text-xl font-bold text-gray-900">
                    {result.type === 'sales' ? '매출처 순위' : '매입처 순위'}
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="text-sm text-gray-500 mb-1">조회 기간</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {(result.period as Record<string, unknown>)?.startDate as string} ~ {(result.period as Record<string, unknown>)?.endDate as string}
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="text-sm text-gray-500 mb-1">총 거래금액</div>
                  <div className="text-xl font-bold text-blue-600">
                    {formatNumber((result.total as Record<string, unknown>)?.totalAmount as number || 0)}원
                  </div>
                  <div className="text-sm text-gray-400 mt-1">
                    {(result.total as Record<string, unknown>)?.transactionCount as number || 0}건
                  </div>
                </div>
              </div>

              {/* 순위 테이블 */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">
                  {result.type === 'sales' ? '매출처' : '매입처'} 순위
                </h3>
                {((result.ranking as unknown[])?.length > 0) ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-center w-16">순위</th>
                          <th className="px-3 py-2 text-left">
                            {result.type === 'sales' ? '매출처' : '매입처'}
                          </th>
                          <th className="px-3 py-2 text-right">공급가액</th>
                          <th className="px-3 py-2 text-right">총금액</th>
                          {result.type === 'sales' && (
                            <th className="px-3 py-2 text-right">GP</th>
                          )}
                          <th className="px-3 py-2 text-right">건수</th>
                          <th className="px-3 py-2 text-right">점유율</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {(result.ranking as Record<string, unknown>[]).map((item) => (
                          <tr key={item.rank as number} className="hover:bg-gray-50">
                            <td className="px-3 py-2 text-center">
                              <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold ${
                                (item.rank as number) === 1 ? 'bg-yellow-100 text-yellow-700' :
                                (item.rank as number) === 2 ? 'bg-gray-100 text-gray-700' :
                                (item.rank as number) === 3 ? 'bg-amber-100 text-amber-700' :
                                'bg-gray-50 text-gray-600'
                              }`}>
                                {item.rank as number}
                              </span>
                            </td>
                            <td className="px-3 py-2 font-medium">
                              {result.type === 'sales'
                                ? item.clientCompany as string
                                : item.vendorCompany as string}
                            </td>
                            <td className="px-3 py-2 text-right">
                              {formatNumber(item.supplyAmount as number)}원
                            </td>
                            <td className="px-3 py-2 text-right font-semibold text-blue-600">
                              {formatNumber(item.totalAmount as number)}원
                            </td>
                            {result.type === 'sales' && (
                              <td className="px-3 py-2 text-right text-green-600">
                                {formatNumber(item.grossProfit as number)}원
                              </td>
                            )}
                            <td className="px-3 py-2 text-right">{item.transactionCount as number}건</td>
                            <td className="px-3 py-2 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-blue-500 rounded-full"
                                    style={{ width: `${Math.min(parseFloat(item.sharePercent as string), 100)}%` }}
                                  />
                                </div>
                                <span className="text-gray-600">{item.sharePercent as string}%</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-gray-400 text-center py-4">데이터 없음</div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
