import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/sales-orders/[id]/versions - 같은 원본의 모든 버전 조회
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    // 현재 발주서 조회
    const currentOrder = await prisma.salesOrder.findUnique({
      where: { id },
      select: {
        originalId: true,
        version: true,
      },
    })

    if (!currentOrder) {
      return NextResponse.json(
        { error: '발주서를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    // 같은 원본의 모든 버전 조회
    // originalId가 있으면 그걸로, 없으면 현재 id로 (자기가 첫 버전)
    const rootId = currentOrder.originalId || id

    const versions = await prisma.salesOrder.findMany({
      where: {
        OR: [
          { id: rootId },                    // 첫 버전
          { originalId: rootId },            // 그 이후 버전들
        ],
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        orderDate: true,
        totalWithVat: true,
        createdAt: true,
        vendorCompany: true,
        version: true,
        isLatest: true,
        items: {
          take: 1,
          select: { description: true },
        },
      },
      orderBy: { version: 'desc' }, // 최신 버전 먼저
    })

    const versionsWithMeta = versions.map((v) => ({
      ...v,
      displayName: v.orderNumber || v.vendorCompany || v.items[0]?.description || `v${v.version}`,
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
