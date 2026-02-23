import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { auth } from '@/lib/auth'

// 품목 타입
interface ItemInput {
  partNumber?: string
  description?: string
  quantity?: number
  unitPrice?: number
  sortOrder?: number
}

// 제품 그룹 타입
interface ProductInput {
  name: string
  quantity?: number
  unitPrice?: number
  items?: ItemInput[]
  sortOrder?: number
}

// GET /api/sales-quotes - 목록 조회
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    const currentUserId = session?.user?.id

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const includeAllVersions = searchParams.get('allVersions') === 'true'

    const where: Record<string, unknown> = {}

    // 기본적으로 최신 버전만 조회
    if (!includeAllVersions) {
      where.isLatest = { not: false }
    }

    // DRAFT는 작성자 본인만, 나머지는 모두 볼 수 있음
    if (status === 'DRAFT') {
      where.status = 'DRAFT'
      if (currentUserId) {
        where.createdById = currentUserId
      }
    } else if (status) {
      where.status = status
    } else {
      where.OR = [
        { status: { not: 'DRAFT' } },
        ...(currentUserId ? [{ status: 'DRAFT', createdById: currentUserId }] : []),
      ]
    }

    if (search) {
      where.AND = [
        {
          OR: [
            { projectName: { contains: search, mode: 'insensitive' } },
            { clientCompany: { contains: search, mode: 'insensitive' } },
          ],
        },
      ]
    }

    const [items, total] = await Promise.all([
      prisma.salesQuote.findMany({
        where,
        include: {
          createdBy: { select: { id: true, name: true } },
          _count: { select: { products: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.salesQuote.count({ where }),
    ])

    return NextResponse.json({
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('견적서 목록 조회 오류:', error)
    return NextResponse.json(
      { error: '목록을 불러오는데 실패했습니다' },
      { status: 500 }
    )
  }
}

// POST /api/sales-quotes - 생성
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    const createdById = session?.user?.id

    const body = await request.json()
    const {
      projectName,
      managerName,
      clientCompany,
      clientContact,
      clientPhone,
      clientFax,
      clientMobile,
      clientCP,
      clientEmail,
      quoteDate,
      validUntil,
      deliveryDate,
      paymentTerms,
      notes,
      products = [] as ProductInput[],
    } = body

    // 금액 계산
    let totalAmount = 0
    const productsData = products.map((product: ProductInput, pIdx: number) => {
      const qty = product.quantity || 1
      const price = product.unitPrice || 0
      const productTotal = qty * price
      totalAmount += productTotal

      return {
        sortOrder: product.sortOrder ?? pIdx,
        name: product.name,
        quantity: qty,
        unitPrice: price,
        totalPrice: productTotal,
        items: (product.items || []).map((item: ItemInput, iIdx: number) => ({
          sortOrder: item.sortOrder ?? iIdx,
          partNumber: item.partNumber,
          description: item.description,
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice || 0,
          totalPrice: (item.quantity || 1) * (item.unitPrice || 0),
        })),
      }
    })

    const vatAmount = Math.round(totalAmount * 0.1)
    const totalWithVat = totalAmount + vatAmount

    // 견적서 생성
    const quote = await prisma.salesQuote.create({
      data: {
        ...(createdById && { createdBy: { connect: { id: createdById } } }),
        projectName,
        managerName,
        clientCompany,
        clientContact,
        clientPhone,
        clientFax,
        clientMobile: clientMobile || clientCP,
        clientEmail,
        quoteDate: quoteDate ? new Date(quoteDate) : null,
        validUntil,
        deliveryDate: deliveryDate && deliveryDate !== '별도협의' ? new Date(deliveryDate) : null,
        paymentTerms,
        notes,
        totalAmount,
        vatAmount,
        totalWithVat,
      },
    })

    // 제품 + 품목 생성
    for (const p of productsData) {
      const createdProduct = await prisma.salesQuoteProduct.create({
        data: {
          quoteId: quote.id,
          sortOrder: p.sortOrder,
          name: p.name,
          quantity: p.quantity,
          unitPrice: p.unitPrice,
          totalPrice: p.totalPrice,
        },
      })

      if (p.items.length > 0) {
        await prisma.salesQuoteItem.createMany({
          data: p.items.map((item: { sortOrder: number; partNumber?: string; description?: string; quantity: number; unitPrice: number; totalPrice: number }) => ({
            productId: createdProduct.id,
            ...item,
          })),
        })
      }
    }

    // 결과 조회
    const result = await prisma.salesQuote.findUnique({
      where: { id: quote.id },
      include: {
        products: {
          include: { items: { orderBy: { sortOrder: 'asc' } } },
          orderBy: { sortOrder: 'asc' },
        },
        createdBy: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('견적서 생성 오류:', error)
    return NextResponse.json(
      { error: '견적서 생성에 실패했습니다' },
      { status: 500 }
    )
  }
}
