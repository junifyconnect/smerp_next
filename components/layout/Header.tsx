'use client'

import { UilBell } from '@iconscout/react-unicons'

interface HeaderProps {
  title?: string
}

export function Header({ title }: HeaderProps) {
  // TODO: 사용자 정보 Context에서 가져오기
  const user = {
    name: '홍길동',
    department: '영업팀',
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
        <button className="relative p-3 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all duration-200 group">
          <UilBell size={22} />
          {/* 알림 배지 (필요시) */}
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>

        {/* 사용자 메뉴 */}
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer">
          <div className="w-9 h-9 bg-gray-300 rounded-full flex items-center justify-center text-gray-700 text-sm font-medium">
            {user.name.charAt(0)}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-900">{user.name}</span>
            <span className="text-xs text-gray-500">{user.department}</span>
          </div>
        </div>
      </div>
    </header>
  )
}
