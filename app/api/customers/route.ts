import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

// GET /api/customers - 거래처 목록 조회 (검색 포함)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit
    const includeContacts = searchParams.get('includeContacts') === 'true'

    const where = search
      ? {
          isActive: true,
          companyName: { contains: search, mode: 'insensitive' as const },
        }
      : { isActive: true }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        orderBy: { companyName: 'asc' },
        skip,
        take: limit,
        include: includeContacts ? {
          contacts: {
            where: { isActive: true },
            orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
          },
        } : undefined,
      }),
      prisma.customer.count({ where }),
    ])

    return NextResponse.json({
      items: customers,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('거래처 조회 실패:', error)
    return NextResponse.json(
      { error: '거래처 조회에 실패했습니다' },
      { status: 500 }
    )
  }
}

// POST /api/customers - 거래처 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const customer = await prisma.customer.create({
      data: {
        companyName: body.companyName,
        phone: body.phone,
        fax: body.fax,
        address: body.address,
        notes: body.notes,
        // 담당자도 함께 생성
        contacts: body.contacts?.length > 0 ? {
          create: body.contacts.map((contact: any, index: number) => ({
            name: contact.name,
            department: contact.department,
            position: contact.position,
            phone: contact.phone,
            mobile: contact.mobile,
            email: contact.email,
            isDefault: index === 0, // 첫 번째 담당자를 기본으로
          })),
        } : undefined,
      },
      include: {
        contacts: true,
      },
    })

    return NextResponse.json(customer, { status: 201 })
  } catch (error) {
    console.error('거래처 생성 실패:', error)
    return NextResponse.json(
      { error: '거래처 생성에 실패했습니다' },
      { status: 500 }
    )
  }
}
