import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

// 품목 타입
interface ItemInput {
  partNumber?: string
  description?: string
  quantity?: number
  srpPrice?: number
  unitPrice?: number
  sortOrder?: number
}

// 제품 그룹 타입
interface ProductInput {
  name: string
  quantity?: number
  srpPrice?: number
  unitPrice?: number
  isConsolidated?: boolean
  consolidatedPrice?: number // 레거시 호환
  items?: ItemInput[]
  sortOrder?: number
}

// GET /api/sales-quotes - 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const dealId = searchParams.get('dealId')

    const where: Record<string, unknown> = {}

    if (status) {
      where.status = status
    }

    if (dealId) {
      where.dealId = dealId
    }

    if (search) {
      where.OR = [
        { productName: { contains: search, mode: 'insensitive' } },
        { projectName: { contains: search, mode: 'insensitive' } },
        { clientCompany: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [items, total] = await Promise.all([
      prisma.salesQuote.findMany({
        where,
        include: {
          createdBy: { select: { id: true, name: true } },
          deal: { select: { id: true, name: true, status: true } },
          _count: { select: { items: true, products: true } },
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
      // 새 구조: 제품 그룹 + 독립 품목
      products = [] as ProductInput[],
      standaloneItems = [] as ItemInput[],
      // 레거시 호환: 기존 flat items 구조
      items = [] as ItemInput[],
      isConsolidated = false,
      consolidatedName,
      consolidatedPrice,
    } = body

    // Deal 자동 생성
    const firstProductName = products[0]?.name
    const firstItemDesc = items[0]?.description || standaloneItems[0]?.description
    const dealName = projectName || firstProductName || firstItemDesc || clientCompany || `견적서 ${new Date().toLocaleDateString('ko-KR')}`
    const deal = await prisma.deal.create({
      data: {
        name: dealName,
        customerName: clientCompany || null,
      },
    })

    // 새 구조 사용 여부 판단 (products가 있으면 새 구조)
    const useNewStructure = products.length > 0 || standaloneItems.length > 0

    let totalAmount = 0

    if (useNewStructure) {
      // 새 구조: 제품별 금액 계산
      const productsData = products.map((product: ProductInput, pIdx: number) => {
        const qty = product.quantity || 1
        const unitPrice = product.unitPrice || product.consolidatedPrice || 0
        const productTotal = qty * unitPrice

        totalAmount += productTotal

        // 참고용 상세 품목
        const productItems = (product.items || []).map((item: ItemInput, iIdx: number) => {
          return {
            sortOrder: item.sortOrder ?? iIdx,
            partNumber: item.partNumber,
            description: item.description,
            quantity: item.quantity || 1,
            srpPrice: item.srpPrice,
            unitPrice: item.unitPrice || 0,
            totalPrice: (item.quantity || 1) * (item.unitPrice || 0),
          }
        })

        return {
          sortOrder: product.sortOrder ?? pIdx,
          name: product.name,
          quantity: qty,
          srpPrice: product.srpPrice,
          unitPrice: unitPrice,
          totalPrice: productTotal,
          isConsolidated: true,
          consolidatedPrice: productTotal, // 레거시 호환
          items: productItems,
        }
      })

      // 독립 품목 금액 계산
      const standaloneItemsData = standaloneItems.map((item: ItemInput, idx: number) => {
        const qty = item.quantity || 1
        const price = item.unitPrice || 0
        const itemTotal = qty * price
        totalAmount += itemTotal
        return {
          sortOrder: item.sortOrder ?? (idx + 1000), // 독립 품목은 뒤에 정렬
          partNumber: item.partNumber,
          description: item.description,
          quantity: qty,
          srpPrice: item.srpPrice,
          unitPrice: price,
          totalPrice: itemTotal,
        }
      })

      const vatAmount = Math.round(totalAmount * 0.1)
      const totalWithVat = totalAmount + vatAmount

      // 1. 견적서 기본 정보 생성
      const quote = await prisma.salesQuote.create({
        data: {
          deal: { connect: { id: deal.id } },
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
          // 독립 품목 생성
          items: {
            create: standaloneItemsData,
          },
        },
      })

      // 2. 제품 및 제품 소속 품목 생성
      for (const p of productsData) {
        const createdProduct = await prisma.salesQuoteProduct.create({
          data: {
            quoteId: quote.id,
            sortOrder: p.sortOrder,
            name: p.name,
            quantity: p.quantity,
            srpPrice: p.srpPrice,
            unitPrice: p.unitPrice,
            totalPrice: p.totalPrice,
            isConsolidated: p.isConsolidated,
            consolidatedPrice: p.consolidatedPrice,
          },
        })

        // 제품 소속 품목 생성
        if (p.items && p.items.length > 0) {
          await prisma.salesQuoteItem.createMany({
            data: p.items.map(item => ({
              quoteId: quote.id,
              productId: createdProduct.id,
              ...item,
            })),
          })
        }
      }

      // 3. 최종 결과 조회
      const result = await prisma.salesQuote.findUnique({
        where: { id: quote.id },
        include: {
          products: {
            include: { items: { orderBy: { sortOrder: 'asc' } } },
            orderBy: { sortOrder: 'asc' },
          },
          items: { where: { productId: null }, orderBy: { sortOrder: 'asc' } },
          deal: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
        },
      })

      return NextResponse.json(result, { status: 201 })
    } else {
      // 레거시 구조: 기존 flat items
      const itemsWithTotal = items.map((item: ItemInput, index: number) => {
        const qty = item.quantity || 1
        const price = item.unitPrice || 0
        const itemTotal = qty * price
        totalAmount += itemTotal
        return {
          sortOrder: item.sortOrder ?? index,
          partNumber: item.partNumber,
          description: item.description,
          quantity: qty,
          srpPrice: item.srpPrice,
          unitPrice: price,
          totalPrice: itemTotal,
        }
      })

      if (isConsolidated && consolidatedPrice) {
        totalAmount = consolidatedPrice
      }

      const vatAmount = Math.round(totalAmount * 0.1)
      const totalWithVat = totalAmount + vatAmount

      const quote = await prisma.salesQuote.create({
        data: {
          deal: { connect: { id: deal.id } },
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
          isConsolidated,
          consolidatedName: isConsolidated ? consolidatedName : null,
          consolidatedPrice: isConsolidated ? consolidatedPrice : null,
          items: {
            create: itemsWithTotal,
          },
        },
        include: {
          items: { orderBy: { sortOrder: 'asc' } },
          deal: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
        },
      })

      return NextResponse.json(quote, { status: 201 })
    }
  } catch (error) {
    console.error('견적서 생성 오류:', error)
    return NextResponse.json(
      { error: '견적서 생성에 실패했습니다' },
      { status: 500 }
    )
  }
}
