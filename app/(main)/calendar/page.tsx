'use client'

import { CalendarView } from '@/components/calendar'

export default function CalendarPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">캘린더</h1>
      </div>

      <CalendarView />
    </div>
  )
}
