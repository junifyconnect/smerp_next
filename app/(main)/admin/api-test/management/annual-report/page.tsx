'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function AnnualReportTestPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<Record<string, unknown> | null>(null)

  const [year, setYear] = useState(new Date().getFullYear())

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
          <h1 className="text-2xl font-bold text-gray-900">연 마감 통계 테스트</h1>
          <p className="text-gray-500 mt-1">연간 매출/매입/GP 통계</p>
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

        <div className="flex items-end gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">년도</label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <button
            onClick={() => callApi(`/api/management/stats/annual-report?year=${year}`)}
            disabled={loading}
            className="px-6 py-2 bg-indigo-500 text-white rounded-lg text-sm hover:bg-indigo-600 disabled:opacity-50"
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
              {/* 연간 요약 */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">{result.year as number}년 연간 요약</h3>
                <div className="grid grid-cols-4 gap-6">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="text-sm text-blue-600 mb-1">총 매출</div>
                    <div className="text-xl font-bold text-blue-700">
                      {formatNumber(((result.summary as Record<string, unknown>)?.totalSales as Record<string, unknown>)?.totalAmount as number || 0)}원
                    </div>
                    <div className="text-sm text-blue-500 mt-1">
                      공급가: {formatNumber(((result.summary as Record<string, unknown>)?.totalSales as Record<string, unknown>)?.supplyAmount as number || 0)}원
                    </div>
                    <div className="text-xs text-blue-400 mt-1">
                      {((result.summary as Record<string, unknown>)?.totalSales as Record<string, unknown>)?.count as number || 0}건
                    </div>
                  </div>
                  <div className="p-4 bg-red-50 rounded-lg">
                    <div className="text-sm text-red-600 mb-1">총 매입</div>
                    <div className="text-xl font-bold text-red-700">
                      {formatNumber(((result.summary as Record<string, unknown>)?.totalPurchase as Record<string, unknown>)?.totalAmount as number || 0)}원
                    </div>
                    <div className="text-sm text-red-500 mt-1">
                      공급가: {formatNumber(((result.summary as Record<string, unknown>)?.totalPurchase as Record<string, unknown>)?.supplyAmount as number || 0)}원
                    </div>
                    <div className="text-xs text-red-400 mt-1">
                      {((result.summary as Record<string, unknown>)?.totalPurchase as Record<string, unknown>)?.count as number || 0}건
                    </div>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="text-sm text-green-600 mb-1">총 GP (이익)</div>
                    <div className="text-xl font-bold text-green-700">
                      {formatNumber((result.summary as Record<string, unknown>)?.grossProfit as number || 0)}원
                    </div>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <div className="text-sm text-purple-600 mb-1">GP율</div>
                    <div className="text-xl font-bold text-purple-700">
                      {(result.summary as Record<string, unknown>)?.gpRate as string || '0'}%
                    </div>
                  </div>
                </div>
              </div>

              {/* 월별 추이 */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">월별 매출/매입 추이</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-center">월</th>
                        <th className="px-3 py-2 text-right">매출(공급가)</th>
                        <th className="px-3 py-2 text-right">매출(건수)</th>
                        <th className="px-3 py-2 text-right">매입(공급가)</th>
                        <th className="px-3 py-2 text-right">매입(건수)</th>
                        <th className="px-3 py-2 text-right">GP</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(result.monthly as Record<string, unknown>[])?.map((item) => (
                        <tr key={item.month as number} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-center font-medium">{item.month as number}월</td>
                          <td className="px-3 py-2 text-right text-blue-600">
                            {formatNumber((item.sales as Record<string, unknown>)?.supplyAmount as number)}원
                          </td>
                          <td className="px-3 py-2 text-right text-gray-500">
                            {(item.sales as Record<string, unknown>)?.count as number}건
                          </td>
                          <td className="px-3 py-2 text-right text-red-600">
                            {formatNumber((item.purchase as Record<string, unknown>)?.supplyAmount as number)}원
                          </td>
                          <td className="px-3 py-2 text-right text-gray-500">
                            {(item.purchase as Record<string, unknown>)?.count as number}건
                          </td>
                          <td className="px-3 py-2 text-right text-green-600 font-medium">
                            {formatNumber((item.sales as Record<string, unknown>)?.grossProfit as number)}원
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 구분별 매출/매입 */}
              <div className="grid grid-cols-2 gap-6">
                {/* 구분별 매출 */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">구분별 매출</h3>
                  {((result.byCategory as Record<string, unknown>)?.sales as unknown[])?.length > 0 ? (
                    <div className="space-y-3">
                      {((result.byCategory as Record<string, unknown>)?.sales as Record<string, unknown>[]).map((item, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <span className="font-medium">{item.category as string || '(미분류)'}</span>
                            <span className="text-sm text-gray-400 ml-2">{item.count as number}건</span>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-blue-600">
                              {formatNumber(item.totalAmount as number)}원
                            </div>
                            <div className="text-xs text-green-600">
                              GP: {formatNumber(item.grossProfit as number)}원
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-gray-400 text-center py-4">데이터 없음</div>
                  )}
                </div>

                {/* 구분별 매입 */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">구분별 매입</h3>
                  {((result.byCategory as Record<string, unknown>)?.purchase as unknown[])?.length > 0 ? (
                    <div className="space-y-3">
                      {((result.byCategory as Record<string, unknown>)?.purchase as Record<string, unknown>[]).map((item, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <span className="font-medium">{item.category as string || '(미분류)'}</span>
                            <span className="text-sm text-gray-400 ml-2">{item.count as number}건</span>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-red-600">
                              {formatNumber(item.totalAmount as number)}원
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-gray-400 text-center py-4">데이터 없음</div>
                  )}
                </div>
              </div>

              {/* 담당자별 매출 */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">담당자별 매출</h3>
                {((result.byManager as unknown[])?.length > 0) ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left">담당자</th>
                          <th className="px-3 py-2 text-right">공급가액</th>
                          <th className="px-3 py-2 text-right">총금액</th>
                          <th className="px-3 py-2 text-right">GP</th>
                          <th className="px-3 py-2 text-right">건수</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {(result.byManager as Record<string, unknown>[]).map((item, i) => (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="px-3 py-2 font-medium">{item.managerName as string}</td>
                            <td className="px-3 py-2 text-right">
                              {formatNumber(item.supplyAmount as number)}원
                            </td>
                            <td className="px-3 py-2 text-right text-blue-600 font-medium">
                              {formatNumber(item.totalAmount as number)}원
                            </td>
                            <td className="px-3 py-2 text-right text-green-600">
                              {formatNumber(item.grossProfit as number)}원
                            </td>
                            <td className="px-3 py-2 text-right">{item.count as number}건</td>
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
