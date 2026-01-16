'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  UilChart,
  UilFileAlt,
  UilClipboardNotes,
  UilPackage,
  UilWrench,
  UilFileCheckAlt,
  UilUsersAlt,
  UilUpload,
  UilBracketsCurly,
  UilCalendarAlt,
  UilMoneyWithdrawal,
  UilPlane,
} from '@iconscout/react-unicons'

const navigation = [
  {
    title: '대시보드',
    items: [
      { name: '대시보드', href: '/dashboard', icon: UilChart },
      { name: '캘린더', href: '/calendar', icon: UilCalendarAlt },
    ],
  },
  {
    title: 'Sales',
    items: [
      { name: '견적서 관리', href: '/sales/quotes', icon: UilFileAlt },
      { name: '품의서 관리', href: '/sales/approvals', icon: UilClipboardNotes },
      { name: '발주서 관리', href: '/sales/orders', icon: UilPackage },
    ],
  },
  {
    title: 'MA (유지보수)',
    items: [
      { name: 'MA 견적서', href: '/ma/quotes', icon: UilWrench },
      { name: 'MA 품의서', href: '/ma/approvals', icon: UilFileCheckAlt },
    ],
  },
  {
    title: '경영팀',
    items: [
      { name: '매출/매입 현황', href: '/management', icon: UilMoneyWithdrawal },
    ],
  },
  {
    title: '관리',
    items: [
      { name: '직원 관리', href: '/admin/users', icon: UilUsersAlt },
      { name: '휴가 관리', href: '/admin/leaves', icon: UilPlane },
      { name: '엑셀 일괄 업로드', href: '/admin/import', icon: UilUpload },
      { name: 'API 테스트', href: '/admin/api-test', icon: UilBracketsCurly },
    ],
  },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 bg-white border-r border-gray-200 h-screen fixed left-0 top-0 overflow-y-auto shadow-sm">
      {/* 로고 */}
      <div className="h-20 flex items-center px-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <Link href="/dashboard" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <Image
            src="/imgs/servermate_logo.svg"
            alt="ServerMate Logo"
            width={48}
            height={48}
            className="w-12 h-12"
          />
          <span className="font-bold text-xl text-gray-900">
            서버메이트ERP
          </span>
        </Link>
      </div>

      {/* 네비게이션 */}
      <nav className="p-5">
        {navigation.map((section) => (
          <div key={section.title} className="mb-8">
            <h3 className="px-4 text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
              {section.title}
            </h3>
            <ul className="space-y-1.5">
              {section.items.map((item) => {
                const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
                const Icon = item.icon
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-all duration-200 ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                    >
                      <Icon size={22} />
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
