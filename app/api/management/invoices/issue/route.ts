import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

/**
 * POST /api/management/invoices/issue
 * 계산서 발행: PENDING → ISSUED
 *
 * Body:
 *   - id: InvoiceRecord.id (필수)
 *   - invoiceDate?: string (ISO). 미지정 시 오늘
 *   - invoiceNumber?: string (세금계산서 번호)
 *   - remarks?: string (기타사항)
 *
 * NEEDS_AMENDMENT 상태는 발행 불가 — 먼저 /amend를 호출해 수정 레코드를 만든 뒤 새 레코드를 issue 해야 한다.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, invoiceDate, invoiceNumber, remarks } = body as {
      id?: string
      invoiceDate?: string
      invoiceNumber?: string
      remarks?: string
    }

    if (!id) {
      return NextResponse.json({ error: 'id가 필요합니다' }, { status: 400 })
    }

    const record = await prisma.invoiceRecord.findUnique({ where: { id } })
    if (!record) {
      return NextResponse.json(
        { error: '계산서 기록을 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    if (record.status !== 'PENDING') {
      return NextResponse.json(
        {
          error: `현재 상태(${record.status})에서는 발행할 수 없습니다. PENDING 상태만 발행 가능합니다. NEEDS_AMENDMENT는 먼저 /amend 호출 필요.`,
        },
        { status: 409 }
      )
    }

    const updated = await prisma.invoiceRecord.update({
      where: { id },
      data: {
        status: 'ISSUED',
        invoiceDate: invoiceDate ? new Date(invoiceDate) : new Date(),
        invoiceNumber: invoiceNumber ?? record.invoiceNumber,
        remarks: remarks ?? record.remarks,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('계산서 발행 오류:', error)
    return NextResponse.json(
      { error: '계산서 발행에 실패했습니다' },
      { status: 500 }
    )
  }
}
