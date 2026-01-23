import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

// GET /api/management/sales-invoice-status/[id] - 매출 계산서 발행현황 상세 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const status = await prisma.salesInvoiceStatus.findUnique({
      where: { id },
      include: {
        paymentHistories: {
          orderBy: { paymentDate: 'desc' },
        },
      },
    })

    if (!status) {
      return NextResponse.json(
        { error: '매출 계산서 발행현황을 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    return NextResponse.json(status)
  } catch (error) {
    console.error('매출 계산서 발행현황 상세 조회 오류:', error)
    return NextResponse.json(
      { error: '상세 정보를 불러오는데 실패했습니다' },
      { status: 500 }
    )
  }
}

// PATCH /api/management/sales-invoice-status/[id] - 매출 계산서 발행현황 수정
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const {
      invoiceDate,
      invoiceNumber,
      invoiceStatus,
      remarks,
    } = body

    // 기존 데이터 확인
    const existing = await prisma.salesInvoiceStatus.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: '매출 계산서 발행현황을 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    const status = await prisma.salesInvoiceStatus.update({
      where: { id },
      data: {
        ...(invoiceDate !== undefined && {
          invoiceDate: invoiceDate ? new Date(invoiceDate) : null,
        }),
        ...(invoiceNumber !== undefined && { invoiceNumber }),
        ...(invoiceStatus !== undefined && { invoiceStatus }),
        ...(remarks !== undefined && { remarks }),
      },
    })

    return NextResponse.json(status)
  } catch (error) {
    console.error('매출 계산서 발행현황 수정 오류:', error)
    return NextResponse.json(
      { error: '매출 계산서 발행현황 수정에 실패했습니다' },
      { status: 500 }
    )
  }
}

// DELETE /api/management/sales-invoice-status/[id] - 매출 계산서 발행현황 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    await prisma.salesInvoiceStatus.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('매출 계산서 발행현황 삭제 오류:', error)
    return NextResponse.json(
      { error: '매출 계산서 발행현황 삭제에 실패했습니다' },
      { status: 500 }
    )
  }
}
