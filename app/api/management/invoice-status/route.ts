import { NextRequest, NextResponse } from 'next/server'
import type { InvoiceRecord } from '@prisma/client'
import prisma from '@/lib/db'

/**
 * GET /api/management/invoice-status
 *
 * 계산서 발행 현황 (재설계 후 구조).
 * - source of truth: InvoiceRecord
 * - 행 단위: InvoiceRecord 하나 = 한 행 (매출/매입 모두)
 * - 매출 식별: (approvalId, productId)             — 제품 단위 고정
 * - 매입 식별: (approvalId, vendorCompany)   — 제품 경계 초월
 *
 * 필터:
 *   - month=YYYY-MM       approvalDate 기준
 *   - approvalCode=...    품의번호 부분일치
 *   - clientCompany=...   매출처 부분일치
 *   - vendorCompany=...   매입처 부분일치 (PURCHASE만)
 *   - invoiceStatus=...   상태 필터 (PENDING | ISSUED | NEEDS_AMENDMENT | CANCELLED)
 *   - invoiceType=SALES|PURCHASE  특정 타입만
 *
 * 기본 정책: 취소된 레코드(CANCELLED)도 응답에 포함 (체인 시각화용).
 *            필요 시 UI에서 필터링.
 */

type InvoiceStatus = 'PENDING' | 'ISSUED' | 'NEEDS_AMENDMENT' | 'CANCELLED'
type InvoiceType = 'SALES' | 'PURCHASE'

interface InvoiceRecordRow {
  id: string
  invoiceType: InvoiceType
  productId: string | null
  vendorCompany: string | null
  clientCompany: string | null
  productName: string
  partNumber: string | null
  quantity: number
  unitPrice: number
  totalPrice: number
  status: InvoiceStatus
  invoiceDate: string | null
  invoiceNumber: string | null
  remarks: string | null
  amendedFromId: string | null
  cancelledAt: string | null
  cancelReason: string | null
  createdAt: string
}

interface InvoiceGroup {
  approvalId: string
  approvalCode: string | null
  approvalDate: string | null
  clientCompany: string | null
  version: number
  managerName: string | null
  salesTotalPrice: number
  purchaseTotalPrice: number
  records: InvoiceRecordRow[]
}

interface InvoiceSummary {
  totalSales: number
  totalPurchase: number
  salesCount: number
  purchaseCount: number
  salesByStatus: Record<string, number>
  purchaseByStatus: Record<string, number>
}

function toIso(d: Date | null | undefined): string | null {
  return d ? d.toISOString() : null
}

function toNum(d: unknown): number {
  if (d === null || d === undefined) return 0
  const n = Number(d)
  return Number.isFinite(n) ? n : 0
}

function toRow(r: InvoiceRecord): InvoiceRecordRow {
  return {
    id: r.id,
    invoiceType: r.invoiceType as InvoiceType,
    productId: r.productId,
    vendorCompany: r.vendorCompany,
    clientCompany: r.clientCompany,
    productName: r.productName,
    partNumber: r.partNumber,
    quantity: r.quantity,
    unitPrice: toNum(r.unitPrice),
    totalPrice: toNum(r.totalPrice),
    status: r.status as InvoiceStatus,
    invoiceDate: toIso(r.invoiceDate),
    invoiceNumber: r.invoiceNumber,
    remarks: r.remarks,
    amendedFromId: r.amendedFromId,
    cancelledAt: toIso(r.cancelledAt),
    cancelReason: r.cancelReason,
    createdAt: r.createdAt.toISOString(),
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month')
    const approvalCode = searchParams.get('approvalCode')
    const clientCompany = searchParams.get('clientCompany')
    const vendorCompany = searchParams.get('vendorCompany')
    const invoiceStatusParam = searchParams.get('invoiceStatus') as InvoiceStatus | null
    const invoiceTypeParam = searchParams.get('invoiceType') as InvoiceType | null

    // 1. 대상 품의서 (APPROVED + isLatest)
    const approvalWhere: Record<string, unknown> = {
      status: 'APPROVED',
      isLatest: true,
    }

    if (month) {
      const match = /^(\d{4})-(\d{2})$/.exec(month)
      if (!match) {
        return NextResponse.json(
          { error: 'month는 YYYY-MM 형식이어야 합니다' },
          { status: 400 }
        )
      }
      const year = Number(match[1])
      const mon = Number(match[2])
      if (mon < 1 || mon > 12) {
        return NextResponse.json(
          { error: 'month의 월은 1~12 범위여야 합니다' },
          { status: 400 }
        )
      }
      const startDate = new Date(year, mon - 1, 1)
      const endDate = new Date(year, mon, 1)
      approvalWhere.approvalDate = { gte: startDate, lt: endDate }
    }
    if (approvalCode) {
      approvalWhere.approvalCode = { contains: approvalCode, mode: 'insensitive' }
    }
    if (clientCompany) {
      approvalWhere.clientCompany = { contains: clientCompany, mode: 'insensitive' }
    }

    const approvals = await prisma.salesApproval.findMany({
      where: approvalWhere,
      select: {
        id: true,
        approvalCode: true,
        approvalDate: true,
        version: true,
        clientCompany: true,
        managerName: true,
      },
      orderBy: { approvalCode: 'asc' },
    })

    const approvalIds = approvals.map((a) => a.id)
    if (approvalIds.length === 0) {
      return NextResponse.json({
        groups: [],
        summary: emptySummary(),
      })
    }

    // 2. 관련 InvoiceRecord 조회 (필터 적용)
    const recordWhere: Record<string, unknown> = {
      approvalId: { in: approvalIds },
    }
    if (invoiceTypeParam) recordWhere.invoiceType = invoiceTypeParam
    if (invoiceStatusParam) recordWhere.status = invoiceStatusParam
    if (vendorCompany) {
      recordWhere.AND = [
        { invoiceType: 'PURCHASE' },
        { vendorCompany: { contains: vendorCompany, mode: 'insensitive' } },
      ]
    }

    const records = await prisma.invoiceRecord.findMany({
      where: recordWhere,
      orderBy: [{ invoiceType: 'asc' }, { createdAt: 'asc' }],
    })

    // 3. 품의서별 groupBy + summary 집계
    const byApproval = new Map<string, InvoiceRecord[]>()
    for (const r of records) {
      // InvoiceRecord.approvalId는 nullable (MA_BILLING 소스일 때 null) — 이 API는 SALES_APPROVAL 소스만 다룸
      if (!r.approvalId) continue
      const arr = byApproval.get(r.approvalId) ?? []
      arr.push(r)
      byApproval.set(r.approvalId, arr)
    }

    const summary: InvoiceSummary = emptySummary()
    const groups: InvoiceGroup[] = []

    for (const approval of approvals) {
      const rs = byApproval.get(approval.id) ?? []
      if (rs.length === 0 && (invoiceStatusParam || invoiceTypeParam || vendorCompany)) {
        // 필터 적용 시 관련 레코드 없는 품의서는 제외
        continue
      }

      let groupSalesTotal = 0
      let groupPurchaseTotal = 0
      const rows: InvoiceRecordRow[] = []

      for (const r of rs) {
        const row = toRow(r)
        rows.push(row)

        // 합계: CANCELLED 제외한 활성 레코드만 집계
        if (row.status !== 'CANCELLED') {
          if (row.invoiceType === 'SALES') {
            groupSalesTotal += row.totalPrice
            summary.totalSales += row.totalPrice
            summary.salesCount += 1
            summary.salesByStatus[row.status] =
              (summary.salesByStatus[row.status] || 0) + 1
          } else {
            groupPurchaseTotal += row.totalPrice
            summary.totalPurchase += row.totalPrice
            summary.purchaseCount += 1
            summary.purchaseByStatus[row.status] =
              (summary.purchaseByStatus[row.status] || 0) + 1
          }
        }
      }

      groups.push({
        approvalId: approval.id,
        approvalCode: approval.approvalCode,
        approvalDate: toIso(approval.approvalDate),
        clientCompany: approval.clientCompany,
        version: approval.version,
        managerName: approval.managerName,
        salesTotalPrice: groupSalesTotal,
        purchaseTotalPrice: groupPurchaseTotal,
        records: rows,
      })
    }

    return NextResponse.json({ groups, summary })
  } catch (error) {
    console.error('통합 계산서 발행현황 조회 오류:', error)
    return NextResponse.json({ error: '목록을 불러오는데 실패했습니다' }, { status: 500 })
  }
}

function emptySummary(): InvoiceSummary {
  return {
    totalSales: 0,
    totalPurchase: 0,
    salesCount: 0,
    purchaseCount: 0,
    salesByStatus: {},
    purchaseByStatus: {},
  }
}

/**
 * PATCH /api/management/invoice-status
 *
 * ⚠ 상태 전이는 이 엔드포인트에서 처리하지 않는다. 전용 API 사용:
 *   - POST /api/management/invoices/issue   (PENDING → ISSUED)
 *   - POST /api/management/invoices/amend   (ISSUED/NEEDS_AMENDMENT → CANCELLED + 신규 PENDING)
 *   - POST /api/management/invoices/cancel  (→ CANCELLED)
 *
 * 이 PATCH는 InvoiceRecord의 메타데이터(invoiceNumber/invoiceDate/remarks)만 수정.
 *
 * Body:
 *   - id:    InvoiceRecord.id (필수)
 *   - field: 'invoiceNumber' | 'invoiceDate' | 'remarks'
 *   - value: string | null
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, field, value } = body as {
      id?: string
      field?: string
      value?: string | null
    }

    if (!id || !field) {
      return NextResponse.json(
        { error: 'id, field가 필요합니다' },
        { status: 400 }
      )
    }

    const allowedFields = new Set(['invoiceNumber', 'invoiceDate', 'remarks'])
    if (!allowedFields.has(field)) {
      return NextResponse.json(
        {
          error:
            '상태 전이는 /api/management/invoices/issue|amend|cancel을 사용하세요. 이 엔드포인트는 invoiceNumber/invoiceDate/remarks만 수정 가능합니다.',
        },
        { status: 400 }
      )
    }

    const target = await prisma.invoiceRecord.findUnique({ where: { id } })
    if (!target) {
      return NextResponse.json(
        { error: '수정 대상 InvoiceRecord가 존재하지 않습니다' },
        { status: 404 }
      )
    }

    const data: Record<string, unknown> = {}
    if (field === 'invoiceNumber') data.invoiceNumber = value || null
    if (field === 'remarks') data.remarks = value || null
    if (field === 'invoiceDate') data.invoiceDate = value ? new Date(value) : null

    const updated = await prisma.invoiceRecord.update({
      where: { id: target.id },
      data,
    })

    return NextResponse.json({ success: true, record: updated })
  } catch (error) {
    console.error('계산서 메타 수정 오류:', error)
    return NextResponse.json({ error: '수정에 실패했습니다' }, { status: 500 })
  }
}
