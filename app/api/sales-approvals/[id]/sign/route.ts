import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { notifyTeamLeadSigned, notifyApprovalApproved } from '@/lib/notifications/sender'

// VAT 계산 유틸 (10% 고정)
function calculateVat(supplyAmount: number | unknown): number {
  const amount = Number(supplyAmount || 0)
  return Math.round(amount * 0.1)
}

interface RouteParams {
  params: Promise<{ id: string }>
}

// SALES_MANAGER 서명은 submit API(기안)에서 처리한다 (BUSINESS_RULES §5).
// sign API는 TEAM_LEADER / CEO 결재만 담당.
type SignRole = 'TEAM_LEADER' | 'CEO'

const INCLUDE_FULL = {
  salesManager: { select: { id: true, name: true, signatureUrl: true } },
  teamLeader: { select: { id: true, name: true, signatureUrl: true } },
  ceo: { select: { id: true, name: true, signatureUrl: true } },
  products: {
    include: { items: { orderBy: { sortOrder: 'asc' as const } } },
    orderBy: { sortOrder: 'asc' as const },
  },
}

// POST /api/sales-approvals/[id]/sign - 품의서 서명
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    const { userId, role } = body as { userId: string; role: SignRole }

    if (!userId || !role) {
      return NextResponse.json(
        { error: 'userId와 role이 필요합니다' },
        { status: 400 }
      )
    }

    if (!['TEAM_LEADER', 'CEO'].includes(role)) {
      return NextResponse.json(
        { error: '유효하지 않은 역할입니다 (SALES_MANAGER는 submit API에서 처리)' },
        { status: 400 }
      )
    }

    const approval = await prisma.salesApproval.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        approvalNumber: true,
        clientCompany: true,
        createdById: true,
        salesManagerId: true,
        teamLeaderId: true,
        ceoId: true,
        version: true,
        originalId: true,
      },
    })

    if (!approval) {
      return NextResponse.json(
        { error: '품의서를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, signatureUrl: true },
    })

    if (!user) {
      return NextResponse.json({ error: '사용자를 찾을 수 없습니다' }, { status: 404 })
    }

    if (!user.signatureUrl) {
      return NextResponse.json(
        { error: '서명 이미지가 등록되지 않았습니다. 먼저 서명을 등록해주세요.' },
        { status: 400 }
      )
    }

    const now = new Date()

    if (role === 'TEAM_LEADER') {
      if (approval.status !== 'PENDING_TEAM_LEAD') {
        return NextResponse.json(
          { error: '영업팀장 승인 대기 상태의 품의서만 서명할 수 있습니다' },
          { status: 400 }
        )
      }
      const updated = await prisma.salesApproval.update({
        where: { id },
        data: { teamLeaderId: userId, teamLeaderSignedAt: now, status: 'PENDING_CEO' },
        include: INCLUDE_FULL,
      })

      // CEO에게 최종 결재 요청 알림
      notifyTeamLeadSigned({
        id: approval.id,
        approvalNumber: approval.approvalNumber,
        clientCompany: approval.clientCompany,
      }).catch((err) => console.error('알림 발송 실패:', err))

      return NextResponse.json(updated)
    }

    if (role === 'CEO') {
      if (approval.status !== 'PENDING_CEO') {
        return NextResponse.json(
          { error: '대표이사 승인 대기 상태의 품의서만 서명할 수 있습니다' },
          { status: 400 }
        )
      }

      // 제품 + 품목 조회
      const products = await prisma.salesApprovalProduct.findMany({
        where: { approvalId: id },
        include: { items: { orderBy: { sortOrder: 'asc' } } },
        orderBy: { sortOrder: 'asc' },
      })

      // 현재 품의서의 원본 ID (revise 체인의 루트)
      const rootApprovalId = approval.originalId || approval.id

      const updated = await prisma.$transaction(async (tx) => {
        // 1. 품의서 승인
        const result = await tx.salesApproval.update({
          where: { id },
          data: {
            ceoId: userId,
            ceoSignedAt: now,
            status: 'APPROVED',
            approvalDate: now,
          },
          include: INCLUDE_FULL,
        })

        const currentVersion = result.version

        // 2. Revise인 경우 이전 버전의 원장 비활성화
        if (currentVersion > 1) {
          const cancelReason = `REVISED_v${currentVersion}`
          await tx.salesLedger.updateMany({
            where: {
              salesApprovalId: rootApprovalId,
              isActive: true,
            },
            data: {
              isActive: false,
              cancelledAt: now,
              cancelReason,
            },
          })
          await tx.purchaseLedger.updateMany({
            where: {
              salesApprovalId: rootApprovalId,
              isActive: true,
            },
            data: {
              isActive: false,
              cancelledAt: now,
              cancelReason,
            },
          })

          // 2b. 이전 버전 InvoiceRecord 처리
          //   - PENDING  → CANCELLED(REVISED_v{n})   (아직 미발행이므로 폐기)
          //   - ISSUED   → NEEDS_AMENDMENT          (경영팀이 수정세금계산서 발행 유도)
          //   - NEEDS_AMENDMENT / CANCELLED → 유지
          //
          // amendedFromId 연결은 여기서 하지 않는다. 경영팀이 /api/management/invoices/amend 호출 시 명시적으로 연결.
          const previousApprovals = await tx.salesApproval.findMany({
            where: {
              OR: [{ id: rootApprovalId }, { originalId: rootApprovalId }],
              NOT: { id },
            },
            select: { id: true },
          })
          const previousApprovalIds = previousApprovals.map((p) => p.id)

          if (previousApprovalIds.length > 0) {
            // PENDING → CANCELLED
            await tx.invoiceRecord.updateMany({
              where: {
                approvalId: { in: previousApprovalIds },
                status: 'PENDING',
              },
              data: {
                status: 'CANCELLED',
                cancelledAt: now,
                cancelReason,
              },
            })
            // ISSUED → NEEDS_AMENDMENT
            await tx.invoiceRecord.updateMany({
              where: {
                approvalId: { in: previousApprovalIds },
                status: 'ISSUED',
              },
              data: {
                status: 'NEEDS_AMENDMENT',
              },
            })
          }
        }

        // 3. 매출 계산서 자동생성 (제품 단위 고정)
        //    식별 규칙: (approvalId, productId)
        for (const product of products) {
          const existing = await tx.invoiceRecord.findFirst({
            where: {
              approvalId: id,
              productId: product.id,
              invoiceType: 'SALES',
              amendedFromId: null,
            },
          })
          if (!existing) {
            await tx.invoiceRecord.create({
              data: {
                approvalId: id,
                invoiceType: 'SALES',
                productId: product.id,
                productName: product.name,
                quantity: product.quantity,
                unitPrice: product.unitPrice || 0,
                totalPrice: product.totalPrice || 0,
                clientCompany: approval.clientCompany,
                status: 'PENDING',
              },
            })
          }
        }

        // 4. 매입 계산서 자동생성 — 매입처별 groupBy (제품 경계 넘음)
        //    식별 규칙: (approvalId, vendorCompany)
        //    대상 품목: purchaseInvoiceRequired=true + vendorName + purchaseTotal>0
        const vendorGroups = new Map<
          string,
          {
            vendor: string
            items: Array<{
              partNumber: string | null
              description: string | null
              productName: string
              qty: number
              total: number
            }>
          }
        >()
        for (const product of products) {
          for (const item of product.items) {
            if (!item.purchaseInvoiceRequired) continue
            if (!item.vendorName) continue
            const total = Number(item.purchaseTotal || 0)
            if (total === 0) continue

            const key = item.vendorName
            if (!vendorGroups.has(key)) {
              vendorGroups.set(key, { vendor: key, items: [] })
            }
            vendorGroups.get(key)!.items.push({
              partNumber: item.partNumber,
              description: item.description,
              productName: product.name,
              qty: item.purchaseQty,
              total,
            })
          }
        }

        for (const { vendor, items } of vendorGroups.values()) {
          const existing = await tx.invoiceRecord.findFirst({
            where: {
              approvalId: id,
              vendorCompany: vendor,
              invoiceType: 'PURCHASE',
              amendedFromId: null,
            },
          })
          if (existing) continue

          const totalAmount = items.reduce((s, i) => s + i.total, 0)
          const totalQty = items.reduce((s, i) => s + i.qty, 0)
          // 스냅샷 표기: 품목 1건이면 그 품목명, 여러 건이면 대표 + 합산 표기
          const productName =
            items.length === 1
              ? items[0].partNumber || items[0].description || items[0].productName
              : `${items[0].partNumber || items[0].description || items[0].productName} 외 ${items.length - 1}건`

          await tx.invoiceRecord.create({
            data: {
              approvalId: id,
              invoiceType: 'PURCHASE',
              vendorCompany: vendor,
              productName,
              partNumber: items.length === 1 ? items[0].partNumber : null,
              quantity: totalQty,
              unitPrice: items.length === 1 && totalQty > 0 ? totalAmount / totalQty : 0,
              totalPrice: totalAmount,
              clientCompany: approval.clientCompany,
              status: 'PENDING',
            },
          })
        }

        // 5. 매출장 자동 생성 (Product 단위, VAT 10% 고정)
        for (const product of products) {
          const supplyAmount = Number(product.totalPrice || 0)
          const vatAmount = calculateVat(supplyAmount)
          const totalAmount = supplyAmount + vatAmount

          await tx.salesLedger.create({
            data: {
              approvalCode: result.approvalCode,
              transactionDate: result.approvalDate || now,
              clientCompany: approval.clientCompany || '',
              endUser: result.endUser,
              category: product.category,
              subCategory: product.subCategory,
              description: product.name,
              quantity: product.quantity,
              unitPrice: product.unitPrice || 0,
              supplyAmount,
              vatAmount,
              totalAmount,
              managerName: result.managerName,
              salesApprovalId: rootApprovalId,
              sourceProductId: product.id,
              approvalVersion: currentVersion,
              isActive: true,
            },
          })
        }

        // 6. 매입장 자동 생성 (매입 Item 단위, VAT 10% 고정)
        for (const product of products) {
          for (const item of product.items) {
            if (!item.vendorName || !item.purchaseTotal || Number(item.purchaseTotal) === 0) continue

            const supplyAmount = Number(item.purchaseTotal)
            const vatAmount = calculateVat(supplyAmount)
            const totalAmount = supplyAmount + vatAmount

            await tx.purchaseLedger.create({
              data: {
                approvalCode: result.approvalCode,
                invoiceDate: item.purchaseDate || now,
                vendorCompany: item.vendorName,
                clientCompany: approval.clientCompany,
                category: product.category,
                subCategory: product.subCategory,
                itemName: item.description || item.partNumber || product.name,
                quantity: item.purchaseQty,
                unitPrice: item.purchasePrice || 0,
                supplyAmount,
                vatAmount,
                totalAmount,
                salesApprovalId: rootApprovalId,
                sourceItemId: item.id,
                sourceProductId: product.id,
                approvalVersion: currentVersion,
                isActive: true,
              },
            })
          }
        }

        return result
      })

      // 작성자에게 승인 알림
      notifyApprovalApproved({
        id: approval.id,
        approvalNumber: approval.approvalNumber,
        clientCompany: approval.clientCompany,
        createdById: approval.createdById,
      }).catch((err) => console.error('알림 발송 실패:', err))

      return NextResponse.json(updated)
    }

    return NextResponse.json(
      { error: '처리할 수 없는 요청입니다' },
      { status: 400 }
    )
  } catch (error) {
    console.error('품의서 서명 오류:', error)
    return NextResponse.json(
      { error: '서명 처리에 실패했습니다' },
      { status: 500 }
    )
  }
}
