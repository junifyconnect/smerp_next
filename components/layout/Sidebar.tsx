'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navigation = [
  {
    title: '대시보드',
    items: [
      { name: '대시보드', href: '/dashboard', icon: '📊' },
    ],
  },
  {
    title: 'Sales',
    items: [
      { name: '견적서 관리', href: '/sales/quotes', icon: '📝' },
      { name: '품의서 관리', href: '/sales/approvals', icon: '📋' },
      { name: '발주서 관리', href: '/sales/orders', icon: '📦' },
    ],
  },
  {
    title: 'MA (유지보수)',
    items: [
      { name: 'MA 견적서', href: '/ma/quotes', icon: '🔧' },
      { name: 'MA 품의서', href: '/ma/approvals', icon: '📑' },
    ],
  },
  {
    title: '관리',
    items: [
      { name: '사용자 관리', href: '/admin/users', icon: '👥' },
      { name: '엑셀 일괄 업로드', href: '/admin/import', icon: '📤' },
    ],
  },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-60 bg-white border-r border-gray-200 h-screen fixed left-0 top-0 overflow-y-auto">
      {/* 로고 */}
      <div className="h-16 flex items-center px-6 border-b border-gray-200">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
          SM
        </div>
        <span className="ml-3 font-bold text-lg">
          <span className="text-blue-600">SM</span>ERP
        </span>
      </div>

      {/* 네비게이션 */}
      <nav className="p-4">
        {navigation.map((section) => (
          <div key={section.title} className="mb-6">
            <h3 className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              {section.title}
            </h3>
            <ul className="space-y-1">
              {section.items.map((item) => {
                const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                        isActive
                          ? 'bg-blue-50 text-blue-600 font-medium'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <span>{item.icon}</span>
                      {item.name}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  )
}
