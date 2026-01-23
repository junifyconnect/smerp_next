import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { parseExcel, ParsedMAApprovalItem } from '@/lib/excel/parser'
import { parseWithDefaultTemplate } from '@/lib/excel/dynamic-parser'

// POST /api/ma-approvals/upload - 엑셀 업로드
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
      console.log('템플릿이 없어 기본 파서 사용 (MA_APPROVAL)')
      parsed = await parseExcel(buffer, 'MA_APPROVAL')
    } else {
      console.log('동적 템플릿 파서 사용 (MA_APPROVAL)')
    }

    // TODO: 실제 인증된 사용자 ID 사용
    const createdById = 'dummy-user-id'

    // 품의번호 생성
    const year = new Date().getFullYear()
    const lastApproval = await prisma.mAApproval.findFirst({
      where: { approvalNumber: { startsWith: `MA-${year}-` } },
      orderBy: { approvalNumber: 'desc' },
    })

    let sequence = 1
    if (lastApproval) {
      const lastNum = parseInt(lastApproval.approvalNumber.split('-')[2])
      sequence = lastNum + 1
    }
    const approvalNumber = `MA-${year}-${sequence.toString().padStart(4, '0')}`

    // 통합 품목 데이터 처리
    const maApprovalItems = parsed.maApprovalItems || []

    // 금액 계산
    let totalAmount = 0
    let purchaseTotal = 0

    const itemsData = maApprovalItems.map((item: ParsedMAApprovalItem, index: number) => {
      const qty = item.quantity || 1
      const salesPrice = item.salesPrice || 0
      const purchasePrice = item.purchasePrice || 0

      totalAmount += salesPrice * qty
      purchaseTotal += purchasePrice * qty

      return {
        sortOrder: index,
        smCode: item.smCode,
        vendorCode: item.vendorCode,
        clientCompany: item.clientCompany,
        salesCompany: item.salesCompany,
        salesPrice: salesPrice,
        quantity: qty,
        salesBillingType: item.salesBillingType,
        startDate: item.startDate || null,
        endDate: item.endDate || null,
        purchaseCompany: item.purchaseCompany,
        purchasePrice: purchasePrice,
        purchaseBillingType: item.purchaseBillingType,
      }
    })

    const approval = await prisma.mAApproval.create({
      data: {
        approvalNumber,
        approvalDate: parsed.approvalDate || null,
        managerName: parsed.approvalManager,
        notes: parsed.notes,
        totalAmount,
        purchaseTotal,
        createdById,
        items: {
          create: itemsData,
        },
      },
      include: {
        items: true,
      },
    })

    return NextResponse.json(approval, { status: 201 })
  } catch (error) {
    console.error('엑셀 업로드 오류:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '업로드에 실패했습니다' },
      { status: 500 }
    )
  }
}
