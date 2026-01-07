'use client'

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
    <header className="h-14 bg-white border-b border-gray-200 px-6 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-4">
        {title && (
          <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* 알림 */}
        <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
          🔔
        </button>

        {/* 사용자 메뉴 */}
        <div className="flex items-center gap-3 px-3 py-1.5 bg-gray-50 rounded-full border border-gray-200">
          <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-cyan-400 rounded-full flex items-center justify-center text-white text-xs font-semibold">
            {user.name.charAt(0)}
          </div>
          <div className="text-sm">
            <span className="font-medium">{user.name}</span>
            <span className="text-gray-400 ml-1">{user.department}</span>
          </div>
        </div>
      </div>
    </header>
  )
}
