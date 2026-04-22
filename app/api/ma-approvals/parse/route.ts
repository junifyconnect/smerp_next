import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { parseExcel } from '@/lib/excel/parser'
import { parseWithDefaultTemplate } from '@/lib/excel/dynamic-parser'

// POST /api/ma-approvals/parse - 엑셀 파싱만 (저장 안함)
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { error: '파일이 필요합니다' },
        { status: 400 }
      )
    }

    // 엑셀 파일 파싱
    const buffer = Buffer.from(await file.arrayBuffer())

    // 1. 먼저 동적 템플릿 파서 시도
    let parsed = await parseWithDefaultTemplate(buffer, 'MA_APPROVAL', prisma)

    // 2. 템플릿이 없으면 기본 파서 사용
    if (!parsed) {
      parsed = await parseExcel(buffer, 'MA_APPROVAL')
    }

    // Date를 문자열로 변환하는 헬퍼
    const formatDate = (date: unknown): string => {
      if (!date) return ''
      if (date instanceof Date) {
        return date.toISOString().split('T')[0]
      }
      if (typeof date === 'string') {
        return date.split('T')[0]
      }
      return ''
    }

    // 품목 데이터 처리
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items = (parsed.maApprovalItems || []).map((item: any) => ({
      smCode: item.smCode || '',
      vendorCode: item.vendorCode || '',
      clientCompany: item.clientCompany || '',
      salesCompany: item.salesCompany || '',
      salesPrice: item.salesPrice || 0,
      quantity: item.quantity || 1,
      salesBillingCycle: item.salesBillingCycle || '',
      startDate: formatDate(item.startDate),
      endDate: formatDate(item.endDate),
      purchaseCompany: item.purchaseCompany || '',
      purchasePrice: item.purchasePrice || 0,
      purchaseBillingCycle: item.purchaseBillingCycle || '',
    }))

    return NextResponse.json({
      approvalDate: parsed.approvalDate || null,
      managerName: parsed.approvalManager || '',
      notes: parsed.notes || '',
      items,
    })
  } catch (error) {
    console.error('엑셀 파싱 오류:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '파싱에 실패했습니다' },
      { status: 500 }
    )
  }
}
