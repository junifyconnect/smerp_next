import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

// GET /api/management/sales-ledger/[id] - 매출장 상세 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const ledger = await prisma.salesLedger.findUnique({
      where: { id },
    })

    if (!ledger) {
      return NextResponse.json(
        { error: '매출장을 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    return NextResponse.json(ledger)
  } catch (error) {
    console.error('매출장 상세 조회 오류:', error)
    return NextResponse.json(
      { error: '상세 정보를 불러오는데 실패했습니다' },
      { status: 500 }
    )
  }
}

// PUT /api/management/sales-ledger/[id] - 매출장 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const {
      approvalCode,
      vendorCode,
      transactionDate,
      clientCompany,
      endUser,
      category,
      subCategory,
      description,
      quantity,
      unitPrice,
      supplyAmount,
      vatAmount,
      totalAmount,
      grossProfit,
      paymentDueDate,
      paymentDate,
      paymentStatus,
      managerId,
      managerName,
    } = body

    // 기존 데이터 확인
    const existing = await prisma.salesLedger.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: '매출장을 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    const ledger = await prisma.salesLedger.update({
      where: { id },
      data: {
        ...(approvalCode !== undefined && { approvalCode }),
        ...(vendorCode !== undefined && { vendorCode }),
        ...(transactionDate && { transactionDate: new Date(transactionDate) }),
        ...(clientCompany !== undefined && { clientCompany }),
        ...(endUser !== undefined && { endUser }),
        ...(category !== undefined && { category }),
        ...(subCategory !== undefined && { subCategory }),
        ...(description !== undefined && { description }),
        ...(quantity !== undefined && { quantity }),
        ...(unitPrice !== undefined && { unitPrice }),
        ...(supplyAmount !== undefined && { supplyAmount }),
        ...(vatAmount !== undefined && { vatAmount }),
        ...(totalAmount !== undefined && { totalAmount }),
        ...(grossProfit !== undefined && { grossProfit }),
        ...(paymentDueDate !== undefined && {
          paymentDueDate: paymentDueDate ? new Date(paymentDueDate) : null,
        }),
        ...(paymentDate !== undefined && {
          paymentDate: paymentDate ? new Date(paymentDate) : null,
        }),
        ...(paymentStatus !== undefined && { paymentStatus }),
        ...(managerId !== undefined && { managerId }),
        ...(managerName !== undefined && { managerName }),
      },
    })

    return NextResponse.json(ledger)
  } catch (error) {
    console.error('매출장 수정 오류:', error)
    return NextResponse.json(
      { error: '매출장 수정에 실패했습니다' },
      { status: 500 }
    )
  }
}

// DELETE /api/management/sales-ledger/[id] - 매출장 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    await prisma.salesLedger.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('매출장 삭제 오류:', error)
    return NextResponse.json(
      { error: '매출장 삭제에 실패했습니다' },
      { status: 500 }
    )
  }
}
