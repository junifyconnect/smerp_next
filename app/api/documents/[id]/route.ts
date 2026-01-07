import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import type { UpdateDocumentDto } from '@/types'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/documents/:id - 문서 상세 조회
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
        },
        files: {
          orderBy: { uploadedAt: 'desc' },
        },
        approvals: {
          include: {
            approver: {
              select: { id: true, name: true, position: true },
            },
          },
          orderBy: { step: 'asc' },
        },
        createdBy: {
          select: { id: true, name: true, department: true, position: true },
        },
        parentDoc: {
          select: { id: true, docNumber: true, docType: true },
        },
        childDocs: {
          select: { id: true, docNumber: true, docType: true, status: true },
        },
      },
    })

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
    const { id } = await params
    const body: UpdateDocumentDto = await request.json()

    // 기존 문서 확인
    const existing = await prisma.document.findUnique({
      where: { id },
      select: { status: true },
    })

    if (!existing) {
      return NextResponse.json(
        { error: '문서를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    // 승인된 문서는 수정 불가
    if (existing.status === 'APPROVED' || existing.status === 'COMPLETED') {
      return NextResponse.json(
        { error: '승인된 문서는 수정할 수 없습니다' },
        { status: 400 }
      )
    }

    // 품목 업데이트
    let totalAmount = 0
    let purchaseAmount = 0
    
    if (body.items) {
      // 기존 품목 삭제
      await prisma.documentItem.deleteMany({
        where: { documentId: id },
      })

      // 새 품목 생성
      const items = body.items.map((item, index) => {
        const itemTotal = item.quantity * (item.unitPrice || 0)
        totalAmount += itemTotal
        if (item.purchasePrice) {
          purchaseAmount += item.quantity * item.purchasePrice
        }
        
        return {
          documentId: id,
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

      await prisma.documentItem.createMany({
        data: items,
      })
    }

    const vatAmount = Math.round(totalAmount * 0.1)
    const marginAmount = totalAmount - purchaseAmount
    const marginRate = totalAmount > 0 ? (marginAmount / totalAmount) * 100 : 0

    // 문서 업데이트
    const document = await prisma.document.update({
      where: { id },
      data: {
        title: body.title,
        projectName: body.projectName,
        status: body.status,
        clientCompany: body.clientCompany,
        clientContact: body.clientContact,
        clientPhone: body.clientPhone,
        clientFax: body.clientFax,
        clientEmail: body.clientEmail,
        vendorCompany: body.vendorCompany,
        vendorContact: body.vendorContact,
        vendorPhone: body.vendorPhone,
        vendorEmail: body.vendorEmail,
        ...(body.items && {
          totalAmount,
          vatAmount,
          totalWithVat: totalAmount + vatAmount,
          purchaseAmount: purchaseAmount || null,
          marginAmount: marginAmount || null,
          marginRate: marginRate || null,
        }),
        quoteDate: body.quoteDate ? new Date(body.quoteDate) : undefined,
        deliveryDate: body.deliveryDate ? new Date(body.deliveryDate) : undefined,
        paymentTerms: body.paymentTerms,
        notes: body.notes,
      },
      include: {
        items: true,
        createdBy: {
          select: { id: true, name: true },
        },
      },
    })

    return NextResponse.json(document)
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
    const { id } = await params

    // 기존 문서 확인
    const existing = await prisma.document.findUnique({
      where: { id },
      select: { status: true, docNumber: true },
    })

    if (!existing) {
      return NextResponse.json(
        { error: '문서를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    // 승인된 문서는 삭제 불가
    if (existing.status === 'APPROVED' || existing.status === 'COMPLETED') {
      return NextResponse.json(
        { error: '승인된 문서는 삭제할 수 없습니다' },
        { status: 400 }
      )
    }

    await prisma.document.delete({
      where: { id },
    })

    return NextResponse.json({ 
      message: '문서가 삭제되었습니다',
      docNumber: existing.docNumber,
    })
  } catch (error) {
    console.error('문서 삭제 오류:', error)
    return NextResponse.json(
      { error: '문서 삭제에 실패했습니다' },
      { status: 500 }
    )
  }
}
