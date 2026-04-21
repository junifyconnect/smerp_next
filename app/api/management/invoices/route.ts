import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

/**
 * GET /api/management/invoices?approvalId=...&invoiceType=SALES|PURCHASE&includeCancelled=true
 *
 * 품의서 기준 InvoiceRecord 목록 조회. 체인 구조를 그대로 반환한다.
 * 응답 각 레코드는 amendedFromId와 amendments 관계를 포함해 UI에서 체인 시각화 가능.
 *
 * approvalId는 특정 버전 품의서의 id. 체인 루트 기준으로 묶고 싶으면 프론트에서 품의서의 originalId를 먼저 조회 후 전달.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const approvalId = searchParams.get('approvalId')
    const invoiceType = searchParams.get('invoiceType') as 'SALES' | 'PURCHASE' | null
    const includeCancelled = searchParams.get('includeCancelled') !== 'false' // 기본 true

    if (!approvalId) {
      return NextResponse.json(
        { error: 'approvalId가 필요합니다' },
        { status: 400 }
      )
    }

    const where: Record<string, unknown> = { approvalId }
    if (invoiceType) where.invoiceType = invoiceType
    if (!includeCancelled) where.status = { not: 'CANCELLED' }

    const records = await prisma.invoiceRecord.findMany({
      where,
      include: {
        amendedFrom: { select: { id: true, status: true, invoiceNumber: true, invoiceDate: true } },
        amendments: {
          select: { id: true, status: true, invoiceNumber: true, invoiceDate: true, createdAt: true },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: [{ invoiceType: 'asc' }, { createdAt: 'asc' }],
    })

    return NextResponse.json({
      approvalId,
      count: records.length,
      items: records,
    })
  } catch (error) {
    console.error('계산서 체인 조회 오류:', error)
    return NextResponse.json(
      { error: '계산서 체인 조회에 실패했습니다' },
      { status: 500 }
    )
  }
}
