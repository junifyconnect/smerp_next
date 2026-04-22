import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import prisma from '@/lib/db'

/**
 * POST /api/management/invoices/amend
 * 계산서 수정 발행 (수정세금계산서 발행 시나리오):
 *   - 원본을 CANCELLED(reason=AMENDED)로 전이
 *   - 원본 데이터를 기반으로 신규 레코드 생성 (newData로 override)
 *   - amendedFromId = 원본.id, status = PENDING
 *
 * Body:
 *   - id: 원본 InvoiceRecord.id (필수). 현재 상태 ISSUED 또는 NEEDS_AMENDMENT만 가능.
 *   - newData?: 신규 레코드에 덮어쓸 필드들.
 *       - productName, partNumber, quantity, unitPrice, totalPrice, vendorCompany, clientCompany, remarks
 *   - amendReason?: 원본의 cancelReason에 기록될 사유. 기본 "AMENDED"
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      id,
      newData,
      amendReason,
    } = body as {
      id?: string
      newData?: {
        productName?: string
        partNumber?: string | null
        quantity?: number
        unitPrice?: number | string
        totalPrice?: number | string
        vendorCompany?: string | null
        clientCompany?: string | null
        remarks?: string | null
      }
      amendReason?: string
    }

    if (!id) {
      return NextResponse.json({ error: 'id가 필요합니다' }, { status: 400 })
    }

    const original = await prisma.invoiceRecord.findUnique({ where: { id } })
    if (!original) {
      return NextResponse.json(
        { error: '원본 계산서를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    if (original.status !== 'ISSUED' && original.status !== 'NEEDS_AMENDMENT') {
      return NextResponse.json(
        {
          error: `현재 상태(${original.status})는 수정 발행이 불가합니다. ISSUED 또는 NEEDS_AMENDMENT 상태만 가능합니다.`,
        },
        { status: 409 }
      )
    }

    const now = new Date()
    const reason = amendReason ?? 'AMENDED'

    const newRecord = await prisma.$transaction(async (tx) => {
      // 1. 원본을 CANCELLED(reason=AMENDED)로 전이
      await tx.invoiceRecord.update({
        where: { id: original.id },
        data: {
          status: 'CANCELLED',
          cancelledAt: now,
          cancelReason: reason,
        },
      })

      // 2. 신규 레코드 생성 (원본 데이터 + override, amendedFromId 연결)
      const createData: Prisma.InvoiceRecordUncheckedCreateInput = {
        approvalId: original.approvalId,
        invoiceType: original.invoiceType,
        productId: original.productId,
        productName: newData?.productName ?? original.productName,
        partNumber:
          newData?.partNumber !== undefined ? newData.partNumber : original.partNumber,
        quantity: newData?.quantity ?? original.quantity,
        unitPrice:
          newData?.unitPrice !== undefined
            ? (newData.unitPrice as Prisma.Decimal | number | string)
            : original.unitPrice,
        totalPrice:
          newData?.totalPrice !== undefined
            ? (newData.totalPrice as Prisma.Decimal | number | string)
            : original.totalPrice,
        vendorCompany:
          newData?.vendorCompany !== undefined
            ? newData.vendorCompany
            : original.vendorCompany,
        clientCompany:
          newData?.clientCompany !== undefined
            ? newData.clientCompany
            : original.clientCompany,
        status: 'PENDING',
        // 발행 정보는 비움 — 새 레코드를 별도 issue 해야 함
        invoiceDate: null,
        invoiceNumber: null,
        remarks: newData?.remarks !== undefined ? newData.remarks : null,
        amendedFromId: original.id,
      }

      return await tx.invoiceRecord.create({ data: createData })
    })

    return NextResponse.json(newRecord)
  } catch (error) {
    console.error('계산서 수정 발행 오류:', error)
    return NextResponse.json(
      { error: '계산서 수정 발행에 실패했습니다' },
      { status: 500 }
    )
  }
}
