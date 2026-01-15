'use client'

import { useSession } from 'next-auth/react'
import { NotificationBell } from '@/components/notifications/NotificationBell'

interface HeaderProps {
  title?: string
}

export function Header({ title }: HeaderProps) {
  const { data: session } = useSession()

  const userName = session?.user?.name || '사용자'
  const userDepartment = session?.user?.department || ''

  return (
    <header className="h-20 bg-white border-b border-gray-200 px-8 flex items-center justify-between sticky top-0 z-10 shadow-sm">
      <div className="flex items-center gap-4">
        {title && (
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        )}
      </div>

      <div className="flex items-center gap-5">
        {/* 알림 */}
        <NotificationBell />

        {/* 사용자 메뉴 */}
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer">
          <div className="w-9 h-9 bg-gray-300 rounded-full flex items-center justify-center text-gray-700 text-sm font-medium">
            {userName.charAt(0)}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-900">{userName}</span>
            {userDepartment && (
              <span className="text-xs text-gray-500">{userDepartment}</span>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
