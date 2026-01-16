'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function MonthlyForecastTestPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<Record<string, unknown> | null>(null)

  const [filter, setFilter] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
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
          <h1 className="text-2xl font-bold text-gray-900">월말 입출금 예정 테스트</h1>
          <p className="text-gray-500 mt-1">외상매출금 입금예정 / 외상매입금 출금예정</p>
        </div>
        <Link
          href="/admin/api-test"
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
        >
          ← 목록으로
        </Link>
      </div>

      {/* 조회 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">조회 조건</h3>

        <div className="flex items-end gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">년도</label>
            <input
              type="number"
              value={filter.year}
              onChange={(e) => setFilter({ ...filter, year: parseInt(e.target.value) })}
              className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">월</label>
            <select
              value={filter.month}
              onChange={(e) => setFilter({ ...filter, month: parseInt(e.target.value) })}
              className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                <option key={m} value={m}>{m}월</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => callApi(`/api/management/stats/monthly-forecast?year=${filter.year}&month=${filter.month}`)}
            disabled={loading}
            className="px-6 py-2 bg-amber-500 text-white rounded-lg text-sm hover:bg-amber-600 disabled:opacity-50"
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
                  <div className="text-sm text-gray-500 mb-1">입금 예정 (외상매출금)</div>
                  <div className="text-2xl font-bold text-green-600">
                    {formatNumber((result.receivables as Record<string, unknown>)?.total as number || 0)}원
                  </div>
                  <div className="text-sm text-gray-400 mt-1">
                    {(result.receivables as Record<string, unknown>)?.count as number || 0}건
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="text-sm text-gray-500 mb-1">출금 예정 (외상매입금)</div>
                  <div className="text-2xl font-bold text-red-600">
                    {formatNumber((result.payables as Record<string, unknown>)?.total as number || 0)}원
                  </div>
                  <div className="text-sm text-gray-400 mt-1">
                    {(result.payables as Record<string, unknown>)?.count as number || 0}건
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="text-sm text-gray-500 mb-1">순 현금흐름</div>
                  <div className={`text-2xl font-bold ${(result.netCashFlow as number) >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                    {(result.netCashFlow as number) >= 0 ? '+' : ''}{formatNumber(result.netCashFlow as number)}원
                  </div>
                  <div className="text-sm text-gray-400 mt-1">
                    {(result.period as Record<string, unknown>)?.year as number}년 {(result.period as Record<string, unknown>)?.month as number}월
                  </div>
                </div>
              </div>

              {/* 입금 예정 - 업체별 */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">입금 예정 (업체별)</h3>
                {((result.receivables as Record<string, unknown>)?.byCompany as unknown[])?.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left">매출처</th>
                          <th className="px-3 py-2 text-right">금액</th>
                          <th className="px-3 py-2 text-right">건수</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {((result.receivables as Record<string, unknown>)?.byCompany as Record<string, unknown>[]).map((item, i) => (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="px-3 py-2">{item.clientCompany as string}</td>
                            <td className="px-3 py-2 text-right text-green-600 font-medium">
                              {formatNumber(item.totalAmount as number)}원
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

              {/* 출금 예정 - 업체별 */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">출금 예정 (업체별)</h3>
                {((result.payables as Record<string, unknown>)?.byCompany as unknown[])?.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left">매입처</th>
                          <th className="px-3 py-2 text-right">금액</th>
                          <th className="px-3 py-2 text-right">건수</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {((result.payables as Record<string, unknown>)?.byCompany as Record<string, unknown>[]).map((item, i) => (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="px-3 py-2">{item.vendorCompany as string}</td>
                            <td className="px-3 py-2 text-right text-red-600 font-medium">
                              {formatNumber(item.totalAmount as number)}원
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
