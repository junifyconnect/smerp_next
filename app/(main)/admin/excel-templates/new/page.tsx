'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface CellData {
  address: string
  row: number
  col: number
  colLetter: string
  value: string | number | boolean | Date | null
  type: string
  formula?: string
  style?: {
    font?: { bold?: boolean; size?: number }
    fill?: { color?: string }
    border?: boolean
    alignment?: { horizontal?: string; vertical?: string }
  }
}

interface RowData {
  row: number
  cells: CellData[]
  isEmpty: boolean
  hasNumericValue: boolean
}

interface AnalyzedSheet {
  name: string
  rowCount: number
  columnCount: number
  mergedCells: string[]
  rows: RowData[]
}

interface AnalyzedData {
  fileName: string
  sheets: AnalyzedSheet[]
}

interface MergeInfo {
  startRow: number
  startCol: number
  endRow: number
  endCol: number
  rowSpan: number
  colSpan: number
}

// 병합 셀 정보 파싱 (예: "A1:C3" -> { startRow: 1, startCol: 1, endRow: 3, endCol: 3, ... })
function parseMergedCells(mergedCells: string[]): Map<string, MergeInfo> {
  const mergeMap = new Map<string, MergeInfo>()

  for (const range of mergedCells) {
    const match = range.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/)
    if (!match) continue

    const startColLetter = match[1]
    const startRow = parseInt(match[2])
    const endColLetter = match[3]
    const endRow = parseInt(match[4])

    const startCol = colLetterToNumber(startColLetter)
    const endCol = colLetterToNumber(endColLetter)

    const mergeInfo: MergeInfo = {
      startRow,
      startCol,
      endRow,
      endCol,
      rowSpan: endRow - startRow + 1,
      colSpan: endCol - startCol + 1,
    }

    // 시작 셀 주소를 키로 저장
    mergeMap.set(`${startColLetter}${startRow}`, mergeInfo)
  }

  return mergeMap
}

// 열 문자를 숫자로 변환 (A=1, B=2, ..., Z=26, AA=27)
function colLetterToNumber(letter: string): number {
  let result = 0
  for (let i = 0; i < letter.length; i++) {
    result = result * 26 + (letter.charCodeAt(i) - 64)
  }
  return result
}

// 셀이 병합 범위에 포함되는지 확인 (시작 셀 제외)
function isCellHiddenByMerge(row: number, col: number, mergedCells: string[]): boolean {
  for (const range of mergedCells) {
    const match = range.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/)
    if (!match) continue

    const startCol = colLetterToNumber(match[1])
    const startRow = parseInt(match[2])
    const endCol = colLetterToNumber(match[3])
    const endRow = parseInt(match[4])

    // 범위 내에 있고, 시작 셀이 아닌 경우
    if (row >= startRow && row <= endRow && col >= startCol && col <= endCol) {
      if (row !== startRow || col !== startCol) {
        return true
      }
    }
  }
  return false
}

// ARGB 색상을 CSS 색상으로 변환
function argbToColor(argb: string | undefined): string | undefined {
  if (!argb || argb === 'FFFFFFFF' || argb === '00000000') return undefined
  // ARGB 형식: AARRGGBB
  if (argb.length === 8) {
    return `#${argb.slice(2)}` // Alpha 제거하고 RGB만 사용
  }
  return `#${argb}`
}

type MappingTarget =
  | 'documentDate'
  | 'documentNumber'
  | 'customerCompany'
  | 'customerContact'
  | 'projectName'
  | 'validUntil'
  | 'deliveryDate'
  | 'itemTableHeaderRow'
  | 'itemNo'
  | 'itemName'
  | 'itemSpec'
  | 'itemQty'
  | 'itemUnit'
  | 'salesUnitPrice'
  | 'salesTotalPrice'
  | 'purchaseVendor'
  | 'purchaseUnitPrice'
  | 'purchaseTotalPrice'
  | 'remarks'
  | null

const fieldLabels: Record<string, string> = {
  documentDate: '문서일자',
  documentNumber: '문서번호',
  customerCompany: '고객사명',
  customerContact: '고객 담당자',
  projectName: '프로젝트명',
  validUntil: '유효기간',
  deliveryDate: '납품일자',
  itemTableHeaderRow: '품목 테이블 헤더 행',
  itemNo: '품목 NO',
  itemName: '품목명',
  itemSpec: '사양/규격',
  itemQty: '수량',
  itemUnit: '단위',
  salesUnitPrice: '매출단가',
  salesTotalPrice: '매출합계',
  purchaseVendor: '매입처',
  purchaseUnitPrice: '매입단가',
  purchaseTotalPrice: '매입합계',
  remarks: '비고',
}

const docTypeOptions = [
  { value: 'SALES_QUOTE', label: '영업 견적서' },
  { value: 'SALES_APPROVAL', label: '영업 품의서' },
  { value: 'SALES_ORDER', label: '영업 발주서' },
  { value: 'MA_QUOTE', label: '유지보수 견적서' },
  { value: 'MA_APPROVAL', label: '유지보수 품의서' },
]

export default function NewExcelTemplatePage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState('')
  const [docType, setDocType] = useState('SALES_APPROVAL')
  const [isDefault, setIsDefault] = useState(false)

  const [file, setFile] = useState<File | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzedData, setAnalyzedData] = useState<AnalyzedData | null>(null)
  const [selectedSheet, setSelectedSheet] = useState(0)

  const [selectedCell, setSelectedCell] = useState<CellData | null>(null)
  const [mappingTarget, setMappingTarget] = useState<MappingTarget>(null)

  // 필드 매핑 - 셀 주소 저장
  const [fieldMappings, setFieldMappings] = useState<Record<string, string>>({})
  // 품목 테이블 열 매핑 - 열 문자 저장 (A, B, C...)
  const [salesColumnMappings, setSalesColumnMappings] = useState<Record<string, string>>({})
  const [purchaseColumnMappings, setPurchaseColumnMappings] = useState<Record<string, string>>({})

  const [itemTableHeaderRow, setItemTableHeaderRow] = useState(16)
  const [itemTableStartRow, setItemTableStartRow] = useState(17)
  const [itemTableEndRow, setItemTableEndRow] = useState<number | null>(null)

  const [saving, setSaving] = useState(false)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    setAnalyzing(true)
    setAnalyzedData(null)
    setFieldMappings({})
    setSalesColumnMappings({})
    setPurchaseColumnMappings({})

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('maxRows', '100')
      formData.append('maxCols', '26')

      const res = await fetch('/api/excel-templates/analyze', {
        method: 'POST',
        body: formData,
      })

      if (res.ok) {
        const data = await res.json()
        setAnalyzedData(data)
        setSelectedSheet(0)

        // 파일명으로 양식명 자동 설정
        if (!name) {
          const fileName = selectedFile.name.replace(/\.[^/.]+$/, '')
          setName(fileName)
        }
      } else {
        const error = await res.json()
        alert(error.error || '분석 실패')
      }
    } catch {
      alert('파일 분석에 실패했습니다')
    } finally {
      setAnalyzing(false)
    }
  }

  const handleCellClick = (cell: CellData) => {
    setSelectedCell(cell)

    if (mappingTarget) {
      // 매핑 모드인 경우
      if (mappingTarget === 'itemTableHeaderRow') {
        setItemTableHeaderRow(cell.row)
        setItemTableStartRow(cell.row + 1)
      } else if ([
        'itemNo', 'itemName', 'itemSpec', 'itemQty', 'itemUnit',
        'salesUnitPrice', 'salesTotalPrice', 'remarks'
      ].includes(mappingTarget)) {
        // 품목 테이블 열 매핑 (영업)
        setSalesColumnMappings((prev) => ({
          ...prev,
          [mappingTarget]: cell.colLetter,
        }))
      } else if ([
        'purchaseVendor', 'purchaseUnitPrice', 'purchaseTotalPrice'
      ].includes(mappingTarget)) {
        // 품목 테이블 열 매핑 (매입)
        setPurchaseColumnMappings((prev) => ({
          ...prev,
          [mappingTarget]: cell.colLetter,
        }))
      } else {
        // 필드 매핑 (셀 주소)
        setFieldMappings((prev) => ({
          ...prev,
          [mappingTarget]: cell.address,
        }))
      }

      setMappingTarget(null)
    }
  }

  const startMapping = (target: MappingTarget) => {
    setMappingTarget(target)
  }

  const clearMapping = (target: string) => {
    if (['itemNo', 'itemName', 'itemSpec', 'itemQty', 'itemUnit', 'salesUnitPrice', 'salesTotalPrice', 'remarks'].includes(target)) {
      setSalesColumnMappings((prev) => {
        const next = { ...prev }
        delete next[target]
        return next
      })
    } else if (['purchaseVendor', 'purchaseUnitPrice', 'purchaseTotalPrice'].includes(target)) {
      setPurchaseColumnMappings((prev) => {
        const next = { ...prev }
        delete next[target]
        return next
      })
    } else {
      setFieldMappings((prev) => {
        const next = { ...prev }
        delete next[target]
        return next
      })
    }
  }

  const getMappedValue = (target: string): string | null => {
    if (['itemNo', 'itemName', 'itemSpec', 'itemQty', 'itemUnit', 'salesUnitPrice', 'salesTotalPrice', 'remarks'].includes(target)) {
      return salesColumnMappings[target] || null
    }
    if (['purchaseVendor', 'purchaseUnitPrice', 'purchaseTotalPrice'].includes(target)) {
      return purchaseColumnMappings[target] || null
    }
    return fieldMappings[target] || null
  }

  const getCellClasses = (cell: CellData): string => {
    let classes = 'border-r border-b border-gray-300 px-1 py-0.5 text-xs cursor-pointer hover:ring-2 hover:ring-blue-300'

    // 선택된 셀
    if (selectedCell?.address === cell.address) {
      classes += ' ring-2 ring-blue-500'
    }

    // 매핑된 셀인지 확인
    const isMappedField = Object.values(fieldMappings).includes(cell.address)
    const isMappedSalesCol = Object.values(salesColumnMappings).includes(cell.colLetter)
    const isMappedPurchaseCol = Object.values(purchaseColumnMappings).includes(cell.colLetter)

    if (isMappedField) {
      classes += ' ring-2 ring-green-500'
    }

    // 헤더 행이면서 열 매핑된 경우
    if (cell.row === itemTableHeaderRow && (isMappedSalesCol || isMappedPurchaseCol)) {
      classes += isMappedSalesCol ? ' ring-2 ring-blue-400' : ' ring-2 ring-orange-400'
    }

    // 스타일 기반 - 폰트
    if (cell.style?.font?.bold) {
      classes += ' font-bold'
    }

    return classes
  }

  const getCellInlineStyle = (cell: CellData): React.CSSProperties => {
    const style: React.CSSProperties = {}

    // 폰트 크기
    if (cell.style?.font?.size) {
      style.fontSize = `${Math.min(cell.style.font.size, 14)}px`
    }

    // 배경색 (매핑된 경우 매핑 색상이 우선)
    const isMappedField = Object.values(fieldMappings).includes(cell.address)
    const isMappedSalesCol = Object.values(salesColumnMappings).includes(cell.colLetter)
    const isMappedPurchaseCol = Object.values(purchaseColumnMappings).includes(cell.colLetter)

    if (isMappedField) {
      style.backgroundColor = '#dcfce7' // green-100
    } else if (cell.row === itemTableHeaderRow && isMappedSalesCol) {
      style.backgroundColor = '#dbeafe' // blue-100
    } else if (cell.row === itemTableHeaderRow && isMappedPurchaseCol) {
      style.backgroundColor = '#ffedd5' // orange-100
    } else if (cell.style?.fill?.color) {
      const bgColor = argbToColor(cell.style.fill.color)
      if (bgColor) {
        style.backgroundColor = bgColor
      }
    }

    // 정렬
    if (cell.style?.alignment?.horizontal) {
      style.textAlign = cell.style.alignment.horizontal as 'left' | 'center' | 'right'
    }
    if (cell.style?.alignment?.vertical) {
      style.verticalAlign = cell.style.alignment.vertical as 'top' | 'middle' | 'bottom'
    }

    return style
  }

  const handleSave = async () => {
    if (!name.trim()) {
      alert('양식명을 입력해주세요')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/excel-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          docType,
          sampleFileName: file?.name,
          fieldMappings,
          itemTableHeaderRow,
          itemTableStartRow,
          itemTableEndRow,
          salesColumnMappings,
          purchaseColumnMappings,
          analyzedData,
          isDefault,
        }),
      })

      if (res.ok) {
        router.push('/admin/excel-templates')
      } else {
        const error = await res.json()
        alert(error.error || '저장 실패')
      }
    } catch {
      alert('저장에 실패했습니다')
    } finally {
      setSaving(false)
    }
  }

  const currentSheet = analyzedData?.sheets[selectedSheet]
  const mergeMap = currentSheet ? parseMergedCells(currentSheet.mergedCells) : new Map<string, MergeInfo>()

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link href="/admin/excel-templates" className="hover:text-blue-600">
              엑셀 양식 관리
            </Link>
            <span>/</span>
            <span>새 양식 등록</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">엑셀 양식 등록</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 좌측: 기본 정보 + 파일 업로드 + 매핑 설정 */}
        <div className="space-y-6">
          {/* 기본 정보 */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">기본 정보</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  양식명 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="예: 영업 품의서 양식 A"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  문서 타입 <span className="text-red-500">*</span>
                </label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {docTypeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="isDefault" className="text-sm text-gray-700">기본 양식으로 설정</label>
              </div>
            </div>
          </div>

          {/* 파일 업로드 */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">샘플 엑셀 파일</h2>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={analyzing}
              className="w-full px-4 py-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors disabled:opacity-50"
            >
              {analyzing ? (
                <span className="text-gray-500">분석 중...</span>
              ) : file ? (
                <div className="text-sm">
                  <span className="font-medium text-gray-900">{file.name}</span>
                  <p className="text-gray-500 mt-1">클릭하여 다른 파일 선택</p>
                </div>
              ) : (
                <div className="text-sm text-gray-500">
                  <p>엑셀 파일을 선택하세요</p>
                  <p className="text-xs mt-1">.xlsx, .xls 파일 지원</p>
                </div>
              )}
            </button>
          </div>

          {/* 매핑 설정 */}
          {analyzedData && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h2 className="text-sm font-semibold text-gray-900 mb-4">필드 매핑</h2>
              <p className="text-xs text-gray-500 mb-4">
                {mappingTarget ? (
                  <span className="text-blue-600 font-medium">
                    우측 미리보기에서 &quot;{fieldLabels[mappingTarget]}&quot; 셀을 클릭하세요
                  </span>
                ) : (
                  '아래 버튼을 클릭한 후 우측 미리보기에서 해당 셀을 클릭하세요'
                )}
              </p>

              <div className="space-y-4">
                {/* 문서 정보 필드 */}
                <div>
                  <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">문서 정보</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {['documentDate', 'documentNumber', 'customerCompany', 'customerContact', 'projectName', 'validUntil', 'deliveryDate'].map((field) => (
                      <MappingButton
                        key={field}
                        field={field}
                        label={fieldLabels[field]}
                        value={getMappedValue(field)}
                        isActive={mappingTarget === field}
                        onStart={() => startMapping(field as MappingTarget)}
                        onClear={() => clearMapping(field)}
                      />
                    ))}
                  </div>
                </div>

                {/* 품목 테이블 설정 */}
                <div>
                  <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">품목 테이블 설정</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <MappingButton
                        field="itemTableHeaderRow"
                        label="헤더 행"
                        value={itemTableHeaderRow?.toString() + '행'}
                        isActive={mappingTarget === 'itemTableHeaderRow'}
                        onStart={() => startMapping('itemTableHeaderRow')}
                        onClear={() => {
                          setItemTableHeaderRow(16)
                          setItemTableStartRow(17)
                        }}
                      />
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-600">데이터 시작:</span>
                      <input
                        type="number"
                        value={itemTableStartRow}
                        onChange={(e) => setItemTableStartRow(parseInt(e.target.value) || 17)}
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-center"
                      />
                      <span className="text-gray-600">행</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-600">데이터 종료:</span>
                      <input
                        type="number"
                        value={itemTableEndRow || ''}
                        onChange={(e) => setItemTableEndRow(e.target.value ? parseInt(e.target.value) : null)}
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-center"
                        placeholder="자동"
                      />
                      <span className="text-gray-600">행</span>
                    </div>
                  </div>
                </div>

                {/* 품목 열 매핑 (영업) */}
                <div>
                  <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">품목 열 매핑 (영업)</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {['itemNo', 'itemName', 'itemSpec', 'itemQty', 'itemUnit', 'salesUnitPrice', 'salesTotalPrice', 'remarks'].map((field) => (
                      <MappingButton
                        key={field}
                        field={field}
                        label={fieldLabels[field]}
                        value={getMappedValue(field) ? `${getMappedValue(field)}열` : null}
                        isActive={mappingTarget === field}
                        onStart={() => startMapping(field as MappingTarget)}
                        onClear={() => clearMapping(field)}
                      />
                    ))}
                  </div>
                </div>

                {/* 품목 열 매핑 (매입) */}
                <div>
                  <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">품목 열 매핑 (매입)</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {['purchaseVendor', 'purchaseUnitPrice', 'purchaseTotalPrice'].map((field) => (
                      <MappingButton
                        key={field}
                        field={field}
                        label={fieldLabels[field]}
                        value={getMappedValue(field) ? `${getMappedValue(field)}열` : null}
                        isActive={mappingTarget === field}
                        onStart={() => startMapping(field as MappingTarget)}
                        onClear={() => clearMapping(field)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 저장 버튼 */}
          <div className="flex gap-2">
            <Link
              href="/admin/excel-templates"
              className="flex-1 px-4 py-2 text-center text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              취소
            </Link>
            <button
              onClick={handleSave}
              disabled={saving || !name.trim()}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>

        {/* 우측: 엑셀 미리보기 */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden h-[calc(100vh-200px)] flex flex-col">
            <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between flex-shrink-0">
              <h2 className="text-sm font-semibold text-gray-900">엑셀 미리보기</h2>
              {analyzedData && analyzedData.sheets.length > 1 && (
                <select
                  value={selectedSheet}
                  onChange={(e) => setSelectedSheet(parseInt(e.target.value))}
                  className="text-sm px-2 py-1 border border-gray-300 rounded"
                >
                  {analyzedData.sheets.map((sheet, idx) => (
                    <option key={idx} value={idx}>{sheet.name}</option>
                  ))}
                </select>
              )}
            </div>

            {!analyzedData ? (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <svg className="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-sm">엑셀 파일을 업로드하면</p>
                  <p className="text-sm">미리보기가 표시됩니다</p>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-auto">
                {currentSheet && (
                  <table className="border-collapse min-w-full">
                    <thead className="sticky top-0 z-10 bg-gray-100">
                      <tr>
                        <th className="sticky left-0 z-20 bg-gray-200 border-r border-b border-gray-300 px-2 py-1 text-xs font-medium text-gray-600 w-8">
                          #
                        </th>
                        {currentSheet.rows[0]?.cells.map((_, colIdx) => {
                          const colLetter = String.fromCharCode(65 + colIdx)
                          return (
                            <th
                              key={colIdx}
                              className="border-r border-b border-gray-300 px-2 py-1 text-xs font-medium text-gray-600 min-w-[60px]"
                            >
                              {colLetter}
                            </th>
                          )
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {currentSheet.rows.map((row) => (
                        <tr
                          key={row.row}
                          className={row.row === itemTableHeaderRow ? 'bg-blue-50/50' : ''}
                        >
                          <td className="sticky left-0 bg-gray-100 border-r border-b border-gray-300 px-2 py-1 text-xs font-medium text-gray-600 text-center">
                            {row.row}
                          </td>
                          {row.cells.map((cell) => {
                            // 병합된 셀의 일부인 경우 (시작 셀 제외) 렌더링 하지 않음
                            if (isCellHiddenByMerge(cell.row, cell.col, currentSheet.mergedCells)) {
                              return null
                            }

                            // 병합 시작 셀인 경우 colSpan/rowSpan 적용
                            const mergeInfo = mergeMap.get(cell.address)

                            return (
                              <td
                                key={cell.address}
                                onClick={() => handleCellClick(cell)}
                                className={getCellClasses(cell)}
                                style={getCellInlineStyle(cell)}
                                colSpan={mergeInfo?.colSpan}
                                rowSpan={mergeInfo?.rowSpan}
                                title={`${cell.address}: ${cell.value ?? ''}`}
                              >
                                <div className="max-w-[200px] truncate">
                                  {cell.value instanceof Date
                                    ? cell.value.toLocaleDateString()
                                    : cell.value?.toString() || ''}
                                </div>
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* 선택된 셀 정보 */}
            {selectedCell && (
              <div className="px-4 py-2 border-t bg-gray-50 flex-shrink-0">
                <div className="text-xs text-gray-600">
                  <span className="font-medium">{selectedCell.address}</span>
                  <span className="mx-2">|</span>
                  <span>타입: {selectedCell.type}</span>
                  <span className="mx-2">|</span>
                  <span>값: {selectedCell.value?.toString() || '(비어있음)'}</span>
                  {selectedCell.formula && (
                    <>
                      <span className="mx-2">|</span>
                      <span>수식: {selectedCell.formula}</span>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

interface MappingButtonProps {
  field: string
  label: string
  value: string | null
  isActive: boolean
  onStart: () => void
  onClear: () => void
}

function MappingButton({ label, value, isActive, onStart, onClear }: MappingButtonProps) {
  return (
    <div className={`relative flex items-center gap-1 px-2 py-1.5 rounded border text-xs ${
      isActive
        ? 'border-blue-500 bg-blue-50 text-blue-700'
        : value
        ? 'border-green-300 bg-green-50 text-green-700'
        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
    }`}>
      <button
        onClick={onStart}
        className="flex-1 text-left truncate"
      >
        <span className="font-medium">{label}</span>
        {value && (
          <span className="ml-1 text-xs opacity-75">({value})</span>
        )}
      </button>
      {value && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onClear()
          }}
          className="text-gray-400 hover:text-red-500"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  )
}
