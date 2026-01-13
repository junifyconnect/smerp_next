import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/session'
import { Sidebar, Header } from '@/components/layout'

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // 인증 체크
  const user = await getCurrentUser()
  
  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="ml-64">
        <Header />
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
