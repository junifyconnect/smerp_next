import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

// GET: Deal 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const status = searchParams.get('status')
    const search = searchParams.get('search')

    const where: Record<string, unknown> = {}

    if (status) {
      where.status = status
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { customerName: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [items, total] = await Promise.all([
      prisma.deal.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: {
            select: {
              salesQuotes: true,
              salesApprovals: true,
              salesOrders: true,
            },
          },
        },
      }),
      prisma.deal.count({ where }),
    ])

    return NextResponse.json({
      items,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Deal 목록 조회 오류:', error)
    return NextResponse.json({ error: '목록 조회에 실패했습니다' }, { status: 500 })
  }
}

// POST: Deal 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, customerName, ownerId, status } = body

    if (!name) {
      return NextResponse.json({ error: '거래명은 필수입니다' }, { status: 400 })
    }

    const deal = await prisma.deal.create({
      data: {
        name,
        description,
        customerName,
        ownerId,
        status: status || 'QUOTING',
      },
    })

    return NextResponse.json(deal, { status: 201 })
  } catch (error) {
    console.error('Deal 생성 오류:', error)
    return NextResponse.json({ error: '생성에 실패했습니다' }, { status: 500 })
  }
}
