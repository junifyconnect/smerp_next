import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET: Deal 상세 조회 (연결된 문서 포함)
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const deal = await prisma.deal.findUnique({
      where: { id },
      include: {
        salesQuotes: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            status: true,
            productName: true,
            clientCompany: true,
            totalAmount: true,
            quoteDate: true,
            createdAt: true,
          },
        },
        salesApprovals: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            approvalNumber: true,
            status: true,
            clientCompany: true,
            totalAmount: true,
            createdAt: true,
          },
        },
        salesOrders: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            orderNumber: true,
            status: true,
            vendorCompany: true,
            totalAmount: true,
            createdAt: true,
          },
        },
      },
    })

    if (!deal) {
      return NextResponse.json({ error: 'Deal을 찾을 수 없습니다' }, { status: 404 })
    }

    return NextResponse.json(deal)
  } catch (error) {
    console.error('Deal 상세 조회 오류:', error)
    return NextResponse.json({ error: '조회에 실패했습니다' }, { status: 500 })
  }
}

// PATCH: Deal 수정
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, description, customerName, ownerId, status } = body

    const deal = await prisma.deal.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(customerName !== undefined && { customerName }),
        ...(ownerId !== undefined && { ownerId }),
        ...(status && { status }),
      },
    })

    return NextResponse.json(deal)
  } catch (error) {
    console.error('Deal 수정 오류:', error)
    return NextResponse.json({ error: '수정에 실패했습니다' }, { status: 500 })
  }
}

// DELETE: Deal 삭제
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    // 연결된 문서가 있는지 확인
    const deal = await prisma.deal.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            salesQuotes: true,
            salesApprovals: true,
            salesOrders: true,
          },
        },
      },
    })

    if (!deal) {
      return NextResponse.json({ error: 'Deal을 찾을 수 없습니다' }, { status: 404 })
    }

    const totalDocs = deal._count.salesQuotes + deal._count.salesApprovals + deal._count.salesOrders
    if (totalDocs > 0) {
      return NextResponse.json(
        { error: '연결된 문서가 있어 삭제할 수 없습니다' },
        { status: 400 }
      )
    }

    await prisma.deal.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Deal 삭제 오류:', error)
    return NextResponse.json({ error: '삭제에 실패했습니다' }, { status: 500 })
  }
}
