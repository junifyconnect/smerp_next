import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { auth } from '@/lib/auth'

// 품목 타입
interface ItemInput {
  partNumber?: string
  description?: string
  quantity?: number
  salesUnitPrice?: number
  purchaseUnitPrice?: number  // 새 필드명
  vendorName?: string
  vendorCompany?: string  // 새 필드명
  purchaseQty?: number
  purchasePrice?: number
  purchaseTotal?: number
  purchaseDate?: string
  sortOrder?: number
}

// 제품 타입
interface ProductInput {
  name: string
  quantity?: number
  unitPrice?: number
  salesUnitPrice?: number
  purchaseUnitPrice?: number
  vendorCompany?: string
  items?: ItemInput[]
  sortOrder?: number
}

// GET /api/sales-approvals - 목록 조회
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

    if (!includeAllVersions) {
      where.isLatest = { not: false }
    }

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
            { approvalNumber: { contains: search, mode: 'insensitive' } },
            { approvalCode: { contains: search, mode: 'insensitive' } },
            { clientCompany: { contains: search, mode: 'insensitive' } },
          ],
        },
      ]
    }

    const [items, total] = await Promise.all([
      prisma.salesApproval.findMany({
        where,
        include: {
          _count: { select: { products: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.salesApproval.count({ where }),
    ])

    return NextResponse.json({
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('품의서 목록 조회 오류:', error)
    return NextResponse.json(
      { error: '목록을 불러오는데 실패했습니다' },
      { status: 500 }
    )
  }
}

// POST /api/sales-approvals - 생성
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    const body = await request.json()
    const {
      quoteId,
      approvalCode,
      approvalDate,
      managerName,
      clientCompany,
      clientContact,
      clientPhone,
      endUser,
      paymentTerms,
      deliveryAddress,
      deliveryDate,
      invoiceEmail,
      receiverName,
      receiverPhone,
      notes,
      products = [] as ProductInput[],
    } = body

    const createdById = session?.user?.id || 'dummy-user-id'
    const userEmail = session?.user?.email || ''
    const userId = userEmail.split('@')[0] || ''

    // 품의번호 생성
    const year = new Date().getFullYear()
    const lastApproval = await prisma.salesApproval.findFirst({
      where: { approvalNumber: { startsWith: `SA-${year}-` } },
      orderBy: { approvalNumber: 'desc' },
    })
    let sequence = 1
    if (lastApproval) {
      const lastNum = parseInt(lastApproval.approvalNumber.split('-')[2])
      sequence = lastNum + 1
    }
    const approvalNumber = `SA-${year}-${sequence.toString().padStart(4, '0')}`

    // 품의코드 자동생성
    let finalApprovalCode = approvalCode
    if (finalApprovalCode) {
      const existing = await prisma.salesApproval.findFirst({
        where: { approvalCode: finalApprovalCode },
      })
      if (existing) {
        return NextResponse.json(
          { error: `품의코드 '${finalApprovalCode}'가 이미 존재합니다` },
          { status: 400 }
        )
      }
    }
    if (!finalApprovalCode && userId) {
      const today = new Date()
      const dateStr = `${String(today.getFullYear()).slice(-2)}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`
      const initial = userId.charAt(0).toUpperCase()
      const prefix = `${initial}${dateStr}-`
      const lastCode = await prisma.salesApproval.findFirst({
        where: { approvalCode: { startsWith: prefix } },
        orderBy: { approvalCode: 'desc' },
      })
      let codeSeq = 1
      if (lastCode?.approvalCode) {
        const lastSeq = parseInt(lastCode.approvalCode.split('-')[1])
        if (!isNaN(lastSeq)) codeSeq = lastSeq + 1
      }
      finalApprovalCode = `${prefix}${String(codeSeq).padStart(2, '0')}`
    }

    // 견적서에서 생성 시
    let quoteData = null
    if (quoteId) {
      quoteData = await prisma.salesQuote.findUnique({
        where: { id: quoteId },
        include: {
          products: {
            include: { items: { orderBy: { sortOrder: 'asc' } } },
            orderBy: { sortOrder: 'asc' },
          },
        },
      })
    }

    const finalClientCompany = clientCompany || quoteData?.clientCompany
    const finalClientContact = clientContact || quoteData?.clientContact
    const finalClientPhone = clientPhone || quoteData?.clientPhone
    const finalManagerName = managerName || quoteData?.managerName
    const finalPaymentTerms = paymentTerms || quoteData?.paymentTerms

    // products 결정 (직접 전달 or 견적서에서 변환)
    let finalProducts = products
    if (finalProducts.length === 0 && quoteData?.products) {
      finalProducts = quoteData.products.map((p) => ({
        name: p.name,
        quantity: p.quantity,
        unitPrice: Number(p.unitPrice) || 0,
        sortOrder: p.sortOrder,
        items: p.items.map((item) => ({
          partNumber: item.partNumber || undefined,
          description: item.description || undefined,
          quantity: item.quantity,
          sortOrder: item.sortOrder,
        })),
      }))
    }

    // 금액 계산
    let totalSalesAmount = 0
    let totalPurchaseAmount = 0

    const productsData = finalProducts.map((product: ProductInput, pIdx: number) => {
      const qty = product.quantity || 1
      const price = product.unitPrice || product.salesUnitPrice || 0
      const productTotal = qty * price
      totalSalesAmount += productTotal

      const items = (product.items || []).map((item: ItemInput, iIdx: number) => {
        const pPrice = item.purchasePrice || item.purchaseUnitPrice || 0
        const pQty = item.purchaseQty || item.quantity || 1
        const purchaseTotal = pQty * pPrice
        totalPurchaseAmount += purchaseTotal

        return {
          sortOrder: item.sortOrder ?? iIdx,
          partNumber: item.partNumber,
          description: item.description,
          quantity: item.quantity || 1,
          salesUnitPrice: item.salesUnitPrice,
          vendorName: item.vendorName || item.vendorCompany || null,
          purchaseQty: pQty,
          purchasePrice: pPrice,
          purchaseTotal: purchaseTotal || item.purchaseTotal,
          purchaseDate: item.purchaseDate ? new Date(item.purchaseDate) : null,
        }
      })

      return {
        sortOrder: product.sortOrder ?? pIdx,
        name: product.name,
        quantity: qty,
        unitPrice: price,
        totalPrice: productTotal,
        items,
      }
    })

    const profitAmount = totalSalesAmount - totalPurchaseAmount

    // 매입처 자동 등록
    const vendorNames = new Set<string>()
    productsData.forEach((p: { items: { vendorName?: string }[] }) => p.items.forEach((item: { vendorName?: string }) => {
      if (item.vendorName?.trim()) vendorNames.add(item.vendorName.trim())
    }))
    for (const name of vendorNames) {
      try {
        await prisma.vendor.upsert({
          where: { name },
          update: { usageCount: { increment: 1 } },
          create: { name, usageCount: 1 },
        })
      } catch (e) {
        console.error('매입처 자동등록 오류:', e)
      }
    }

    // 품의서 생성
    const approval = await prisma.salesApproval.create({
      data: {
        approvalNumber,
        ...(quoteId && { sourceQuote: { connect: { id: quoteId } } }),
        approvalCode: finalApprovalCode,
        approvalDate: approvalDate ? new Date(approvalDate) : null,
        managerName: finalManagerName,
        clientCompany: finalClientCompany,
        clientContact: finalClientContact,
        clientPhone: finalClientPhone,
        endUser,
        paymentTerms: finalPaymentTerms,
        deliveryAddress,
        deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
        invoiceEmail,
        receiverName,
        receiverPhone,
        notes,
        totalSalesAmount,
        totalPurchaseAmount,
        profitAmount,
        createdById,
      },
    })

    // 제품 + 품목 생성
    for (const p of productsData) {
      const createdProduct = await prisma.salesApprovalProduct.create({
        data: {
          approvalId: approval.id,
          sortOrder: p.sortOrder,
          name: p.name,
          quantity: p.quantity,
          unitPrice: p.unitPrice,
          totalPrice: p.totalPrice,
        },
      })

      if (p.items.length > 0) {
        await prisma.salesApprovalItem.createMany({
          data: p.items.map((item: {
            sortOrder: number
            partNumber?: string
            description?: string
            quantity: number
            salesUnitPrice?: number
            vendorName?: string
            purchaseQty: number
            purchasePrice?: number
            purchaseTotal?: number
            purchaseDate: Date | null
          }) => ({
            productId: createdProduct.id,
            sortOrder: item.sortOrder,
            partNumber: item.partNumber,
            description: item.description,
            quantity: item.quantity,
            salesUnitPrice: item.salesUnitPrice,
            vendorName: item.vendorName,
            purchaseQty: item.purchaseQty,
            purchasePrice: item.purchasePrice,
            purchaseTotal: item.purchaseTotal,
            purchaseDate: item.purchaseDate,
          })),
        })
      }
    }

    // 결과 조회
    const result = await prisma.salesApproval.findUnique({
      where: { id: approval.id },
      include: {
        products: {
          include: { items: { orderBy: { sortOrder: 'asc' } } },
          orderBy: { sortOrder: 'asc' },
        },
      },
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('품의서 생성 오류:', error)
    return NextResponse.json(
      { error: '품의서 생성에 실패했습니다' },
      { status: 500 }
    )
  }
}
