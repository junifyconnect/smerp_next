'use client'

export default function ProjectIntroPage() {
  return (
    <div className="space-y-8 p-6 max-w-5xl mx-auto">
      {/* 헤더 */}
      <div className="text-center py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">SMERP 프로젝트 소개</h1>
        <p className="text-gray-500">SM ERP 시스템 - 현재까지 구현된 기능 및 진행 상황</p>
      </div>

      {/* 프로젝트 개요 */}
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-200 p-8">
        <h2 className="text-xl font-bold text-indigo-900 mb-4">프로젝트 개요</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold text-gray-800 mb-2">목적</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              영업팀과 경영팀의 업무 프로세스를 디지털화하여 견적서부터 매출/매입 관리까지
              일관된 데이터 흐름으로 관리하는 통합 ERP 시스템
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-800 mb-2">기술 스택</h3>
            <div className="flex flex-wrap gap-2">
              {['Next.js 15', 'React 19', 'TypeScript', 'Prisma', 'PostgreSQL', 'Tailwind CSS', 'AWS S3'].map((tech) => (
                <span key={tech} className="px-2 py-1 bg-white rounded-full text-xs text-indigo-700 border border-indigo-200">
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 핵심 업무 흐름 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-6">핵심 업무 흐름</h2>

        <div className="flex items-center justify-between gap-4 overflow-x-auto pb-4">
          {/* Step 1 */}
          <div className="flex-shrink-0 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <span className="text-2xl">📋</span>
            </div>
            <div className="font-medium text-sm">견적서</div>
            <div className="text-xs text-gray-500">고객 제시 가격</div>
          </div>

          <div className="text-gray-300 text-2xl flex-shrink-0">→</div>

          {/* Step 2 */}
          <div className="flex-shrink-0 text-center">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <span className="text-2xl">⭐</span>
            </div>
            <div className="font-medium text-sm">품의서</div>
            <div className="text-xs text-gray-500">3단계 결재</div>
          </div>

          <div className="text-gray-300 text-2xl flex-shrink-0">→</div>

          {/* Step 3 */}
          <div className="flex-shrink-0 text-center">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <span className="text-2xl">📦</span>
            </div>
            <div className="font-medium text-sm">발주서</div>
            <div className="text-xs text-gray-500">협력사 발주</div>
          </div>

          <div className="text-gray-300 text-2xl flex-shrink-0">→</div>

          {/* Step 4 */}
          <div className="flex-shrink-0 text-center">
            <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <span className="text-2xl">🧾</span>
            </div>
            <div className="font-medium text-sm">계산서</div>
            <div className="text-xs text-gray-500">발행/수신 관리</div>
          </div>

          <div className="text-gray-300 text-2xl flex-shrink-0">→</div>

          {/* Step 5 */}
          <div className="flex-shrink-0 text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <span className="text-2xl">📊</span>
            </div>
            <div className="font-medium text-sm">매출/매입장</div>
            <div className="text-xs text-gray-500">자동 생성</div>
          </div>
        </div>
      </div>

      {/* 구현 완료된 기능 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-6">구현 완료된 기능</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 영업팀 */}
          <div className="border border-blue-200 rounded-xl p-5 bg-blue-50/50">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-6 bg-blue-500 rounded-full" />
              <h3 className="font-bold text-blue-900">영업팀</h3>
            </div>
            <div className="space-y-3">
              <FeatureItem
                title="견적서 관리"
                features={['생성/조회/수정', '엑셀 업로드/다운로드', '품의서 전환']}
                status="done"
              />
              <FeatureItem
                title="품의서 관리"
                features={['매출+매입 품목 관리', '3단계 서명 결재', '버전 관리', '엑셀 출력']}
                status="done"
              />
              <FeatureItem
                title="발주서 관리"
                features={['품의서 기반 자동 생성', '협력사별 발주', '엑셀 출력']}
                status="done"
              />
              <FeatureItem
                title="MA 견적서/품의서"
                features={['유지보수 계약 관리', '기간별 서비스']}
                status="done"
              />
            </div>
          </div>

          {/* 경영팀 */}
          <div className="border border-rose-200 rounded-xl p-5 bg-rose-50/50">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-6 bg-rose-500 rounded-full" />
              <h3 className="font-bold text-rose-900">경영팀</h3>
            </div>
            <div className="space-y-3">
              <FeatureItem
                title="계산서 발행현황"
                features={['승인된 품의서 연동', '매출/매입 계산서 추적']}
                status="done"
              />
              <FeatureItem
                title="매출장"
                features={['계산서 발행 시 자동 생성', '거래 내역 관리']}
                status="done"
              />
              <FeatureItem
                title="매입장"
                features={['계산서 수신 시 자동 생성', '거래 내역 관리']}
                status="done"
              />
              <FeatureItem
                title="통계/분석"
                features={['월말 입출금 예정', '거래처 순위', '연 마감 통계']}
                status="partial"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 공통 기능 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">공통 기능</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="font-medium text-gray-900 mb-2">사용자 관리</div>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• 회원가입/로그인</li>
              <li>• 서명 이미지 등록</li>
              <li>• 권한 관리</li>
            </ul>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="font-medium text-gray-900 mb-2">문서 자동화</div>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• 문서번호 자동생성</li>
              <li>• 금액 자동계산</li>
              <li>• 엑셀 파일 변환</li>
            </ul>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="font-medium text-gray-900 mb-2">클라우드 연동</div>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• AWS S3 파일 저장</li>
              <li>• 서명 이미지 관리</li>
              <li>• 원본 파일 보관</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 품의서 핵심 구조 */}
      <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border border-purple-200 p-6">
        <h2 className="text-lg font-bold text-purple-900 mb-4">품의서 - 시스템의 핵심</h2>
        <p className="text-sm text-gray-600 mb-4">
          품의서는 시스템의 중심으로, 매출과 매입 정보를 동시에 관리하며 대부분의 후속 문서(발주서, 계산서, 대장)가 품의서를 참조합니다.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4 border border-purple-200">
            <div className="font-medium text-purple-900 mb-2">매출 관리</div>
            <div className="text-sm text-gray-600">
              • 고객별 단가 관리<br/>
              • 품목별 상세 내역<br/>
              • VAT 자동 계산
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-purple-200">
            <div className="font-medium text-purple-900 mb-2">매입 관리</div>
            <div className="text-sm text-gray-600">
              • 협력사별 원가<br/>
              • 마진 자동 계산<br/>
              • 발주 정보 연동
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-purple-200">
            <div className="font-medium text-purple-900 mb-2">결재 프로세스</div>
            <div className="text-sm text-gray-600">
              • 영업담당 → 팀장 → CEO<br/>
              • 전자서명 지원<br/>
              • 반려/재작성 가능
            </div>
          </div>
        </div>
      </div>

      {/* 데이터 연동 */}
      <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-6">
        <h2 className="text-lg font-bold text-emerald-900 mb-4">자동 데이터 연동</h2>
        <div className="bg-white rounded-lg p-4 border border-emerald-200">
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3">
              <span className="w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
              <span className="text-gray-700">품의서 <span className="text-green-600 font-medium">승인완료</span> 시 → 계산서 발행현황에 자동 등록</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
              <span className="text-gray-700">매출 세금계산서 <span className="text-blue-600 font-medium">발행</span> 시 → 매출장 자동 생성</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
              <span className="text-gray-700">매입 세금계산서 <span className="text-orange-600 font-medium">수신</span> 시 → 매입장 자동 생성</span>
            </div>
          </div>
        </div>
      </div>

      {/* 향후 계획 */}
      <div className="bg-amber-50 rounded-xl border border-amber-200 p-6">
        <h2 className="text-lg font-bold text-amber-900 mb-4">향후 개발 예정</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-amber-500">○</span>
              <span>대시보드 (매출/매입 현황 요약)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-amber-500">○</span>
              <span>알림 시스템 (결재 요청, 입금 예정 등)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-amber-500">○</span>
              <span>거래처 관리 (고객사/협력사 DB)</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-amber-500">○</span>
              <span>모바일 결재 지원</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-amber-500">○</span>
              <span>PDF 문서 출력</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-amber-500">○</span>
              <span>외부 시스템 연동 (회계, 세금계산서)</span>
            </div>
          </div>
        </div>
      </div>

      {/* 테스트 안내 */}
      <div className="bg-gray-100 rounded-xl p-6 text-center">
        <p className="text-gray-600 mb-4">
          현재 구현된 모든 기능은 <span className="font-medium text-gray-900">기능 테스트</span> 페이지에서 직접 테스트해볼 수 있습니다.
        </p>
        <a
          href="/admin/api-test"
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
        >
          기능 테스트 바로가기
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </a>
      </div>
    </div>
  )
}

// 기능 아이템 컴포넌트
function FeatureItem({
  title,
  features,
  status
}: {
  title: string
  features: string[]
  status: 'done' | 'partial' | 'planned'
}) {
  const statusConfig = {
    done: { bg: 'bg-green-100', text: 'text-green-700', label: '완료' },
    partial: { bg: 'bg-amber-100', text: 'text-amber-700', label: '진행중' },
    planned: { bg: 'bg-gray-100', text: 'text-gray-500', label: '예정' },
  }
  const config = statusConfig[status]

  return (
    <div className="bg-white rounded-lg p-3 border">
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-gray-900 text-sm">{title}</span>
        <span className={`px-2 py-0.5 rounded-full text-xs ${config.bg} ${config.text}`}>
          {config.label}
        </span>
      </div>
      <div className="flex flex-wrap gap-1">
        {features.map((f) => (
          <span key={f} className="text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded">
            {f}
          </span>
        ))}
      </div>
    </div>
  )
}
