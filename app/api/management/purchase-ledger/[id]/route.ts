import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

// GET /api/management/purchase-ledger/[id] - 매입장 상세 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const ledger = await prisma.purchaseLedger.findUnique({
      where: { id },
    })

    if (!ledger) {
      return NextResponse.json(
        { error: '매입장을 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    return NextResponse.json(ledger)
  } catch (error) {
    console.error('매입장 상세 조회 오류:', error)
    return NextResponse.json(
      { error: '상세 정보를 불러오는데 실패했습니다' },
      { status: 500 }
    )
  }
}

// PUT /api/management/purchase-ledger/[id] - 매입장 수정
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
      invoiceDate,
      vendorCompany,
      clientCompany,
      category,
      subCategory,
      itemName,
      quantity,
      unitPrice,
      supplyAmount,
      vatAmount,
      totalAmount,
      paymentDueDate,
      paymentDate,
      paymentStatus,
      ledgerType,
      currency,
      foreignAmount,
      exchangeRate,
      cardNumber,
    } = body

    // 기존 데이터 확인
    const existing = await prisma.purchaseLedger.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: '매입장을 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    const ledger = await prisma.purchaseLedger.update({
      where: { id },
      data: {
        ...(approvalCode !== undefined && { approvalCode }),
        ...(vendorCode !== undefined && { vendorCode }),
        ...(invoiceDate && { invoiceDate: new Date(invoiceDate) }),
        ...(vendorCompany !== undefined && { vendorCompany }),
        ...(clientCompany !== undefined && { clientCompany }),
        ...(category !== undefined && { category }),
        ...(subCategory !== undefined && { subCategory }),
        ...(itemName !== undefined && { itemName }),
        ...(quantity !== undefined && { quantity }),
        ...(unitPrice !== undefined && { unitPrice }),
        ...(supplyAmount !== undefined && { supplyAmount }),
        ...(vatAmount !== undefined && { vatAmount }),
        ...(totalAmount !== undefined && { totalAmount }),
        ...(paymentDueDate !== undefined && {
          paymentDueDate: paymentDueDate ? new Date(paymentDueDate) : null,
        }),
        ...(paymentDate !== undefined && {
          paymentDate: paymentDate ? new Date(paymentDate) : null,
        }),
        ...(paymentStatus !== undefined && { paymentStatus }),
        ...(ledgerType !== undefined && { ledgerType }),
        ...(currency !== undefined && { currency }),
        ...(foreignAmount !== undefined && { foreignAmount }),
        ...(exchangeRate !== undefined && { exchangeRate }),
        ...(cardNumber !== undefined && { cardNumber }),
      },
    })

    return NextResponse.json(ledger)
  } catch (error) {
    console.error('매입장 수정 오류:', error)
    return NextResponse.json(
      { error: '매입장 수정에 실패했습니다' },
      { status: 500 }
    )
  }
}

// DELETE /api/management/purchase-ledger/[id] - 매입장 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    await prisma.purchaseLedger.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('매입장 삭제 오류:', error)
    return NextResponse.json(
      { error: '매입장 삭제에 실패했습니다' },
      { status: 500 }
    )
  }
}
