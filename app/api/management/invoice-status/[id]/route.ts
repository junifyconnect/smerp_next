import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

// GET /api/management/invoice-status/[id] - 계산서 발행현황 상세 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const status = await prisma.invoiceStatus.findUnique({
      where: { id },
    })

    if (!status) {
      return NextResponse.json(
        { error: '계산서 발행현황을 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    return NextResponse.json(status)
  } catch (error) {
    console.error('계산서 발행현황 상세 조회 오류:', error)
    return NextResponse.json(
      { error: '상세 정보를 불러오는데 실패했습니다' },
      { status: 500 }
    )
  }
}

// PUT /api/management/invoice-status/[id] - 계산서 발행현황 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const {
      approvalCode,
      partNumber,
      itemName,
      clientCompany,
      quantity,
      unitPrice,
      totalPrice,
      batchTotal,
      invoiceDate,
      invoiceStatus,
      remarks,
      yearMonth,
    } = body

    // 기존 데이터 확인
    const existing = await prisma.invoiceStatus.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: '계산서 발행현황을 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    const status = await prisma.invoiceStatus.update({
      where: { id },
      data: {
        ...(approvalCode !== undefined && { approvalCode }),
        ...(partNumber !== undefined && { partNumber }),
        ...(itemName !== undefined && { itemName }),
        ...(clientCompany !== undefined && { clientCompany }),
        ...(quantity !== undefined && { quantity }),
        ...(unitPrice !== undefined && { unitPrice }),
        ...(totalPrice !== undefined && { totalPrice }),
        ...(batchTotal !== undefined && { batchTotal }),
        ...(invoiceDate !== undefined && {
          invoiceDate: invoiceDate ? new Date(invoiceDate) : null,
        }),
        ...(invoiceStatus !== undefined && { invoiceStatus }),
        ...(remarks !== undefined && { remarks }),
        ...(yearMonth !== undefined && { yearMonth }),
      },
    })

    return NextResponse.json(status)
  } catch (error) {
    console.error('계산서 발행현황 수정 오류:', error)
    return NextResponse.json(
      { error: '계산서 발행현황 수정에 실패했습니다' },
      { status: 500 }
    )
  }
}

// DELETE /api/management/invoice-status/[id] - 계산서 발행현황 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    await prisma.invoiceStatus.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('계산서 발행현황 삭제 오류:', error)
    return NextResponse.json(
      { error: '계산서 발행현황 삭제에 실패했습니다' },
      { status: 500 }
    )
  }
}
