'use client'

import { useState } from 'react'
import Link from 'next/link'

interface Slide {
  id: number
  title: string
  subtitle?: string
  type: 'title' | 'content' | 'feature' | 'flow' | 'demo'
  content: React.ReactNode
}

export default function ProcessDemoPage() {
  const [currentSlide, setCurrentSlide] = useState(0)

  const slides: Slide[] = [
    // 슬라이드 1: 타이틀
    {
      id: 1,
      title: '영업 문서 처리 프로세스',
      subtitle: 'SMERP 실무 데모',
      type: 'title',
      content: (
        <div className="flex flex-col items-center justify-center h-full text-center">
          <div className="text-6xl mb-8">📋</div>
          <h1 className="text-5xl font-bold text-gray-900 mb-4">영업 문서 처리 프로세스</h1>
          <p className="text-2xl text-gray-500 mb-8">견적서부터 매출 관리까지</p>
          <div className="flex items-center gap-2 text-lg text-indigo-600">
            <span className="animate-pulse">▶</span>
            <span>화살표 키 또는 하단 버튼으로 이동</span>
          </div>
        </div>
      ),
    },

    // 슬라이드 2: 전체 흐름 개요
    {
      id: 2,
      title: '전체 업무 흐름',
      type: 'flow',
      content: (
        <div className="h-full flex flex-col">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">전체 업무 흐름</h2>
          <div className="flex-1 flex items-center justify-center">
            <div className="flex items-center gap-4">
              {[
                { icon: '📋', label: '견적서', sub: '고객 제시', color: 'bg-blue-100 border-blue-300' },
                { icon: '→', label: '', sub: '', color: '' },
                { icon: '⭐', label: '품의서', sub: '내부 승인', color: 'bg-purple-100 border-purple-300' },
                { icon: '→', label: '', sub: '', color: '' },
                { icon: '📦', label: '발주서', sub: '협력사 발주', color: 'bg-orange-100 border-orange-300' },
                { icon: '→', label: '', sub: '', color: '' },
                { icon: '🧾', label: '계산서', sub: '세금계산서', color: 'bg-rose-100 border-rose-300' },
                { icon: '→', label: '', sub: '', color: '' },
                { icon: '📊', label: '매출장', sub: '실적 관리', color: 'bg-emerald-100 border-emerald-300' },
              ].map((item, i) =>
                item.icon === '→' ? (
                  <div key={i} className="text-4xl text-gray-300">→</div>
                ) : (
                  <div key={i} className={`${item.color} border-2 rounded-2xl p-6 text-center min-w-[140px]`}>
                    <div className="text-4xl mb-2">{item.icon}</div>
                    <div className="font-bold text-lg">{item.label}</div>
                    <div className="text-sm text-gray-500">{item.sub}</div>
                  </div>
                )
              )}
            </div>
          </div>
          <div className="text-center text-gray-500 mt-4">
            각 단계별로 데이터가 자동으로 연동됩니다
          </div>
        </div>
      ),
    },

    // 슬라이드 3: 견적서 생성
    {
      id: 3,
      title: 'STEP 1. 견적서 작성',
      type: 'feature',
      content: (
        <div className="h-full flex flex-col">
          <div className="flex items-center gap-4 mb-6">
            <span className="px-4 py-2 bg-blue-600 text-white rounded-full font-bold">STEP 1</span>
            <h2 className="text-3xl font-bold text-gray-900">견적서 작성</h2>
          </div>

          <div className="flex-1 grid grid-cols-2 gap-8">
            {/* 좌측: 설명 */}
            <div className="space-y-6">
              <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                <h3 className="font-bold text-blue-900 text-xl mb-4">주요 기능</h3>
                <ul className="space-y-3">
                  {[
                    '고객 정보 입력 (회사명, 담당자, 연락처)',
                    '품목별 단가/수량 입력',
                    '금액 자동 계산 (VAT 포함)',
                    '문서번호 자동 생성 (SQ-2025-0001)',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="text-blue-500 mt-1">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-gray-50 rounded-xl p-6 border">
                <h3 className="font-bold text-gray-900 text-lg mb-3">입력 방식</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white rounded-lg p-4 border text-center">
                    <div className="text-3xl mb-2">⌨️</div>
                    <div className="font-medium">직접 입력</div>
                  </div>
                  <div className="bg-white rounded-lg p-4 border text-center">
                    <div className="text-3xl mb-2">📊</div>
                    <div className="font-medium">엑셀 업로드</div>
                  </div>
                </div>
              </div>
            </div>

            {/* 우측: 미리보기 */}
            <div className="bg-white rounded-xl border-2 border-gray-200 p-6 shadow-lg">
              <div className="text-sm text-gray-400 mb-4">견적서 미리보기</div>
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-3 border-b">
                  <span className="font-bold text-lg">견 적 서</span>
                  <span className="text-sm text-gray-500">SQ-2025-0042</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-500">수신</div>
                    <div className="font-medium">(주)ABC테크</div>
                  </div>
                  <div>
                    <div className="text-gray-500">담당자</div>
                    <div className="font-medium">김철수 과장</div>
                  </div>
                </div>
                <table className="w-full text-sm border-t">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-2 text-left">품목</th>
                      <th className="p-2 text-right">수량</th>
                      <th className="p-2 text-right">단가</th>
                      <th className="p-2 text-right">금액</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t">
                      <td className="p-2">서버 장비</td>
                      <td className="p-2 text-right">2</td>
                      <td className="p-2 text-right">5,000,000</td>
                      <td className="p-2 text-right">10,000,000</td>
                    </tr>
                    <tr className="border-t">
                      <td className="p-2">설치비</td>
                      <td className="p-2 text-right">1</td>
                      <td className="p-2 text-right">500,000</td>
                      <td className="p-2 text-right">500,000</td>
                    </tr>
                  </tbody>
                  <tfoot className="bg-blue-50 font-bold">
                    <tr className="border-t-2">
                      <td colSpan={3} className="p-2 text-right">합계</td>
                      <td className="p-2 text-right text-blue-700">10,500,000</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        </div>
      ),
    },

    // 슬라이드 4: 엑셀 연동
    {
      id: 4,
      title: '엑셀 연동 기능',
      type: 'feature',
      content: (
        <div className="h-full flex flex-col">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">엑셀 연동 기능</h2>

          <div className="flex-1 grid grid-cols-2 gap-8">
            {/* 업로드 */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-8 border-2 border-green-200">
              <div className="text-center mb-6">
                <div className="text-6xl mb-4">📤</div>
                <h3 className="text-2xl font-bold text-green-900">엑셀 업로드</h3>
              </div>
              <div className="space-y-4">
                <div className="bg-white rounded-lg p-4 flex items-center gap-4">
                  <span className="text-2xl">1️⃣</span>
                  <span>기존 엑셀 파일 선택</span>
                </div>
                <div className="bg-white rounded-lg p-4 flex items-center gap-4">
                  <span className="text-2xl">2️⃣</span>
                  <span>자동 데이터 파싱</span>
                </div>
                <div className="bg-white rounded-lg p-4 flex items-center gap-4">
                  <span className="text-2xl">3️⃣</span>
                  <span>DB 저장 완료</span>
                </div>
              </div>
              <div className="mt-6 text-center text-sm text-green-700">
                기존 엑셀 양식 그대로 사용 가능
              </div>
            </div>

            {/* 다운로드 */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 border-2 border-blue-200">
              <div className="text-center mb-6">
                <div className="text-6xl mb-4">📥</div>
                <h3 className="text-2xl font-bold text-blue-900">엑셀 다운로드</h3>
              </div>
              <div className="space-y-4">
                <div className="bg-white rounded-lg p-4 flex items-center gap-4">
                  <span className="text-2xl">1️⃣</span>
                  <span>문서 선택</span>
                </div>
                <div className="bg-white rounded-lg p-4 flex items-center gap-4">
                  <span className="text-2xl">2️⃣</span>
                  <span>회사 양식으로 변환</span>
                </div>
                <div className="bg-white rounded-lg p-4 flex items-center gap-4">
                  <span className="text-2xl">3️⃣</span>
                  <span>엑셀 파일 다운로드</span>
                </div>
              </div>
              <div className="mt-6 text-center text-sm text-blue-700">
                회사 로고, 양식이 적용된 엑셀 출력
              </div>
            </div>
          </div>
        </div>
      ),
    },

    // 슬라이드 5: 품의서 전환
    {
      id: 5,
      title: 'STEP 2. 품의서 전환',
      type: 'feature',
      content: (
        <div className="h-full flex flex-col">
          <div className="flex items-center gap-4 mb-6">
            <span className="px-4 py-2 bg-purple-600 text-white rounded-full font-bold">STEP 2</span>
            <h2 className="text-3xl font-bold text-gray-900">품의서로 전환</h2>
          </div>

          <div className="flex-1 flex items-center justify-center">
            <div className="flex items-center gap-8">
              {/* 견적서 */}
              <div className="bg-blue-50 border-2 border-blue-300 rounded-2xl p-6 w-64 text-center">
                <div className="text-4xl mb-3">📋</div>
                <div className="font-bold text-lg text-blue-900">견적서</div>
                <div className="text-sm text-gray-500 mt-2">SQ-2025-0042</div>
                <div className="mt-4 text-sm bg-blue-100 rounded-lg p-2">
                  고객 승낙 완료
                </div>
              </div>

              {/* 화살표 */}
              <div className="flex flex-col items-center">
                <div className="text-5xl text-purple-500 animate-pulse">→</div>
                <button className="mt-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700">
                  품의서로 전환
                </button>
              </div>

              {/* 품의서 */}
              <div className="bg-purple-50 border-2 border-purple-300 rounded-2xl p-6 w-64">
                <div className="text-4xl mb-3 text-center">⭐</div>
                <div className="font-bold text-lg text-purple-900 text-center">품의서</div>
                <div className="text-sm text-gray-500 mt-2 text-center">SA-2025-0038</div>
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between bg-white rounded p-2">
                    <span className="text-gray-500">고객정보</span>
                    <span className="text-green-600">✓ 복사됨</span>
                  </div>
                  <div className="flex justify-between bg-white rounded p-2">
                    <span className="text-gray-500">품목정보</span>
                    <span className="text-green-600">✓ 복사됨</span>
                  </div>
                  <div className="flex justify-between bg-white rounded p-2">
                    <span className="text-gray-500">매입정보</span>
                    <span className="text-amber-600">입력 필요</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 rounded-xl p-4 border border-amber-200 text-center">
            <span className="text-amber-700">
              💡 견적서의 모든 정보가 자동으로 복사되며, 매입 정보만 추가하면 됩니다
            </span>
          </div>
        </div>
      ),
    },

    // 슬라이드 6: 품의서 구조
    {
      id: 6,
      title: '품의서 상세 구조',
      type: 'feature',
      content: (
        <div className="h-full flex flex-col">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">품의서 = 매출 + 매입 통합 관리</h2>

          <div className="flex-1 grid grid-cols-3 gap-6">
            {/* 매출 품목 */}
            <div className="bg-blue-50 rounded-xl p-5 border-2 border-blue-300">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <h3 className="font-bold text-blue-900 text-lg">매출 품목</h3>
              </div>
              <div className="space-y-3">
                <div className="bg-white rounded-lg p-3 border">
                  <div className="font-medium">서버 장비</div>
                  <div className="text-sm text-gray-500">2대 × 5,000,000원</div>
                  <div className="text-right text-blue-700 font-bold">10,000,000원</div>
                </div>
                <div className="bg-white rounded-lg p-3 border">
                  <div className="font-medium">설치 서비스</div>
                  <div className="text-sm text-gray-500">1식 × 500,000원</div>
                  <div className="text-right text-blue-700 font-bold">500,000원</div>
                </div>
                <div className="bg-blue-100 rounded-lg p-3 text-right">
                  <div className="text-sm text-gray-600">매출 합계</div>
                  <div className="text-xl font-bold text-blue-800">10,500,000원</div>
                </div>
              </div>
            </div>

            {/* 매입 품목 */}
            <div className="bg-purple-50 rounded-xl p-5 border-2 border-purple-300">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                <h3 className="font-bold text-purple-900 text-lg">매입 품목</h3>
              </div>
              <div className="space-y-3">
                <div className="bg-white rounded-lg p-3 border">
                  <div className="font-medium">서버 장비</div>
                  <div className="text-xs text-purple-600">매입처: (주)테크솔루션</div>
                  <div className="text-sm text-gray-500">2대 × 4,200,000원</div>
                  <div className="text-right text-purple-700 font-bold">8,400,000원</div>
                </div>
                <div className="bg-white rounded-lg p-3 border">
                  <div className="font-medium">외주 설치</div>
                  <div className="text-xs text-purple-600">매입처: 협력사A</div>
                  <div className="text-sm text-gray-500">1식 × 200,000원</div>
                  <div className="text-right text-purple-700 font-bold">200,000원</div>
                </div>
                <div className="bg-purple-100 rounded-lg p-3 text-right">
                  <div className="text-sm text-gray-600">매입 합계</div>
                  <div className="text-xl font-bold text-purple-800">8,600,000원</div>
                </div>
              </div>
            </div>

            {/* 마진 계산 */}
            <div className="bg-emerald-50 rounded-xl p-5 border-2 border-emerald-300">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                <h3 className="font-bold text-emerald-900 text-lg">마진 분석</h3>
              </div>
              <div className="space-y-4">
                <div className="bg-white rounded-lg p-4 border">
                  <div className="text-sm text-gray-500 mb-1">매출</div>
                  <div className="text-xl font-bold text-blue-700">10,500,000원</div>
                </div>
                <div className="bg-white rounded-lg p-4 border">
                  <div className="text-sm text-gray-500 mb-1">매입</div>
                  <div className="text-xl font-bold text-purple-700">- 8,600,000원</div>
                </div>
                <div className="h-px bg-emerald-300"></div>
                <div className="bg-emerald-100 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">순이익 (GP)</div>
                  <div className="text-2xl font-bold text-emerald-700">1,900,000원</div>
                  <div className="text-sm text-emerald-600 mt-1">마진율 18.1%</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
    },

    // 슬라이드 7: 3단계 결재
    {
      id: 7,
      title: 'STEP 3. 3단계 결재',
      type: 'feature',
      content: (
        <div className="h-full flex flex-col">
          <div className="flex items-center gap-4 mb-8">
            <span className="px-4 py-2 bg-amber-600 text-white rounded-full font-bold">STEP 3</span>
            <h2 className="text-3xl font-bold text-gray-900">3단계 전자결재</h2>
          </div>

          <div className="flex-1 flex items-center justify-center">
            <div className="flex items-center gap-6">
              {/* 1단계 */}
              <div className="bg-white rounded-2xl p-6 border-2 border-green-400 w-56 text-center shadow-lg">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">1</span>
                </div>
                <div className="font-bold text-lg mb-2">영업담당</div>
                <div className="text-sm text-gray-500 mb-4">작성자 서명</div>
                <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                  <img src="/api/placeholder/80/40" alt="서명" className="mx-auto opacity-50" />
                  <div className="text-xs text-green-600 mt-2">✓ 서명 완료</div>
                </div>
              </div>

              <div className="text-4xl text-green-500">→</div>

              {/* 2단계 */}
              <div className="bg-white rounded-2xl p-6 border-2 border-green-400 w-56 text-center shadow-lg">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">2</span>
                </div>
                <div className="font-bold text-lg mb-2">영업팀장</div>
                <div className="text-sm text-gray-500 mb-4">1차 승인</div>
                <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                  <img src="/api/placeholder/80/40" alt="서명" className="mx-auto opacity-50" />
                  <div className="text-xs text-green-600 mt-2">✓ 승인 완료</div>
                </div>
              </div>

              <div className="text-4xl text-amber-500 animate-pulse">→</div>

              {/* 3단계 */}
              <div className="bg-white rounded-2xl p-6 border-2 border-amber-400 w-56 text-center shadow-lg">
                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">3</span>
                </div>
                <div className="font-bold text-lg mb-2">대표이사</div>
                <div className="text-sm text-gray-500 mb-4">최종 승인</div>
                <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                  <div className="text-amber-600 font-medium">승인 대기중</div>
                  <button className="mt-2 px-4 py-1 bg-amber-500 text-white rounded text-sm">
                    서명하기
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="bg-green-50 rounded-xl p-4 border border-green-200 text-center">
              <span className="text-green-700">✓ 승인 시: 다음 단계로 자동 전달</span>
            </div>
            <div className="bg-red-50 rounded-xl p-4 border border-red-200 text-center">
              <span className="text-red-700">✗ 반려 시: 수정 후 재결재 가능</span>
            </div>
          </div>
        </div>
      ),
    },

    // 슬라이드 8: 발주서 자동 생성
    {
      id: 8,
      title: 'STEP 4. 발주서 자동 생성',
      type: 'feature',
      content: (
        <div className="h-full flex flex-col">
          <div className="flex items-center gap-4 mb-6">
            <span className="px-4 py-2 bg-orange-600 text-white rounded-full font-bold">STEP 4</span>
            <h2 className="text-3xl font-bold text-gray-900">발주서 자동 생성</h2>
          </div>

          <div className="flex-1 flex items-center justify-center">
            <div className="flex items-start gap-8">
              {/* 품의서 */}
              <div className="bg-purple-50 border-2 border-purple-300 rounded-2xl p-5 w-72">
                <div className="font-bold text-purple-900 mb-4 text-center">승인된 품의서</div>
                <div className="space-y-2 text-sm">
                  <div className="bg-white rounded p-2 border">
                    <div className="flex justify-between">
                      <span>서버 장비</span>
                      <span className="text-purple-600">(주)테크솔루션</span>
                    </div>
                  </div>
                  <div className="bg-white rounded p-2 border">
                    <div className="flex justify-between">
                      <span>외주 설치</span>
                      <span className="text-purple-600">협력사A</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 화살표 */}
              <div className="flex flex-col items-center justify-center h-full pt-16">
                <div className="text-4xl text-orange-500">→</div>
                <div className="text-sm text-gray-500 mt-2">매입처별 분리</div>
              </div>

              {/* 발주서들 */}
              <div className="space-y-4">
                <div className="bg-orange-50 border-2 border-orange-300 rounded-xl p-4 w-64">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-orange-600">SO-2025-0051</span>
                    <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded">발주서 1</span>
                  </div>
                  <div className="font-bold">(주)테크솔루션</div>
                  <div className="text-sm text-gray-500 mt-1">서버 장비 2대</div>
                  <div className="text-right font-bold text-orange-700 mt-2">8,400,000원</div>
                </div>

                <div className="bg-orange-50 border-2 border-orange-300 rounded-xl p-4 w-64">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-orange-600">SO-2025-0052</span>
                    <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded">발주서 2</span>
                  </div>
                  <div className="font-bold">협력사A</div>
                  <div className="text-sm text-gray-500 mt-1">외주 설치 1식</div>
                  <div className="text-right font-bold text-orange-700 mt-2">200,000원</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-orange-50 rounded-xl p-4 border border-orange-200 text-center">
            <span className="text-orange-700">
              💡 품의서의 매입 품목이 매입처별로 자동 분리되어 발주서가 생성됩니다
            </span>
          </div>
        </div>
      ),
    },

    // 슬라이드 9: 계산서 → 매출장
    {
      id: 9,
      title: 'STEP 5. 계산서 → 매출장',
      type: 'feature',
      content: (
        <div className="h-full flex flex-col">
          <div className="flex items-center gap-4 mb-6">
            <span className="px-4 py-2 bg-rose-600 text-white rounded-full font-bold">STEP 5</span>
            <h2 className="text-3xl font-bold text-gray-900">계산서 발행 → 매출장 자동 생성</h2>
          </div>

          <div className="flex-1 grid grid-cols-3 gap-6 items-center">
            {/* 품의서 승인 */}
            <div className="bg-green-50 border-2 border-green-300 rounded-xl p-5 text-center">
              <div className="text-4xl mb-3">⭐</div>
              <div className="font-bold text-green-900">품의서 승인</div>
              <div className="text-sm text-green-600 mt-2">APPROVED</div>
              <div className="mt-4 text-4xl">↓</div>
              <div className="mt-2 text-sm text-gray-500">계산서 발행현황에 등록</div>
            </div>

            {/* 계산서 발행 */}
            <div className="space-y-4">
              <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-4">
                <div className="font-bold text-blue-900 mb-2">🧾 매출 계산서 발행</div>
                <div className="text-sm text-gray-600">발행일: 2025-01-15</div>
                <div className="text-right text-blue-700 font-bold mt-2">10,500,000원</div>
                <div className="mt-3 flex justify-center">
                  <span className="text-2xl">↓</span>
                </div>
                <div className="text-center text-sm text-blue-600 mt-1">매출장 자동 생성</div>
              </div>

              <div className="bg-purple-50 border-2 border-purple-300 rounded-xl p-4">
                <div className="font-bold text-purple-900 mb-2">🧾 매입 계산서 수신</div>
                <div className="text-sm text-gray-600">수신일: 2025-01-14</div>
                <div className="text-right text-purple-700 font-bold mt-2">8,600,000원</div>
                <div className="mt-3 flex justify-center">
                  <span className="text-2xl">↓</span>
                </div>
                <div className="text-center text-sm text-purple-600 mt-1">매입장 자동 생성</div>
              </div>
            </div>

            {/* 대장 */}
            <div className="space-y-4">
              <div className="bg-emerald-50 border-2 border-emerald-400 rounded-xl p-4">
                <div className="font-bold text-emerald-900 mb-3">📊 매출장</div>
                <div className="text-sm space-y-1 bg-white rounded p-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">거래일</span>
                    <span>2025-01-15</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">매출처</span>
                    <span>(주)ABC테크</span>
                  </div>
                  <div className="flex justify-between font-bold text-emerald-700">
                    <span>금액</span>
                    <span>10,500,000원</span>
                  </div>
                </div>
              </div>

              <div className="bg-orange-50 border-2 border-orange-400 rounded-xl p-4">
                <div className="font-bold text-orange-900 mb-3">📊 매입장</div>
                <div className="text-sm space-y-1 bg-white rounded p-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">거래일</span>
                    <span>2025-01-14</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">매입처</span>
                    <span>(주)테크솔루션</span>
                  </div>
                  <div className="flex justify-between font-bold text-orange-700">
                    <span>금액</span>
                    <span>8,600,000원</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
    },

    // 슬라이드 10: 요약
    {
      id: 10,
      title: '정리',
      type: 'title',
      content: (
        <div className="h-full flex flex-col items-center justify-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-8">SMERP 핵심 가치</h2>

          <div className="grid grid-cols-3 gap-8 mb-12">
            <div className="bg-blue-50 rounded-2xl p-8 text-center border-2 border-blue-200">
              <div className="text-5xl mb-4">🔗</div>
              <div className="text-xl font-bold text-blue-900 mb-2">데이터 연동</div>
              <div className="text-gray-600">견적서 → 품의서 → 발주서<br/>한 번 입력으로 모든 문서 생성</div>
            </div>

            <div className="bg-purple-50 rounded-2xl p-8 text-center border-2 border-purple-200">
              <div className="text-5xl mb-4">⚡</div>
              <div className="text-xl font-bold text-purple-900 mb-2">업무 자동화</div>
              <div className="text-gray-600">금액 계산, 문서번호 생성<br/>매출장/매입장 자동 등록</div>
            </div>

            <div className="bg-emerald-50 rounded-2xl p-8 text-center border-2 border-emerald-200">
              <div className="text-5xl mb-4">📊</div>
              <div className="text-xl font-bold text-emerald-900 mb-2">실시간 현황</div>
              <div className="text-gray-600">매출/매입 추적<br/>마진 분석 및 통계</div>
            </div>
          </div>

          <Link
            href="/admin/api-test"
            className="px-8 py-4 bg-indigo-600 text-white text-xl rounded-xl hover:bg-indigo-700 transition flex items-center gap-3"
          >
            직접 테스트해보기
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      ),
    },
  ]

  const goToSlide = (index: number) => {
    if (index >= 0 && index < slides.length) {
      setCurrentSlide(index)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === ' ') {
      goToSlide(currentSlide + 1)
    } else if (e.key === 'ArrowLeft') {
      goToSlide(currentSlide - 1)
    }
  }

  return (
    <div
      className="h-screen bg-gray-100 flex flex-col"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* 슬라이드 영역 */}
      <div className="flex-1 p-6 overflow-hidden">
        <div className="bg-white rounded-2xl shadow-xl h-full p-8 overflow-auto">
          {slides[currentSlide].content}
        </div>
      </div>

      {/* 하단 네비게이션 */}
      <div className="bg-white border-t px-6 py-4">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          {/* 이전 버튼 */}
          <button
            onClick={() => goToSlide(currentSlide - 1)}
            disabled={currentSlide === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            이전
          </button>

          {/* 슬라이드 인디케이터 */}
          <div className="flex items-center gap-2">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`w-3 h-3 rounded-full transition-all ${
                  index === currentSlide
                    ? 'bg-indigo-600 w-8'
                    : 'bg-gray-300 hover:bg-gray-400'
                }`}
              />
            ))}
          </div>

          {/* 다음 버튼 */}
          <button
            onClick={() => goToSlide(currentSlide + 1)}
            disabled={currentSlide === slides.length - 1}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            다음
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* 페이지 표시 */}
        <div className="text-center text-sm text-gray-500 mt-2">
          {currentSlide + 1} / {slides.length}
        </div>
      </div>
    </div>
  )
}
