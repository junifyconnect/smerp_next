import { NextRequest, NextResponse } from 'next/server'
// TODO: DB 준비 후 Prisma 사용
// import prisma from '@/lib/db'
// import { generateDocNumber } from '@/lib/utils'
// import { DocType, DocStatus, Prisma } from '@prisma/client'
import type { CreateDocumentDto, DocumentFilter, PaginatedResponse } from '@/types'

// 더미 문서 데이터 (실제로는 DB에 저장)
let DUMMY_DOCUMENTS = [
  {
    id: '1',
    docNumber: 'Q2501-001',
    docType: 'SALES_QUOTE',
    status: 'DRAFT',
    title: '서버 장비 견적서',
    clientCompany: 'ABC 기업',
    totalAmount: 10000000,
    createdAt: new Date('2025-01-15').toISOString(),
    createdBy: { name: '홍길동' },
  },
  {
    id: '2',
    docNumber: 'Q2501-002',
    docType: 'SALES_QUOTE',
    status: 'PENDING',
    title: '네트워크 장비 견적서',
    clientCompany: 'XYZ 회사',
    totalAmount: 25000000,
    createdAt: new Date('2025-01-14').toISOString(),
    createdBy: { name: '홍길동' },
  },
  {
    id: '3',
    docNumber: 'Q2501-003',
    docType: 'SALES_QUOTE',
    status: 'APPROVED',
    title: '스토리지 솔루션 견적서',
    clientCompany: 'DEF 주식회사',
    totalAmount: 50000000,
    createdAt: new Date('2025-01-13').toISOString(),
    createdBy: { name: '홍길동' },
  },
  {
    id: '4',
    docNumber: 'Q2501-004',
    docType: 'SALES_QUOTE',
    status: 'DRAFT',
    title: '클라우드 마이그레이션 견적서',
    clientCompany: 'GHI 기업',
    totalAmount: 75000000,
    createdAt: new Date('2025-01-12').toISOString(),
    createdBy: { name: '홍길동' },
  },
  {
    id: '5',
    docNumber: 'Q2501-005',
    docType: 'SALES_QUOTE',
    status: 'COMPLETED',
    title: '보안 솔루션 견적서',
    clientCompany: 'JKL 시스템',
    totalAmount: 30000000,
    createdAt: new Date('2025-01-11').toISOString(),
    createdBy: { name: '홍길동' },
  },
]

// GET /api/documents - 문서 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // 필터 파라미터
    const docType = searchParams.get('docType')
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    
    // 페이지네이션
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    // 더미 데이터 필터링
    let filtered = DUMMY_DOCUMENTS.filter((doc) => {
      if (docType && doc.docType !== docType) return false
      if (status && doc.status !== status) return false
      if (search) {
        const searchLower = search.toLowerCase()
        return (
          doc.docNumber.toLowerCase().includes(searchLower) ||
          doc.title?.toLowerCase().includes(searchLower) ||
          doc.clientCompany?.toLowerCase().includes(searchLower)
        )
      }
      return true
    })

    // 페이지네이션 적용
    const total = filtered.length
    const skip = (page - 1) * limit
    const items = filtered.slice(skip, skip + limit)

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
    const body = await request.json()
    
    // 더미 문서 생성 (실제로는 DB에 저장)
    const newId = String(DUMMY_DOCUMENTS.length + 1)
    const docNumber = `Q2501-${String(newId).padStart(3, '0')}`
    
    // 금액 계산
    const totalAmount = body.items?.reduce((sum: number, item: any) => {
      return sum + (item.quantity * (item.unitPrice || 0))
    }, 0) || 0
    const vatAmount = Math.round(totalAmount * 0.1)
    const totalWithVat = totalAmount + vatAmount

    const newDocument = {
      id: newId,
      docNumber,
      docType: body.docType,
      status: 'DRAFT',
      title: body.title || '',
      projectName: body.projectName || '',
      clientCompany: body.clientCompany || '',
      clientContact: body.clientContact || '',
      clientPhone: body.clientPhone || '',
      clientFax: body.clientFax || '',
      clientEmail: body.clientEmail || '',
      vendorCompany: body.vendorCompany || '',
      vendorContact: body.vendorContact || '',
      vendorPhone: body.vendorPhone || '',
      vendorEmail: body.vendorEmail || '',
      totalAmount,
      vatAmount,
      totalWithVat,
      quoteDate: body.quoteDate || null,
      deliveryDate: body.deliveryDate || null,
      paymentTerms: body.paymentTerms || '',
      notes: body.notes || '',
      items: body.items?.map((item: any, index: number) => ({
        id: `${newId}-${index + 1}`,
        partNumber: item.partNumber || '',
        description: item.description || '',
        quantity: item.quantity,
        unitPrice: item.unitPrice || 0,
        totalPrice: item.quantity * (item.unitPrice || 0),
      })) || [],
      createdAt: new Date().toISOString(),
      createdBy: { name: '홍길동' },
    }

    // 더미 데이터에 추가 (실제로는 DB에 저장)
    DUMMY_DOCUMENTS.push(newDocument)

    return NextResponse.json(newDocument, { status: 201 })
  } catch (error) {
    console.error('문서 생성 오류:', error)
    return NextResponse.json(
      { error: '문서 생성에 실패했습니다' },
      { status: 500 }
    )
  }
}
