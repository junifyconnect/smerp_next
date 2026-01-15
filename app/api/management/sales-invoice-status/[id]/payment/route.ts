import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { Decimal } from '@prisma/client/runtime/library'

// POST /api/management/sales-invoice-status/[id]/payment - 결제내역 추가
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const { paymentDate, paymentAmount, paymentMethod, remarks } = body

    if (!paymentDate || !paymentAmount) {
      return NextResponse.json(
        { error: '결제일과 결제금액은 필수입니다' },
        { status: 400 }
      )
    }

    // 기존 계산서 발행현황 조회
    const invoice = await prisma.salesInvoiceStatus.findUnique({
      where: { id },
    })

    if (!invoice) {
      return NextResponse.json(
        { error: '매출 계산서 발행현황을 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    // 결제내역 생성
    const payment = await prisma.salesPaymentHistory.create({
      data: {
        salesInvoiceStatusId: id,
        paymentDate: new Date(paymentDate),
        paymentAmount,
        paymentMethod,
        remarks,
      },
    })

    // 결제 금액 업데이트
    const newPaidAmount = new Decimal(invoice.paidAmount).plus(paymentAmount)
    const newRemainAmount = new Decimal(invoice.totalPrice).minus(newPaidAmount)

    // 결제 상태 결정
    let paymentStatus: 'PENDING' | 'PARTIAL' | 'COMPLETED' = 'PENDING'
    if (newRemainAmount.lessThanOrEqualTo(0)) {
      paymentStatus = 'COMPLETED'
    } else if (newPaidAmount.greaterThan(0)) {
      paymentStatus = 'PARTIAL'
    }

    // 계산서 발행현황 업데이트
    const updatedInvoice = await prisma.salesInvoiceStatus.update({
      where: { id },
      data: {
        paidAmount: newPaidAmount,
        remainAmount: newRemainAmount.lessThan(0) ? 0 : newRemainAmount,
        paymentStatus,
      },
      include: {
        paymentHistories: {
          orderBy: { paymentDate: 'desc' },
        },
      },
    })

    return NextResponse.json({
      payment,
      invoice: updatedInvoice,
    }, { status: 201 })
  } catch (error) {
    console.error('결제내역 추가 오류:', error)
    return NextResponse.json(
      { error: '결제내역 추가에 실패했습니다' },
      { status: 500 }
    )
  }
}

// DELETE /api/management/sales-invoice-status/[id]/payment - 결제내역 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const paymentId = searchParams.get('paymentId')

    if (!paymentId) {
      return NextResponse.json(
        { error: 'paymentId가 필요합니다' },
        { status: 400 }
      )
    }

    // 결제내역 조회
    const payment = await prisma.salesPaymentHistory.findUnique({
      where: { id: paymentId },
    })

    if (!payment || payment.salesInvoiceStatusId !== id) {
      return NextResponse.json(
        { error: '결제내역을 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    // 결제내역 삭제
    await prisma.salesPaymentHistory.delete({
      where: { id: paymentId },
    })

    // 계산서 발행현황 조회
    const invoice = await prisma.salesInvoiceStatus.findUnique({
      where: { id },
    })

    if (!invoice) {
      return NextResponse.json({ success: true })
    }

    // 결제 금액 업데이트
    const newPaidAmount = new Decimal(invoice.paidAmount).minus(payment.paymentAmount)
    const newRemainAmount = new Decimal(invoice.totalPrice).minus(newPaidAmount)

    // 결제 상태 결정
    let paymentStatus: 'PENDING' | 'PARTIAL' | 'COMPLETED' = 'PENDING'
    if (newRemainAmount.lessThanOrEqualTo(0)) {
      paymentStatus = 'COMPLETED'
    } else if (newPaidAmount.greaterThan(0)) {
      paymentStatus = 'PARTIAL'
    }

    // 계산서 발행현황 업데이트
    const updatedInvoice = await prisma.salesInvoiceStatus.update({
      where: { id },
      data: {
        paidAmount: newPaidAmount.lessThan(0) ? 0 : newPaidAmount,
        remainAmount: newRemainAmount,
        paymentStatus,
      },
      include: {
        paymentHistories: {
          orderBy: { paymentDate: 'desc' },
        },
      },
    })

    return NextResponse.json({
      success: true,
      invoice: updatedInvoice,
    })
  } catch (error) {
    console.error('결제내역 삭제 오류:', error)
    return NextResponse.json(
      { error: '결제내역 삭제에 실패했습니다' },
      { status: 500 }
    )
  }
}
