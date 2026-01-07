import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { generateDocNumber } from '@/lib/utils'
import { DocType, DocStatus, Prisma } from '@prisma/client'
import type { CreateDocumentDto, DocumentFilter, PaginatedResponse } from '@/types'

// GET /api/documents - 문서 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // 필터 파라미터
    const docType = searchParams.get('docType') as DocType | null
    const status = searchParams.get('status') as DocStatus | null
    const clientCompany = searchParams.get('clientCompany')
    const search = searchParams.get('search')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    
    // 페이지네이션
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    // WHERE 조건 구성
    const where: Prisma.DocumentWhereInput = {}
    
    if (docType) where.docType = docType
    if (status) where.status = status
    if (clientCompany) {
      where.clientCompany = { contains: clientCompany, mode: 'insensitive' }
    }
    if (search) {
      where.OR = [
        { docNumber: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
        { clientCompany: { contains: search, mode: 'insensitive' } },
        { projectName: { contains: search, mode: 'insensitive' } },
      ]
    }
    if (dateFrom || dateTo) {
      where.createdAt = {}
      if (dateFrom) where.createdAt.gte = new Date(dateFrom)
      if (dateTo) where.createdAt.lte = new Date(dateTo)
    }

    // 쿼리 실행
    const [items, total] = await Promise.all([
      prisma.document.findMany({
        where,
        include: {
          createdBy: {
            select: { id: true, name: true, department: true },
          },
          items: true,
          _count: {
            select: { approvals: true, files: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.document.count({ where }),
    ])

    const response: PaginatedResponse<typeof items[0]> = {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('문서 목록 조회 오류:', error)
    return NextResponse.json(
      { error: '문서 목록을 불러오는데 실패했습니다' },
      { status: 500 }
    )
  }
}

// POST /api/documents - 문서 생성
export async function POST(request: NextRequest) {
  try {
    const body: CreateDocumentDto = await request.json()
    
    // TODO: 실제 인증된 사용자 ID로 교체
    const userId = request.headers.get('x-user-id') || 'temp-user-id'

    // 문서번호 생성
    const docNumber = await generateDocNumber(body.docType)

    // 금액 계산
    let totalAmount = 0
    let purchaseAmount = 0
    
    const items = body.items.map((item, index) => {
      const itemTotal = item.quantity * (item.unitPrice || 0)
      totalAmount += itemTotal
      if (item.purchasePrice) {
        purchaseAmount += item.quantity * item.purchasePrice
      }
      
      return {
        sortOrder: index,
        partNumber: item.partNumber,
        description: item.description,
        quantity: item.quantity,
        srpPrice: item.srpPrice,
        unitPrice: item.unitPrice,
        totalPrice: itemTotal,
        purchasePrice: item.purchasePrice,
      }
    })

    const vatAmount = Math.round(totalAmount * 0.1)
    const marginAmount = totalAmount - purchaseAmount
    const marginRate = totalAmount > 0 ? (marginAmount / totalAmount) * 100 : 0

    // 문서 생성
    const document = await prisma.document.create({
      data: {
        docType: body.docType,
        docNumber,
        status: 'DRAFT',
        title: body.title,
        projectName: body.projectName,
        clientCompany: body.clientCompany,
        clientContact: body.clientContact,
        clientPhone: body.clientPhone,
        clientFax: body.clientFax,
        clientEmail: body.clientEmail,
        vendorCompany: body.vendorCompany,
        vendorContact: body.vendorContact,
        vendorPhone: body.vendorPhone,
        vendorEmail: body.vendorEmail,
        totalAmount,
        vatAmount,
        totalWithVat: totalAmount + vatAmount,
        purchaseAmount: purchaseAmount || null,
        marginAmount: marginAmount || null,
        marginRate: marginRate || null,
        quoteDate: body.quoteDate ? new Date(body.quoteDate) : null,
        deliveryDate: body.deliveryDate ? new Date(body.deliveryDate) : null,
        paymentTerms: body.paymentTerms,
        notes: body.notes,
        parentDocId: body.parentDocId,
        createdById: userId,
        items: {
          create: items,
        },
      },
      include: {
        items: true,
        createdBy: {
          select: { id: true, name: true },
        },
      },
    })

    return NextResponse.json(document, { status: 201 })
  } catch (error) {
    console.error('문서 생성 오류:', error)
    return NextResponse.json(
      { error: '문서 생성에 실패했습니다' },
      { status: 500 }
    )
  }
}
