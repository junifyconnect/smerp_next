import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { generateDocNumber } from '@/lib/utils'
import { parseExcel, detectDocType } from '@/lib/excel'
import { uploadToS3, generateS3Key } from '@/lib/s3'
import { DocType } from '@prisma/client'

interface UploadResult {
  fileName: string
  success: boolean
  docNumber?: string
  documentId?: string
  error?: string
  detectedDocType?: DocType
}

// POST /api/documents/bulk-upload - 엑셀 파일 대량 업로드
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const files = formData.getAll('files') as File[]
    const defaultDocType = formData.get('docType') as DocType | null

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: '파일이 없습니다' },
        { status: 400 }
      )
    }

    // TODO: 실제 인증된 사용자 ID로 교체
    const userId = request.headers.get('x-user-id') || 'temp-user-id'

    const results: UploadResult[] = []

    for (const file of files) {
      const result: UploadResult = {
        fileName: file.name,
        success: false,
      }

      try {
        // 파일 타입 검증
        const validTypes = [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
        ]
        if (!validTypes.includes(file.type)) {
          result.error = '엑셀 파일(.xlsx, .xls)만 업로드 가능합니다'
          results.push(result)
          continue
        }

        const buffer = Buffer.from(await file.arrayBuffer())

        // 문서 타입 결정
        let docType = defaultDocType
        if (!docType) {
          docType = await detectDocType(buffer)
          if (!docType) {
            result.error = '문서 타입을 자동 감지할 수 없습니다'
            results.push(result)
            continue
          }
        }

        result.detectedDocType = docType

        // 엑셀 파싱
        const parsed = await parseExcel(buffer, docType)

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
        })

        // S3에 원본 파일 저장
        try {
          const s3Key = generateS3Key('documents', docNumber, file.name)
          await uploadToS3(s3Key, buffer, file.type)

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
        } catch {
          // S3 오류는 무시
        }

        result.success = true
        result.docNumber = docNumber
        result.documentId = document.id
      } catch (err) {
        result.error = err instanceof Error ? err.message : '알 수 없는 오류'
      }

      results.push(result)
    }

    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length

    return NextResponse.json({
      message: `${successCount}개 성공, ${failCount}개 실패`,
      totalFiles: files.length,
      successCount,
      failCount,
      results,
    })
  } catch (error) {
    console.error('대량 업로드 오류:', error)
    return NextResponse.json(
      { error: '대량 업로드에 실패했습니다' },
      { status: 500 }
    )
  }
}
