'use client'

import { useState, useRef, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { NotificationBell } from '@/components/notifications/NotificationBell'

interface HeaderProps {
  title?: string
}

export function Header({ title }: HeaderProps) {
  const { data: session } = useSession()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const userName = session?.user?.name || '사용자'
  const userDepartment = session?.user?.department || ''
  const userEmail = session?.user?.email || ''

  // 외부 클릭 시 메뉴 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = () => {
    signOut({ callbackUrl: '/login' })
  }

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
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="w-9 h-9 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
              {userName.charAt(0)}
            </div>
            <div className="flex flex-col text-left">
              <span className="text-sm font-medium text-gray-900">{userName}</span>
              {userDepartment && (
                <span className="text-xs text-gray-500">{userDepartment}</span>
              )}
            </div>
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* 드롭다운 메뉴 */}
          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-900">{userName}</p>
                <p className="text-xs text-gray-500 truncate">{userEmail}</p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                로그아웃
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
