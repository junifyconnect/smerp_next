import { unwrapAll } from '@/lib/action/unwrapAll'
import { getDashboardStats } from './_actions/getDashboardStats'
import { DashboardPageClient } from './_client/DashboardPageClient'

/**
 * 대시보드 페이지
 * - Server Component에서 초기 데이터 로딩
 * - Client Component로 상태 관리 및 UI 렌더링
 */
export default async function DashboardPage() {
  // ✅ 서버에서 초기 데이터 로딩 (네트워크 왕복 없음)
  const [dashboardData] = await unwrapAll([getDashboardStats()])

  return <DashboardPageClient initialData={dashboardData} />
}
