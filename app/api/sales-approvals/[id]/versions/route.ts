import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/sales-approvals/[id]/versions - 같은 품의코드의 모든 버전 조회
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    // 현재 품의서 조회
    const currentApproval = await prisma.salesApproval.findUnique({
      where: { id },
      select: {
        approvalCode: true,
        originalId: true,
        version: true,
      },
    })

    if (!currentApproval) {
      return NextResponse.json(
        { error: '품의서를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    // 같은 품의코드의 모든 버전 조회
    // originalId가 있으면 그걸로, 없으면 현재 id로 (자기가 첫 버전)
    const rootId = currentApproval.originalId || id

    const versions = await prisma.salesApproval.findMany({
      where: {
        OR: [
          { id: rootId },                    // 첫 버전
          { originalId: rootId },            // 그 이후 버전들
        ],
      },
      select: {
        id: true,
        approvalNumber: true,
        approvalCode: true,
        status: true,
        approvalDate: true,
        totalWithVat: true,
        createdAt: true,
        clientCompany: true,
        version: true,
        isLatest: true,
        items: {
          take: 1,
          select: { productName: true },
        },
      },
      orderBy: { version: 'desc' }, // 최신 버전 먼저
    })

    const versionsWithMeta = versions.map((v) => ({
      ...v,
      displayName: `${v.approvalCode || v.approvalNumber} (v${v.version})`,
      isCurrent: v.id === id,
    }))

    return NextResponse.json({
      versions: versionsWithMeta,
      currentId: id,
      approvalCode: currentApproval.approvalCode,
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
