'use client'

import Link from 'next/link'

interface TestModule {
  title: string
  description: string
  href: string
  features: string[]
  color: string
}

const testModules: TestModule[] = [
  {
    title: '사용자 관리',
    description: 'Users - 회원가입, 서명 등록, 사용자 관리',
    href: '/admin/api-test/users',
    features: ['회원가입', '사용자 조회', '서명 업로드', '정보 수정'],
    color: 'bg-gray-500',
  },
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
  {
    title: '클라우드 스토리지',
    description: 'Cloud Storage - AWS S3 파일 관리',
    href: '/admin/api-test/cloud',
    features: ['파일 업로드', '파일 다운로드', '파일 삭제', '폴더 탐색'],
    color: 'bg-cyan-500',
  },
]

export default function ApiTestIndexPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">기능 테스트</h1>
        <p className="text-gray-500 mt-1">프론트엔드에서 바로 사용 가능한 완성된 기능들</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {testModules.map((module) => (
          <Link
            key={module.href}
            href={module.href}
            className="block bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
          >
            <div className={`${module.color} h-2`} />
            <div className="p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-2">{module.title}</h2>
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
        ))}
      </div>

      {/* 안내 */}
      <div className="bg-gray-50 rounded-xl p-6 mt-8">
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
