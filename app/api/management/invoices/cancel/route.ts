import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

/**
 * POST /api/management/invoices/cancel
 * 계산서 발행 취소
 *
 * Body:
 *   - id: InvoiceRecord.id (필수)
 *   - reason: 취소 사유 (필수). 자유 입력 또는 코드(예: "USER_CANCELLED", "DUPLICATE", "REVISED")
 *
 * 이미 CANCELLED인 경우 409. 상태(PENDING/ISSUED/NEEDS_AMENDMENT) 모두 가능.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, reason } = body as { id?: string; reason?: string }

    if (!id) {
      return NextResponse.json({ error: 'id가 필요합니다' }, { status: 400 })
    }
    if (!reason || !reason.trim()) {
      return NextResponse.json({ error: '취소 사유(reason)가 필요합니다' }, { status: 400 })
    }

    const record = await prisma.invoiceRecord.findUnique({ where: { id } })
    if (!record) {
      return NextResponse.json(
        { error: '계산서 기록을 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    if (record.status === 'CANCELLED') {
      return NextResponse.json(
        { error: '이미 취소된 계산서입니다' },
        { status: 409 }
      )
    }

    const now = new Date()
    const updated = await prisma.invoiceRecord.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelledAt: now,
        cancelReason: reason.trim(),
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('계산서 취소 오류:', error)
    return NextResponse.json(
      { error: '계산서 취소에 실패했습니다' },
      { status: 500 }
    )
  }
}
