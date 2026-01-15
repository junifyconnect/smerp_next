'use client'

import Link from 'next/link'

interface TestModule {
  title: string
  description: string
  href: string
  features: string[]
  color: string
}

// 프로젝트 개요 모듈
const overviewModules: TestModule[] = [
  {
    title: '프로젝트 소개',
    description: 'SMERP 시스템 개요 및 구현 현황',
    href: '/admin/project-intro',
    features: ['기능 소개', '업무 흐름', '구현 현황', '향후 계획'],
    color: 'bg-indigo-600',
  },
  {
    title: '실무 프로세스 데모',
    description: '견적서→품의서→발주서→매출장 실무 흐름 (PPT 스타일)',
    href: '/admin/process-demo',
    features: ['슬라이드 형식', '단계별 설명', '실제 화면 예시', '데이터 연동'],
    color: 'bg-violet-600',
  },
  {
    title: '시스템 구조도',
    description: '문서 처리 흐름 및 데이터 연동 관계 시각화',
    href: '/admin/system-architecture',
    features: ['문서 흐름도', '품의서 구조', '데이터 연동', 'API 구조'],
    color: 'bg-indigo-500',
  },
]

// 공통 모듈
const commonModules: TestModule[] = [
  {
    title: '사용자 관리',
    description: 'Users - 회원가입, 서명 등록, 사용자 관리',
    href: '/admin/api-test/users',
    features: ['회원가입', '사용자 조회', '서명 업로드', '정보 수정'],
    color: 'bg-gray-500',
  },
  {
    title: '클라우드 스토리지',
    description: 'Cloud Storage - AWS S3 파일 관리',
    href: '/admin/api-test/cloud',
    features: ['파일 업로드', '파일 다운로드', '파일 삭제', '폴더 탐색'],
    color: 'bg-cyan-500',
  },
]

// 영업팀 모듈
const salesModules: TestModule[] = [
  {
    title: '영업 견적서',
    description: 'Sales Quote - 견적서 생성, 조회, 엑셀 다운로드/업로드',
    href: '/admin/api-test/sales-quotes',
    features: ['견적서 생성', '목록 조회', '상세 보기', '엑셀 다운로드', '엑셀 업로드'],
    color: 'bg-blue-500',
  },
  {
    title: '영업 품의서',
    description: 'Sales Approval - 품의서 생성, 3단계 결재',
    href: '/admin/api-test/sales-approvals',
    features: ['품의서 생성', '매출/매입 품목', '3단계 서명', '엑셀 업로드'],
    color: 'bg-purple-500',
  },
  {
    title: '영업 발주서',
    description: 'Sales Order - 발주서 생성, 발주 관리',
    href: '/admin/api-test/sales-orders',
    features: ['발주서 생성', '목록 조회', '상세 보기', '엑셀 다운로드'],
    color: 'bg-orange-500',
  },
  {
    title: 'MA 견적서',
    description: 'MA Quote - 유지보수 견적서 생성',
    href: '/admin/api-test/ma-quotes',
    features: ['MA 견적서 생성', '서비스 품목 관리', '기간 설정', '엑셀 다운로드'],
    color: 'bg-green-500',
  },
  {
    title: 'MA 품의서',
    description: 'MA Approval - 유지보수 품의서 생성, 승인 관리',
    href: '/admin/api-test/ma-approvals',
    features: ['MA 품의서 생성', '매출/매입 관리', '승인 처리', '엑셀 업로드'],
    color: 'bg-teal-500',
  },
]

// 경영팀 모듈
const managementModules: TestModule[] = [
  {
    title: '계산서 발행현황',
    description: 'Invoice Status - 품의별 계산서 발행 추적',
    href: '/admin/api-test/management/invoice-status',
    features: ['발행현황 등록', '월별 조회', '품의 연결'],
    color: 'bg-rose-500',
  },
  {
    title: '매출장',
    description: 'Sales Ledger - 매출 거래 내역 관리',
    href: '/admin/api-test/management/sales-ledger',
    features: ['매출 등록', '목록 조회', '연체 조회', '필터링'],
    color: 'bg-rose-400',
  },
  {
    title: '매입장',
    description: 'Purchase Ledger - 매입 거래 내역 관리',
    href: '/admin/api-test/management/purchase-ledger',
    features: ['매입 등록', '목록 조회', '유형별 관리', '필터링'],
    color: 'bg-rose-300',
  },
  {
    title: '월말 입출금 예정',
    description: 'Monthly Forecast - 외상매출/매입금 예정 내역',
    href: '/admin/api-test/management/monthly-forecast',
    features: ['입금 예정', '출금 예정', '업체별 집계'],
    color: 'bg-amber-500',
  },
  {
    title: '거래처 순위',
    description: 'Company Rank - 매출/매입처 순위 분석',
    href: '/admin/api-test/management/company-rank',
    features: ['매출처 순위', '매입처 순위', '기간별 조회'],
    color: 'bg-amber-400',
  },
  {
    title: '연 마감 통계',
    description: 'Annual Report - 연간 매출/매입/GP 통계',
    href: '/admin/api-test/management/annual-report',
    features: ['총매출/매입/GP', '월별 추이', '품목별', '담당자별'],
    color: 'bg-amber-300',
  },
]

function ModuleCard({ module }: { module: TestModule }) {
  return (
    <Link
      href={module.href}
      className="block bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
    >
      <div className={`${module.color} h-2`} />
      <div className="p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-2">{module.title}</h3>
        <p className="text-sm text-gray-500 mb-4">{module.description}</p>

        <div className="flex flex-wrap gap-2">
          {module.features.map((feature) => (
            <span
              key={feature}
              className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
            >
              {feature}
            </span>
          ))}
        </div>
      </div>
    </Link>
  )
}

export default function ApiTestIndexPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">기능 테스트</h1>
        <p className="text-gray-500 mt-1">프론트엔드에서 바로 사용 가능한 완성된 기능들</p>
      </div>

      {/* 프로젝트 개요 */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-1 h-6 bg-indigo-600 rounded-full" />
          <h2 className="text-lg font-semibold text-gray-900">프로젝트 개요</h2>
          <span className="text-sm text-gray-400">소개, 구조도</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {overviewModules.map((module) => (
            <ModuleCard key={module.href} module={module} />
          ))}
        </div>
      </section>

      {/* 영업팀 */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-1 h-6 bg-blue-500 rounded-full" />
          <h2 className="text-lg font-semibold text-gray-900">영업팀</h2>
          <span className="text-sm text-gray-400">견적서, 품의서, 발주서</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {salesModules.map((module) => (
            <ModuleCard key={module.href} module={module} />
          ))}
        </div>
      </section>

      {/* 경영팀 */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-1 h-6 bg-rose-500 rounded-full" />
          <h2 className="text-lg font-semibold text-gray-900">경영팀</h2>
          <span className="text-sm text-gray-400">매출장, 매입장, 통계</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {managementModules.map((module) => (
            <ModuleCard key={module.href} module={module} />
          ))}
        </div>
      </section>

      {/* 공통 */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-1 h-6 bg-gray-500 rounded-full" />
          <h2 className="text-lg font-semibold text-gray-900">공통</h2>
          <span className="text-sm text-gray-400">사용자, 스토리지</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {commonModules.map((module) => (
            <ModuleCard key={module.href} module={module} />
          ))}
        </div>
      </section>

      {/* 안내 */}
      <div className="bg-gray-50 rounded-xl p-6">
        <h3 className="font-semibold text-gray-900 mb-3">사용 방법</h3>
        <ul className="text-sm text-gray-600 space-y-2">
          <li>1. 위 카드를 클릭하여 각 기능 테스트 페이지로 이동합니다.</li>
          <li>2. 견적서 생성, 목록 조회, 엑셀 업로드/다운로드 기능을 테스트할 수 있습니다.</li>
          <li>3. 테스트한 데이터는 실제 DB에 저장됩니다.</li>
          <li>4. 프론트엔드에서 동일한 API와 로직을 사용하여 디자인만 적용하면 됩니다.</li>
        </ul>
      </div>
    </div>
  )
}
