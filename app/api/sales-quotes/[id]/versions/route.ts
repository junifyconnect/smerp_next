import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/sales-quotes/[id]/versions - 같은 Deal의 모든 버전 조회
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    // 현재 견적서 조회
    const currentQuote = await prisma.salesQuote.findUnique({
      where: { id },
      select: { dealId: true },
    })

    if (!currentQuote) {
      return NextResponse.json(
        { error: '견적서를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    if (!currentQuote.dealId) {
      return NextResponse.json({ versions: [], currentId: id })
    }

    // 같은 Deal의 모든 견적서 조회 (생성일 역순)
    const versions = await prisma.salesQuote.findMany({
      where: { dealId: currentQuote.dealId },
      select: {
        id: true,
        status: true,
        quoteDate: true,
        totalWithVat: true,
        createdAt: true,
        projectName: true,
        clientCompany: true,
        items: {
          take: 1,
          select: { description: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // 버전 번호 계산 (생성 순서)
    const sortedByCreation = [...versions].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )

    const versionsWithNumber = versions.map((v) => ({
      ...v,
      version: sortedByCreation.findIndex((s) => s.id === v.id) + 1,
      displayName: v.projectName || v.items[0]?.description || v.clientCompany || v.id.slice(0, 8),
      isCurrent: v.id === id,
    }))

    return NextResponse.json({
      versions: versionsWithNumber,
      currentId: id,
      dealId: currentQuote.dealId,
      totalVersions: versions.length,
    })
  } catch (error) {
    console.error('버전 목록 조회 오류:', error)
    return NextResponse.json(
      { error: '버전 목록 조회에 실패했습니다' },
      { status: 500 }
    )
  }
}
