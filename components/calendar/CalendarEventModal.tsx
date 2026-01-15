'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'

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

interface CalendarEventModalProps {
  date: Date | null
  event: CalendarEvent | null
  onClose: () => void
  onSaved: () => void
}

const EVENT_TYPES = [
  { value: 'PERSONAL', label: '개인 일정', color: '#3B82F6' },
  { value: 'COMPANY', label: '사내 일정', color: '#8B5CF6' },
  { value: 'MEETING', label: '회의', color: '#22C55E' },
  { value: 'DEADLINE', label: '마감일', color: '#EF4444' },
  { value: 'HOLIDAY', label: '휴일/휴가', color: '#F97316' },
]

export function CalendarEventModal({ date, event, onClose, onSaved }: CalendarEventModalProps) {
  const isEdit = !!event

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    eventType: 'PERSONAL',
    startDate: '',
    startTime: '09:00',
    endDate: '',
    endTime: '10:00',
    isAllDay: false,
    isCompanyWide: false,
    color: '',
  })
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (event) {
      const start = new Date(event.startDate)
      const end = event.endDate ? new Date(event.endDate) : start

      setFormData({
        title: event.title,
        description: event.description || '',
        eventType: event.eventType,
        startDate: format(start, 'yyyy-MM-dd'),
        startTime: format(start, 'HH:mm'),
        endDate: format(end, 'yyyy-MM-dd'),
        endTime: format(end, 'HH:mm'),
        isAllDay: event.isAllDay,
        isCompanyWide: event.isCompanyWide,
        color: event.color || '',
      })
    } else if (date) {
      setFormData((prev) => ({
        ...prev,
        startDate: format(date, 'yyyy-MM-dd'),
        endDate: format(date, 'yyyy-MM-dd'),
      }))
    }
  }, [event, date])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim()) {
      alert('제목을 입력하세요')
      return
    }

    setLoading(true)
    try {
      const startDateTime = formData.isAllDay
        ? `${formData.startDate}T00:00:00`
        : `${formData.startDate}T${formData.startTime}:00`

      const endDateTime = formData.isAllDay
        ? `${formData.endDate}T23:59:59`
        : `${formData.endDate}T${formData.endTime}:00`

      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        eventType: formData.eventType,
        startDate: startDateTime,
        endDate: endDateTime,
        isAllDay: formData.isAllDay,
        isCompanyWide: formData.isCompanyWide,
        color: formData.color || undefined,
      }

      const url = isEdit ? `/api/calendar/${event.id}` : '/api/calendar'
      const method = isEdit ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        onSaved()
      } else {
        const data = await res.json()
        alert(data.error || '저장에 실패했습니다')
      }
    } catch {
      alert('저장에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!event || !confirm('이 일정을 삭제하시겠습니까?')) return

    setDeleting(true)
    try {
      const res = await fetch(`/api/calendar/${event.id}`, { method: 'DELETE' })
      if (res.ok) {
        onSaved()
      } else {
        const data = await res.json()
        alert(data.error || '삭제에 실패했습니다')
      }
    } catch {
      alert('삭제에 실패했습니다')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            {isEdit ? '일정 수정' : '새 일정'}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* 제목 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">제목 *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="일정 제목"
              autoFocus
            />
          </div>

          {/* 일정 유형 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">유형</label>
            <select
              value={formData.eventType}
              onChange={(e) => {
                const type = e.target.value
                const isCompany = type === 'COMPANY'
                setFormData({
                  ...formData,
                  eventType: type,
                  isCompanyWide: isCompany,
                  color: EVENT_TYPES.find((t) => t.value === type)?.color || '',
                })
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {EVENT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* 종일 여부 */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isAllDay"
              checked={formData.isAllDay}
              onChange={(e) => setFormData({ ...formData, isAllDay: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <label htmlFor="isAllDay" className="text-sm text-gray-700">
              종일
            </label>
          </div>

          {/* 날짜/시간 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">시작</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {!formData.isAllDay && (
                <input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mt-2"
                />
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">종료</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {!formData.isAllDay && (
                <input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mt-2"
                />
              )}
            </div>
          </div>

          {/* 설명 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="상세 설명 (선택)"
            />
          </div>

          {/* 색상 선택 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">색상</label>
            <div className="flex items-center gap-2">
              {['#3B82F6', '#8B5CF6', '#22C55E', '#EF4444', '#F97316', '#EC4899', '#6366F1'].map(
                (color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData({ ...formData, color })}
                    className={`w-8 h-8 rounded-full border-2 ${
                      formData.color === color ? 'border-gray-900' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                )
              )}
            </div>
          </div>

          {/* 버튼 */}
          <div className="flex items-center justify-between pt-4">
            {isEdit ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
              >
                {deleting ? '삭제 중...' : '삭제'}
              </button>
            ) : (
              <div />
            )}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {loading ? '저장 중...' : isEdit ? '수정' : '저장'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
