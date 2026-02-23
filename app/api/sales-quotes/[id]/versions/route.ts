import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * @deprecated 견적서는 버전 관리 기능 사용 안 함 (UI에서 제거됨)
 * GET /api/sales-quotes/[id]/versions - 같은 원본의 모든 버전 조회
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const currentQuote = await prisma.salesQuote.findUnique({
      where: { id },
      select: {
        originalId: true,
        version: true,
      },
    })

    if (!currentQuote) {
      return NextResponse.json(
        { error: '견적서를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    const rootId = currentQuote.originalId || id

    const versions = await prisma.salesQuote.findMany({
      where: {
        OR: [
          { id: rootId },
          { originalId: rootId },
        ],
      },
      select: {
        id: true,
        status: true,
        quoteDate: true,
        totalWithVat: true,
        createdAt: true,
        projectName: true,
        clientCompany: true,
        version: true,
        isLatest: true,
      },
      orderBy: { version: 'desc' },
    })

    const versionsWithMeta = versions.map((v) => ({
      ...v,
      displayName: v.projectName || v.clientCompany || `v${v.version}`,
      isCurrent: v.id === id,
    }))

    return NextResponse.json({
      versions: versionsWithMeta,
      currentId: id,
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
