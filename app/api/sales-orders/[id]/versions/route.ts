import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/sales-orders/[id]/versions - 같은 Deal의 모든 버전 조회
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    // 현재 발주서 조회
    const currentOrder = await prisma.salesOrder.findUnique({
      where: { id },
      select: { dealId: true },
    })

    if (!currentOrder) {
      return NextResponse.json(
        { error: '발주서를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    if (!currentOrder.dealId) {
      return NextResponse.json({ versions: [], currentId: id })
    }

    // 같은 Deal의 모든 발주서 조회 (생성일 역순)
    const versions = await prisma.salesOrder.findMany({
      where: { dealId: currentOrder.dealId },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        orderDate: true,
        totalWithVat: true,
        createdAt: true,
        vendorCompany: true,
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
      displayName: v.orderNumber || v.vendorCompany || v.items[0]?.description || v.id.slice(0, 8),
      isCurrent: v.id === id,
    }))

    return NextResponse.json({
      versions: versionsWithNumber,
      currentId: id,
      dealId: currentOrder.dealId,
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
