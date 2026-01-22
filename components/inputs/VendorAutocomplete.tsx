'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface Vendor {
  id: string
  name: string
  contactName?: string | null
  phone?: string | null
  email?: string | null
}

interface VendorAutocompleteProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export default function VendorAutocomplete({
  value,
  onChange,
  placeholder = '매입처',
  className = '',
  disabled = false,
}: VendorAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<Vendor[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // 검색 함수
  const searchVendors = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSuggestions([])
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch(`/api/vendors?search=${encodeURIComponent(query)}&limit=8`)
      if (res.ok) {
        const data = await res.json()
        setSuggestions(data)
        setIsOpen(data.length > 0)
      }
    } catch (error) {
      console.error('매입처 검색 실패:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 입력 변경 시 debounce 검색
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    onChange(newValue)

    // Debounce 검색
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    debounceRef.current = setTimeout(() => {
      searchVendors(newValue)
    }, 200)
  }

  // 포커스 시 기존 값으로 검색
  const handleFocus = () => {
    if (value.trim()) {
      searchVendors(value)
    }
  }

  // 항목 선택
  const handleSelect = (vendor: Vendor) => {
    onChange(vendor.name)
    setIsOpen(false)
    setHighlightedIndex(-1)
    inputRef.current?.blur()
  }

  // 키보드 네비게이션
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        )
        break
      case 'Enter':
        e.preventDefault()
        if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
          handleSelect(suggestions[highlightedIndex])
        }
        break
      case 'Escape':
        setIsOpen(false)
        setHighlightedIndex(-1)
        break
    }
  }

  // 바깥 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
        setHighlightedIndex(-1)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // 컴포넌트 언마운트 시 debounce 클리어
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={className}
        autoComplete="off"
      />

      {/* 자동완성 드롭다운 */}
      {isOpen && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto"
        >
          {suggestions.map((vendor, index) => (
            <button
              key={vendor.id}
              type="button"
              onClick={() => handleSelect(vendor)}
              onMouseEnter={() => setHighlightedIndex(index)}
              className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 ${
                index === highlightedIndex ? 'bg-blue-50 text-blue-700' : ''
              } ${index === 0 ? 'rounded-t-lg' : ''} ${
                index === suggestions.length - 1 ? 'rounded-b-lg' : ''
              }`}
            >
              <div className="font-medium">{vendor.name}</div>
              {vendor.contactName && (
                <div className="text-xs text-gray-500">{vendor.contactName}</div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* 로딩 인디케이터 */}
      {isLoading && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          <div className="w-3 h-3 border border-gray-300 border-t-blue-500 rounded-full animate-spin" />
        </div>
      )}
    </div>
  )
}
