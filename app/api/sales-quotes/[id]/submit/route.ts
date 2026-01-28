import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { auth } from '@/lib/auth'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/sales-quotes/[id]/submit - 기안하기 (DRAFT → SENT)
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    const { id } = await params
    const currentUserId = session?.user?.id

    // 견적서 조회
    const quote = await prisma.salesQuote.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        createdById: true,
        projectName: true,
      },
    })

    if (!quote) {
      return NextResponse.json(
        { error: '견적서를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    // 작성자 본인만 기안 가능
    if (quote.createdById !== currentUserId) {
      return NextResponse.json(
        { error: '본인이 작성한 견적서만 발송할 수 있습니다' },
        { status: 403 }
      )
    }

    // DRAFT 상태만 기안 가능
    if (quote.status !== 'DRAFT') {
      return NextResponse.json(
        { error: '작성중 상태의 견적서만 발송할 수 있습니다' },
        { status: 400 }
      )
    }

    // 상태를 SENT로 변경
    const updatedQuote = await prisma.salesQuote.update({
      where: { id },
      data: {
        status: 'SENT',
      },
      select: {
        id: true,
        projectName: true,
        status: true,
      },
    })

    return NextResponse.json({
      message: '견적서가 발송 처리되었습니다',
      quote: updatedQuote,
    })
  } catch (error) {
    console.error('견적서 발송 처리 오류:', error)
    return NextResponse.json(
      { error: '발송 처리에 실패했습니다' },
      { status: 500 }
    )
  }
}
