import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { generateExcel, parseExcel } from '@/lib/excel'
import { uploadToS3, generateS3Key } from '@/lib/s3'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/documents/:id/excel - 엑셀 다운로드
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    })

    if (!document) {
      return NextResponse.json(
        { error: '문서를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    // 엑셀 생성
    const buffer = await generateExcel(document.docType, {
      docNumber: document.docNumber,
      clientCompany: document.clientCompany || undefined,
      clientContact: document.clientContact || undefined,
      clientPhone: document.clientPhone || undefined,
      clientFax: document.clientFax || undefined,
      clientEmail: document.clientEmail || undefined,
      vendorCompany: document.vendorCompany || undefined,
      vendorContact: document.vendorContact || undefined,
      vendorPhone: document.vendorPhone || undefined,
      projectName: document.projectName || undefined,
      quoteDate: document.quoteDate || undefined,
      deliveryDate: document.deliveryDate || undefined,
      paymentTerms: document.paymentTerms || undefined,
      notes: document.notes || undefined,
      items: document.items.map((item) => ({
        partNumber: item.partNumber || undefined,
        description: item.description || undefined,
        quantity: item.quantity,
        srpPrice: item.srpPrice ? Number(item.srpPrice) : undefined,
        unitPrice: item.unitPrice ? Number(item.unitPrice) : undefined,
        totalPrice: item.totalPrice ? Number(item.totalPrice) : undefined,
      })),
    })

    // 파일명 생성
    const docTypeKo: Record<string, string> = {
      SALES_QUOTE: '견적서',
      SALES_APPROVAL: '품의서',
      SALES_ORDER: '발주서',
      MA_QUOTE: 'MA견적서',
      MA_APPROVAL: 'MA품의서',
    }
    const fileName = `${docTypeKo[document.docType] || '문서'}_${document.docNumber}.xlsx`

    // Response
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      },
    })
  } catch (error) {
    console.error('엑셀 다운로드 오류:', error)
    return NextResponse.json(
      { error: '엑셀 다운로드에 실패했습니다' },
      { status: 500 }
    )
  }
}

// POST /api/documents/:id/excel - 엑셀 업로드 (문서 업데이트)
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    // 기존 문서 확인
    const document = await prisma.document.findUnique({
      where: { id },
      select: { id: true, docType: true, docNumber: true, status: true },
    })

    if (!document) {
      return NextResponse.json(
        { error: '문서를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    if (document.status === 'APPROVED' || document.status === 'COMPLETED') {
      return NextResponse.json(
        { error: '승인된 문서는 수정할 수 없습니다' },
        { status: 400 }
      )
    }

    // 파일 읽기
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { error: '파일이 없습니다' },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    // 엑셀 파싱
    const parsed = await parseExcel(buffer, document.docType)

    // S3에 원본 저장
    const userId = request.headers.get('x-user-id') || 'temp-user-id'
    const s3Key = generateS3Key('documents', document.docNumber, file.name)
    await uploadToS3(s3Key, buffer, file.type)

    // 파일 레코드 생성
    await prisma.documentFile.create({
      data: {
        documentId: id,
        fileType: 'EXCEL_ORIGINAL',
        fileName: file.name,
        filePath: s3Key,
        fileSize: file.size,
        mimeType: file.type,
        uploadedById: userId,
      },
    })

    // 기존 품목 삭제 후 새로 생성
    await prisma.documentItem.deleteMany({
      where: { documentId: id },
    })

    let totalAmount = 0
    const items = parsed.items.map((item, index) => {
      const itemTotal = item.totalPrice || (item.quantity * (item.unitPrice || 0))
      totalAmount += itemTotal
      
      return {
        documentId: id,
        sortOrder: index,
        partNumber: item.partNumber,
        description: item.description,
        quantity: item.quantity,
        srpPrice: item.srpPrice,
        unitPrice: item.unitPrice,
        totalPrice: itemTotal,
      }
    })

    await prisma.documentItem.createMany({
      data: items,
    })

    // 문서 업데이트
    const vatAmount = Math.round(totalAmount * 0.1)

    const updated = await prisma.document.update({
      where: { id },
      data: {
        clientCompany: parsed.clientCompany,
        clientContact: parsed.clientContact,
        clientPhone: parsed.clientPhone,
        clientFax: parsed.clientFax,
        clientEmail: parsed.clientEmail,
        projectName: parsed.projectName,
        paymentTerms: parsed.paymentTerms,
        totalAmount,
        vatAmount,
        totalWithVat: totalAmount + vatAmount,
      },
      include: {
        items: true,
      },
    })

    return NextResponse.json({
      message: '엑셀 파일이 업로드되어 문서가 업데이트되었습니다',
      document: updated,
    })
  } catch (error) {
    console.error('엑셀 업로드 오류:', error)
    return NextResponse.json(
      { error: '엑셀 업로드에 실패했습니다' },
      { status: 500 }
    )
  }
}
