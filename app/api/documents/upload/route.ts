import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { generateDocNumber } from '@/lib/utils'
import { parseExcel, detectDocType } from '@/lib/excel'
import { uploadToS3, generateS3Key } from '@/lib/s3'
import { DocType } from '@prisma/client'

// POST /api/documents/upload - 엑셀 파일로 새 문서 생성
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const docTypeParam = formData.get('docType') as DocType | null

    if (!file) {
      return NextResponse.json(
        { error: '파일이 없습니다' },
        { status: 400 }
      )
    }

    // 파일 타입 검증
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ]
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: '엑셀 파일(.xlsx, .xls)만 업로드 가능합니다' },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    // 문서 타입 결정
    let docType = docTypeParam
    if (!docType) {
      docType = await detectDocType(buffer)
      if (!docType) {
        return NextResponse.json(
          { error: '문서 타입을 자동 감지할 수 없습니다. docType 파라미터를 지정해주세요.' },
          { status: 400 }
        )
      }
    }

    // 엑셀 파싱
    const parsed = await parseExcel(buffer, docType)

    // TODO: 실제 인증된 사용자 ID로 교체
    const userId = request.headers.get('x-user-id') || 'temp-user-id'

    // 문서번호 생성
    const docNumber = await generateDocNumber(docType)

    // 금액 계산
    let totalAmount = parsed.totalAmount || 0
    let purchaseAmount = 0

    if (totalAmount === 0) {
      totalAmount = parsed.items.reduce((sum, item) => {
        return sum + (item.totalPrice || item.quantity * (item.unitPrice || 0))
      }, 0)
    }

    if (parsed.purchaseItems) {
      purchaseAmount = parsed.purchaseItems.reduce((sum, item) => {
        return sum + (item.totalPrice || item.quantity * (item.unitPrice || 0))
      }, 0)
    }

    const vatAmount = parsed.vatAmount || Math.round(totalAmount * 0.1)
    const marginAmount = totalAmount - purchaseAmount
    const marginRate = totalAmount > 0 ? (marginAmount / totalAmount) * 100 : 0

    // 품목 데이터 준비
    const items = parsed.items.map((item, index) => ({
      sortOrder: index,
      partNumber: item.partNumber,
      description: item.description,
      quantity: item.quantity,
      srpPrice: item.srpPrice,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice || item.quantity * (item.unitPrice || 0),
      purchasePrice: item.purchasePrice,
    }))

    // 문서 생성
    const document = await prisma.document.create({
      data: {
        docType,
        docNumber,
        status: 'DRAFT',
        title: parsed.projectName || `${docNumber} 문서`,
        projectName: parsed.projectName,
        clientCompany: parsed.clientCompany,
        clientContact: parsed.clientContact,
        clientPhone: parsed.clientPhone,
        clientFax: parsed.clientFax,
        clientEmail: parsed.clientEmail,
        vendorCompany: parsed.vendorCompany,
        vendorContact: parsed.vendorContact,
        vendorPhone: parsed.vendorPhone,
        vendorEmail: parsed.vendorEmail,
        totalAmount,
        vatAmount,
        totalWithVat: totalAmount + vatAmount,
        purchaseAmount: purchaseAmount || null,
        marginAmount: marginAmount || null,
        marginRate: marginRate || null,
        quoteDate: parsed.quoteDate,
        deliveryDate: parsed.deliveryDate,
        paymentTerms: parsed.paymentTerms,
        notes: parsed.notes,
        createdById: userId,
        items: {
          create: items,
        },
      },
      include: {
        items: true,
      },
    })

    // S3에 원본 파일 저장
    try {
      const s3Key = generateS3Key('documents', docNumber, file.name)
      await uploadToS3(s3Key, buffer, file.type)

      // 파일 레코드 생성
      await prisma.documentFile.create({
        data: {
          documentId: document.id,
          fileType: 'EXCEL_ORIGINAL',
          fileName: file.name,
          filePath: s3Key,
          fileSize: file.size,
          mimeType: file.type,
          uploadedById: userId,
        },
      })
    } catch (s3Error) {
      // S3 오류는 무시 (로컬 개발 환경에서는 S3가 없을 수 있음)
      console.warn('S3 업로드 실패 (무시됨):', s3Error)
    }

    return NextResponse.json({
      message: '문서가 생성되었습니다',
      document,
      parsed: {
        clientCompany: parsed.clientCompany,
        itemCount: parsed.items.length,
        totalAmount,
        detectedDocType: docType,
      },
    }, { status: 201 })
  } catch (error) {
    console.error('엑셀 업로드로 문서 생성 오류:', error)
    return NextResponse.json(
      { error: '엑셀 파일 처리에 실패했습니다' },
      { status: 500 }
    )
  }
}
