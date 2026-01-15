'use client'

import { useState, useEffect, useCallback } from 'react'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, isSameDay, parseISO } from 'date-fns'
import { ko } from 'date-fns/locale'
import { CalendarEventModal } from './CalendarEventModal'

interface CalendarEvent {
  id: string
  title: string
  description?: string
  eventType: string
  startDate: string
  endDate?: string
  isAllDay: boolean
  isCompanyWide: boolean
  color?: string
  user?: { id: string; name: string; department?: string }
}

interface CalendarViewProps {
  className?: string
}

const EVENT_COLORS: Record<string, string> = {
  PERSONAL: 'bg-blue-500',
  COMPANY: 'bg-purple-500',
  MEETING: 'bg-green-500',
  DEADLINE: 'bg-red-500',
  HOLIDAY: 'bg-orange-500',
  MA_EXPIRY: 'bg-yellow-500',
  PAYMENT_DUE: 'bg-pink-500',
}

export function CalendarView({ className = '' }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [viewType, setViewType] = useState<'all' | 'personal' | 'company'>('all')
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [showModal, setShowModal] = useState(false)

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    try {
      const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 0 })
      const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 0 })

      const res = await fetch(
        `/api/calendar?startDate=${start.toISOString()}&endDate=${end.toISOString()}&type=${viewType}`
      )
      if (res.ok) {
        const data = await res.json()
        setEvents(data.events || [])
      }
    } catch (error) {
      console.error('캘린더 조회 오류:', error)
    } finally {
      setLoading(false)
    }
  }, [currentDate, viewType])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1))
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1))
  const goToday = () => setCurrentDate(new Date())

  const getEventsForDate = (date: Date) => {
    return events.filter((event) => {
      const eventStart = parseISO(event.startDate)
      const eventEnd = event.endDate ? parseISO(event.endDate) : eventStart
      return date >= new Date(eventStart.setHours(0, 0, 0, 0)) && date <= new Date(eventEnd.setHours(23, 59, 59, 999))
    })
  }

  const handleDateClick = (date: Date) => {
    setSelectedDate(date)
    setSelectedEvent(null)
    setShowModal(true)
  }

  const handleEventClick = (event: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedEvent(event)
    setSelectedDate(parseISO(event.startDate))
    setShowModal(true)
  }

  const handleModalClose = () => {
    setShowModal(false)
    setSelectedEvent(null)
    setSelectedDate(null)
  }

  const handleEventSaved = () => {
    fetchEvents()
    handleModalClose()
  }

  // 달력 그리드 생성
  const renderCalendarGrid = () => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 })
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 })

    const rows = []
    let days = []
    let day = startDate

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const currentDay = day
        const dayEvents = getEventsForDate(currentDay)
        const isCurrentMonth = isSameMonth(currentDay, currentDate)
        const isToday = isSameDay(currentDay, new Date())

        days.push(
          <div
            key={currentDay.toString()}
            onClick={() => handleDateClick(currentDay)}
            className={`min-h-[100px] border border-gray-200 p-1 cursor-pointer transition-colors hover:bg-gray-50 ${
              !isCurrentMonth ? 'bg-gray-50' : 'bg-white'
            }`}
          >
            <div className={`text-sm font-medium mb-1 w-7 h-7 flex items-center justify-center rounded-full ${
              isToday ? 'bg-blue-600 text-white' : isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
            }`}>
              {format(currentDay, 'd')}
            </div>
            <div className="space-y-1">
              {dayEvents.slice(0, 3).map((event) => (
                <div
                  key={event.id}
                  onClick={(e) => handleEventClick(event, e)}
                  className={`text-xs px-1.5 py-0.5 rounded truncate cursor-pointer text-white ${
                    event.color ? '' : EVENT_COLORS[event.eventType] || 'bg-gray-500'
                  }`}
                  style={event.color ? { backgroundColor: event.color } : undefined}
                  title={event.title}
                >
                  {event.title}
                </div>
              ))}
              {dayEvents.length > 3 && (
                <div className="text-xs text-gray-500 px-1.5">
                  +{dayEvents.length - 3}개 더보기
                </div>
              )}
            </div>
          </div>
        )
        day = addDays(day, 1)
      }
      rows.push(
        <div key={day.toString()} className="grid grid-cols-7">
          {days}
        </div>
      )
      days = []
    }

    return rows
  }

  return (
    <div className={`bg-white rounded-xl border border-gray-200 ${className}`}>
      {/* 헤더 */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-gray-900">
              {format(currentDate, 'yyyy년 M월', { locale: ko })}
            </h2>
            <div className="flex items-center gap-1">
              <button
                onClick={prevMonth}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={goToday}
                className="px-3 py-1.5 text-sm font-medium hover:bg-gray-100 rounded-lg transition-colors"
              >
                오늘
              </button>
              <button
                onClick={nextMonth}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* 필터 */}
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setViewType('all')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  viewType === 'all' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
                }`}
              >
                전체
              </button>
              <button
                onClick={() => setViewType('personal')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  viewType === 'personal' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
                }`}
              >
                개인
              </button>
              <button
                onClick={() => setViewType('company')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  viewType === 'company' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
                }`}
              >
                사내
              </button>
            </div>

            {/* 일정 추가 버튼 */}
            <button
              onClick={() => {
                setSelectedDate(new Date())
                setSelectedEvent(null)
                setShowModal(true)
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              일정 추가
            </button>
          </div>
        </div>

        {/* 범례 */}
        <div className="flex flex-wrap items-center gap-4 mt-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-blue-500"></div>
            <span>개인</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-purple-500"></div>
            <span>사내</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-green-500"></div>
            <span>회의</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-red-500"></div>
            <span>마감</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-orange-500"></div>
            <span>휴일</span>
          </div>
        </div>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 border-b border-gray-200">
        {['일', '월', '화', '수', '목', '금', '토'].map((day, index) => (
          <div
            key={day}
            className={`py-3 text-center text-sm font-medium ${
              index === 0 ? 'text-red-500' : index === 6 ? 'text-blue-500' : 'text-gray-700'
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* 달력 그리드 */}
      <div className="relative">
        {loading && (
          <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10">
            <div className="text-gray-500">로딩 중...</div>
          </div>
        )}
        {renderCalendarGrid()}
      </div>

      {/* 이벤트 모달 */}
      {showModal && (
        <CalendarEventModal
          date={selectedDate}
          event={selectedEvent}
          onClose={handleModalClose}
          onSaved={handleEventSaved}
        />
      )}
    </div>
  )
}
