import { NextRequest, NextResponse } from 'next/server'
// TODO: DB 준비 후 Prisma 사용
// import prisma from '@/lib/db'
import type { UpdateDocumentDto } from '@/types'

interface RouteParams {
  params: Promise<{ id: string }>
}

// 더미 문서 상세 데이터
const DUMMY_DOCUMENTS: Record<string, any> = {
  '1': {
    id: '1',
    docNumber: 'Q2501-001',
    docType: 'SALES_QUOTE',
    status: 'DRAFT',
    title: '서버 장비 견적서',
    projectName: '2025년 서버 구축 프로젝트',
    clientCompany: 'ABC 기업',
    clientContact: '김담당',
    clientPhone: '02-1234-5678',
    clientEmail: 'contact@abc.com',
    vendorCompany: '서버메이트',
    vendorContact: '홍길동',
    vendorPhone: '02-9876-5432',
    vendorEmail: 'sales@servermate.com',
    totalAmount: 10000000,
    vatAmount: 1000000,
    totalWithVat: 11000000,
    quoteDate: '2025-01-15',
    deliveryDate: '2025-02-15',
    paymentTerms: '계약금 30%, 납품 후 70%',
    notes: '서버 장비 구축 및 설치 포함',
    items: [
      {
        id: '1-1',
        partNumber: 'SRV-001',
        description: '서버 랙마운트 1U',
        quantity: 2,
        unitPrice: 3000000,
        totalPrice: 6000000,
      },
      {
        id: '1-2',
        partNumber: 'SRV-002',
        description: '서버 랙마운트 2U',
        quantity: 1,
        unitPrice: 4000000,
        totalPrice: 4000000,
      },
    ],
    createdAt: '2025-01-15T10:00:00Z',
    createdBy: { name: '홍길동' },
  },
  '2': {
    id: '2',
    docNumber: 'Q2501-002',
    docType: 'SALES_QUOTE',
    status: 'PENDING',
    title: '네트워크 장비 견적서',
    projectName: '네트워크 인프라 구축',
    clientCompany: 'XYZ 회사',
    clientContact: '이담당',
    clientPhone: '02-2345-6789',
    clientEmail: 'contact@xyz.com',
    vendorCompany: '서버메이트',
    vendorContact: '홍길동',
    vendorPhone: '02-9876-5432',
    vendorEmail: 'sales@servermate.com',
    totalAmount: 25000000,
    vatAmount: 2500000,
    totalWithVat: 27500000,
    quoteDate: '2025-01-14',
    deliveryDate: '2025-02-28',
    paymentTerms: '계약금 50%, 납품 후 50%',
    notes: '네트워크 스위치 및 라우터 포함',
    items: [
      {
        id: '2-1',
        partNumber: 'NET-001',
        description: '24포트 스위치',
        quantity: 5,
        unitPrice: 3000000,
        totalPrice: 15000000,
      },
      {
        id: '2-2',
        partNumber: 'NET-002',
        description: '48포트 스위치',
        quantity: 2,
        unitPrice: 5000000,
        totalPrice: 10000000,
      },
    ],
    createdAt: '2025-01-14T10:00:00Z',
    createdBy: { name: '홍길동' },
  },
  '3': {
    id: '3',
    docNumber: 'Q2501-003',
    docType: 'SALES_QUOTE',
    status: 'APPROVED',
    title: '스토리지 솔루션 견적서',
    projectName: '스토리지 시스템 구축',
    clientCompany: 'DEF 주식회사',
    clientContact: '박담당',
    clientPhone: '02-3456-7890',
    clientEmail: 'contact@def.com',
    vendorCompany: '서버메이트',
    vendorContact: '홍길동',
    vendorPhone: '02-9876-5432',
    vendorEmail: 'sales@servermate.com',
    totalAmount: 50000000,
    vatAmount: 5000000,
    totalWithVat: 55000000,
    quoteDate: '2025-01-13',
    deliveryDate: '2025-03-15',
    paymentTerms: '계약금 40%, 납품 후 60%',
    notes: '스토리지 시스템 및 백업 솔루션 포함',
    items: [
      {
        id: '3-1',
        partNumber: 'STG-001',
        description: '스토리지 어레이 50TB',
        quantity: 1,
        unitPrice: 30000000,
        totalPrice: 30000000,
      },
      {
        id: '3-2',
        partNumber: 'STG-002',
        description: '백업 시스템 20TB',
        quantity: 1,
        unitPrice: 20000000,
        totalPrice: 20000000,
      },
    ],
    createdAt: '2025-01-13T10:00:00Z',
    createdBy: { name: '홍길동' },
  },
}

// GET /api/documents/:id - 문서 상세 조회
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    // 더미 데이터 조회
    const document = DUMMY_DOCUMENTS[id]

    if (!document) {
      return NextResponse.json(
        { error: '문서를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    return NextResponse.json(document)
  } catch (error) {
    console.error('문서 상세 조회 오류:', error)
    return NextResponse.json(
      { error: '문서를 불러오는데 실패했습니다' },
      { status: 500 }
    )
  }
}

// PUT /api/documents/:id - 문서 수정
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    // TODO: DB 준비 후 실제 문서 수정 로직 추가
    return NextResponse.json(
      { error: '문서 수정 기능은 준비 중입니다' },
      { status: 501 }
    )
  } catch (error) {
    console.error('문서 수정 오류:', error)
    return NextResponse.json(
      { error: '문서 수정에 실패했습니다' },
      { status: 500 }
    )
  }
}

// DELETE /api/documents/:id - 문서 삭제
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // TODO: DB 준비 후 실제 문서 삭제 로직 추가
    return NextResponse.json(
      { error: '문서 삭제 기능은 준비 중입니다' },
      { status: 501 }
    )
  } catch (error) {
    console.error('문서 삭제 오류:', error)
    return NextResponse.json(
      { error: '문서 삭제에 실패했습니다' },
      { status: 500 }
    )
  }
}
