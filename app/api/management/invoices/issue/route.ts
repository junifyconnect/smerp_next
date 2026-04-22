import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

/**
 * POST /api/management/invoices/issue
 * 계산서 발행: PENDING → ISSUED
 *
 * 두 가지 소스 지원 (BUSINESS_RULES §10.1, §10.2 — B-2 결정):
 *   1. SALES_APPROVAL 기반: 승인 시점에 이미 InvoiceRecord(PENDING)가 생성되어 있음
 *      → body: { id: InvoiceRecord.id }
 *   2. MA_BILLING 기반: InvoiceRecord가 아직 없음, MABilling에서 파생 생성 필요
 *      → body: { maBillingId: MABilling.id, invoiceType: 'SALES' | 'PURCHASE' }
 *      → 발행 시점에 InvoiceRecord(MA_BILLING source)를 새로 만들고 ISSUED로 세팅
 *
 * 공통 옵션:
 *   - invoiceDate?: string (ISO). 미지정 시 오늘
 *   - invoiceNumber?: string (세금계산서 번호)
 *   - remarks?: string
 *
 * NEEDS_AMENDMENT는 /amend 거쳐 새 PENDING을 만든 뒤 issue 해야 함.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      id?: string
      maBillingId?: string
      invoiceType?: 'SALES' | 'PURCHASE'
      invoiceDate?: string
      invoiceNumber?: string
      remarks?: string
    }
    const { id, maBillingId, invoiceType, invoiceDate, invoiceNumber, remarks } = body

    const now = invoiceDate ? new Date(invoiceDate) : new Date()

    // ─────────────────────────────────────────
    // Case 1: 기존 InvoiceRecord의 발행
    // ─────────────────────────────────────────
    if (id) {
      const record = await prisma.invoiceRecord.findUnique({ where: { id } })
      if (!record) {
        return NextResponse.json(
          { error: '계산서 기록을 찾을 수 없습니다' },
          { status: 404 }
        )
      }

      if (record.status !== 'PENDING') {
        return NextResponse.json(
          {
            error: `현재 상태(${record.status})에서는 발행할 수 없습니다. PENDING 상태만 발행 가능합니다. NEEDS_AMENDMENT는 먼저 /amend 호출 필요.`,
          },
          { status: 409 }
        )
      }

      const updated = await prisma.invoiceRecord.update({
        where: { id },
        data: {
          status: 'ISSUED',
          invoiceDate: now,
          invoiceNumber: invoiceNumber ?? record.invoiceNumber,
          remarks: remarks ?? record.remarks,
        },
      })
      return NextResponse.json(updated)
    }

    // ─────────────────────────────────────────
    // Case 2: MABilling에서 파생 발행
    // ─────────────────────────────────────────
    if (maBillingId) {
      if (!invoiceType || !['SALES', 'PURCHASE'].includes(invoiceType)) {
        return NextResponse.json(
          { error: 'MA 계산서 발행 시 invoiceType(SALES | PURCHASE)을 지정해야 합니다' },
          { status: 400 }
        )
      }

      const billing = await prisma.mABilling.findUnique({
        where: { id: maBillingId },
        include: { maContract: true },
      })
      if (!billing) {
        return NextResponse.json(
          { error: 'MA 청구(MABilling) 레코드를 찾을 수 없습니다' },
          { status: 404 }
        )
      }
      if (!billing.isActive) {
        return NextResponse.json(
          { error: '비활성화된 MA 청구에서는 계산서를 발행할 수 없습니다 (revise된 이전 버전)' },
          { status: 409 }
        )
      }

      // 이미 같은 MABilling + invoiceType + active chain에서 발행된 게 있는지 체크
      const existing = await prisma.invoiceRecord.findFirst({
        where: {
          maBillingId,
          invoiceType,
          amendedFromId: null,
          status: { in: ['PENDING', 'ISSUED', 'NEEDS_AMENDMENT'] },
        },
      })
      if (existing) {
        return NextResponse.json(
          {
            error: `이미 발행된 ${invoiceType === 'SALES' ? '매출' : '매입'} 계산서가 있습니다 (id=${existing.id}, status=${existing.status})`,
          },
          { status: 409 }
        )
      }

      // 금액 스냅샷
      const isSales = invoiceType === 'SALES'
      const supplyAmount = isSales
        ? Number(billing.salesAmount)
        : Number(billing.purchaseAmount)
      const totalAmount = isSales
        ? Number(billing.salesTotalAmount)
        : Number(billing.purchaseTotalAmount)

      if (supplyAmount === 0) {
        return NextResponse.json(
          {
            error: `이 MA 청구에는 ${isSales ? '매출' : '매입'} 금액이 없어 계산서를 발행할 수 없습니다`,
          },
          { status: 400 }
        )
      }

      const created = await prisma.invoiceRecord.create({
        data: {
          source: 'MA_BILLING',
          maBillingId,
          invoiceType,
          clientCompany: billing.clientCompany,
          vendorCompany: isSales ? null : billing.vendorCompany,
          productName: billing.itemName,
          quantity: 1,
          unitPrice: supplyAmount,
          totalPrice: totalAmount,
          status: 'ISSUED',
          invoiceDate: now,
          invoiceNumber: invoiceNumber ?? null,
          remarks: remarks ?? null,
        },
      })

      return NextResponse.json(created)
    }

    return NextResponse.json(
      { error: 'id 또는 maBillingId가 필요합니다' },
      { status: 400 }
    )
  } catch (error) {
    console.error('계산서 발행 오류:', error)
    return NextResponse.json(
      { error: '계산서 발행에 실패했습니다' },
      { status: 500 }
    )
  }
}
