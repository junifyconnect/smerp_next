import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { parseExcel, ParsedItem, ParsedPurchaseItem } from '@/lib/excel/parser'

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
    const parsed = await parseExcel(buffer, 'MA_APPROVAL')

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

    // 매출 금액 계산
    let totalAmount = 0
    const itemsWithTotal = (parsed.items || []).map((item: ParsedItem, index: number) => {
      const qty = item.quantity || 1
      const price = item.unitPrice || 0
      totalAmount += price * qty
      return {
        smCode: item.partNumber,
        customerName: item.description,
        salesPrice: price,
        quantity: qty,
        sortOrder: index,
      }
    })

    // 매입 금액 계산
    let purchaseTotal = 0
    const purchaseItemsWithTotal = (parsed.purchaseItems || []).map((item: ParsedPurchaseItem, index: number) => {
      const qty = item.quantity || 1
      const price = item.unitPrice || 0
      purchaseTotal += price * qty
      return {
        vendorCompany: item.vendorCompany,
        purchasePrice: price,
        quantity: qty,
        sortOrder: index,
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
          create: itemsWithTotal,
        },
        purchaseItems: {
          create: purchaseItemsWithTotal,
        },
      },
      include: {
        items: true,
        purchaseItems: true,
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
