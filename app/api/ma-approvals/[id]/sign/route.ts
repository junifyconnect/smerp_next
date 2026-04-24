import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { buildBillingSchedule } from '@/lib/ma/billing-schedule'
import {
  notifyMATeamLeadSigned,
  notifyMAApprovalApproved,
} from '@/lib/notifications/sender'

// MA 품의서의 대표 clientCompany — items[0]에서 파생 (MAApproval에는 clientCompany 컬럼 없음)
async function fetchMAClientCompany(approvalId: string): Promise<string | null> {
  const item = await prisma.mAApprovalItem.findFirst({
    where: { approvalId },
    select: { clientCompany: true, salesCompany: true },
  })
  return item?.clientCompany || item?.salesCompany || null
}

// VAT 계산 유틸 (10% 고정, BUSINESS_RULES §2)
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
  items: { orderBy: { sortOrder: 'asc' as const } },
}

// POST /api/ma-approvals/[id]/sign — 3단계 서명
// CEO 서명 시 트랜잭션으로 MAContract + MABilling N건 자동 생성 (BUSINESS_RULES §10.2)
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

    const approval = await prisma.mAApproval.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        approvalNumber: true,
        approvalCode: true,
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
        { error: 'MA 품의서를 찾을 수 없습니다' },
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
      const updated = await prisma.mAApproval.update({
        where: { id },
        data: {
          teamLeaderId: userId,
          teamLeaderSignedAt: now,
          status: 'PENDING_CEO',
        },
        include: INCLUDE_FULL,
      })

      // CEO에게 최종 결재 요청 알림 (비동기)
      fetchMAClientCompany(id)
        .then((clientCompany) =>
          notifyMATeamLeadSigned({
            id: approval.id,
            approvalNumber: approval.approvalNumber,
            clientCompany,
          })
        )
        .catch((err) => console.error('MA 팀장 서명 알림 실패:', err))

      return NextResponse.json(updated)
    }

    // CEO — 자동 생성 트랜잭션
    if (approval.status !== 'PENDING_CEO') {
      return NextResponse.json(
        { error: '대표이사 승인 대기 상태의 품의서만 서명할 수 있습니다' },
        { status: 400 }
      )
    }

    const items = await prisma.mAApprovalItem.findMany({
      where: { approvalId: id },
      orderBy: { sortOrder: 'asc' },
    })

    // revise 체인의 루트 (v1의 id)
    const rootApprovalId = approval.originalId || approval.id

    const updated = await prisma.$transaction(async (tx) => {
      // 1. 품의서 승인
      const result = await tx.mAApproval.update({
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

      // 2. revise인 경우 이전 버전의 MAContract/MABilling + 파생 InvoiceRecord 처리
      //    영업과 동일한 규칙 (BUSINESS_RULES §10.4):
      //    - v1 MAContract/MABilling → isActive=false
      //    - v1 MABilling에서 파생된 PENDING InvoiceRecord → CANCELLED(REVISED_v{n})
      //    - v1 MABilling에서 파생된 ISSUED InvoiceRecord → NEEDS_AMENDMENT (수정세금계산서 유도)
      //    - NEEDS_AMENDMENT / CANCELLED는 유지
      if (currentVersion > 1) {
        const cancelReason = `REVISED_v${currentVersion}`

        // 2a. 이전 MABilling 조회 (InvoiceRecord 전이 전에 id 목록 확보)
        const previousBillings = await tx.mABilling.findMany({
          where: {
            maContract: { rootApprovalId },
            isActive: true,
          },
          select: { id: true },
        })
        const previousBillingIds = previousBillings.map((b) => b.id)

        await tx.mAContract.updateMany({
          where: { rootApprovalId, isActive: true },
          data: { isActive: false, cancelledAt: now, cancelReason },
        })
        await tx.mABilling.updateMany({
          where: { maContract: { rootApprovalId }, isActive: true },
          data: { isActive: false, cancelledAt: now, cancelReason },
        })

        // 2b. 이전 버전에서 파생된 InvoiceRecord 전이
        if (previousBillingIds.length > 0) {
          // PENDING → CANCELLED
          await tx.invoiceRecord.updateMany({
            where: {
              maBillingId: { in: previousBillingIds },
              status: 'PENDING',
            },
            data: { status: 'CANCELLED', cancelledAt: now, cancelReason },
          })
          // ISSUED → NEEDS_AMENDMENT (경영팀이 amend 호출 유도)
          await tx.invoiceRecord.updateMany({
            where: {
              maBillingId: { in: previousBillingIds },
              status: 'ISSUED',
            },
            data: { status: 'NEEDS_AMENDMENT' },
          })
        }
      }

      // 3. MAContract 생성 (계약 1건 = 품의서 1건, 품목별로 기간이 다를 수 있지만
      //    MA 품의서 = 계약 세트 단위로 처리. 가장 빠른 startDate ~ 가장 늦은 endDate 를 계약 기간으로)
      const startDates = items.map((i) => i.startDate).filter((d): d is Date => !!d)
      const endDates = items.map((i) => i.endDate).filter((d): d is Date => !!d)
      if (startDates.length === 0 || endDates.length === 0) {
        throw new Error(
          '품목에 시작일/종료일이 없어 MAContract를 생성할 수 없습니다. 품의서를 보완 후 다시 승인해주세요.'
        )
      }
      const contractStart = new Date(Math.min(...startDates.map((d) => d.getTime())))
      const contractEnd = new Date(Math.max(...endDates.map((d) => d.getTime())))

      // 대표 고객사 (items의 첫 번째 — 실무상 1 MA 품의서 = 1 고객사 전제)
      const clientCompany =
        items.find((i) => i.clientCompany)?.clientCompany ||
        items.find((i) => i.salesCompany)?.salesCompany ||
        ''

      const contract = await tx.mAContract.create({
        data: {
          maApprovalId: id,
          rootApprovalId,
          approvalVersion: currentVersion,
          clientCompany,
          contractStartDate: contractStart,
          contractEndDate: contractEnd,
          isActive: true,
        },
      })

      // 4. MABilling 생성 — 품목별로 청구 일정 계산 후 월별 합산
      //    (한 품의서 내 여러 품목이 같은 청구월에 겹치면 amount가 합산되어 한 행으로 들어감)
      type Accum = {
        billingMonth: Date
        dueDate: Date
        salesAmount: number
        purchaseAmount: number
        itemNames: string[]
        clientCompany: string
        vendorCompany: string | null
        // 출처 — 대표 1개 품목만 기록 (집계는 여러 품목이 섞여 있을 수 있음)
        sourceItemId: string | null
      }
      const byMonth = new Map<string, Accum>()

      for (const item of items) {
        if (!item.startDate || !item.endDate) continue

        const salesPrice = Number(item.salesPrice || 0) * (item.quantity || 1)
        const purchasePrice = Number(item.purchasePrice || 0) * (item.quantity || 1)

        // 매출 schedule
        if (item.salesBillingCycle && salesPrice > 0) {
          const schedule = buildBillingSchedule({
            startDate: item.startDate,
            endDate: item.endDate,
            cycle: item.salesBillingCycle,
            billingDayOfMonth: item.billingDayOfMonth,
          })
          for (const entry of schedule) {
            const key = entry.billingMonth.toISOString().slice(0, 7)
            const existing = byMonth.get(key)
            if (existing) {
              existing.salesAmount += salesPrice
              existing.itemNames.push(item.smCode || item.vendorCode || '')
            } else {
              byMonth.set(key, {
                billingMonth: entry.billingMonth,
                dueDate: entry.dueDate,
                salesAmount: salesPrice,
                purchaseAmount: 0,
                itemNames: [item.smCode || item.vendorCode || ''],
                clientCompany:
                  item.clientCompany || item.salesCompany || clientCompany,
                vendorCompany: item.purchaseCompany || null,
                sourceItemId: item.id,
              })
            }
          }
        }

        // 매입 schedule
        if (item.purchaseBillingCycle && purchasePrice > 0) {
          const schedule = buildBillingSchedule({
            startDate: item.startDate,
            endDate: item.endDate,
            cycle: item.purchaseBillingCycle,
            billingDayOfMonth: item.billingDayOfMonth,
          })
          for (const entry of schedule) {
            const key = entry.billingMonth.toISOString().slice(0, 7)
            const existing = byMonth.get(key)
            if (existing) {
              existing.purchaseAmount += purchasePrice
              // vendorCompany는 최초 기록한 것 유지 (여러 품목이 같은 매입처인 게 일반적)
              if (!existing.vendorCompany && item.purchaseCompany) {
                existing.vendorCompany = item.purchaseCompany
              }
            } else {
              byMonth.set(key, {
                billingMonth: entry.billingMonth,
                dueDate: entry.dueDate,
                salesAmount: 0,
                purchaseAmount: purchasePrice,
                itemNames: [item.smCode || item.vendorCode || ''],
                clientCompany:
                  item.clientCompany || item.salesCompany || clientCompany,
                vendorCompany: item.purchaseCompany || null,
                sourceItemId: item.id,
              })
            }
          }
        }
      }

      // byMonth → MABilling 레코드 생성 (billingMonth 오름차순)
      const sortedKeys = Array.from(byMonth.keys()).sort()
      for (const key of sortedKeys) {
        const acc = byMonth.get(key)!
        const salesVat = calculateVat(acc.salesAmount)
        const purchaseVat = calculateVat(acc.purchaseAmount)

        await tx.mABilling.create({
          data: {
            maContractId: contract.id,
            billingMonth: acc.billingMonth,
            dueDate: acc.dueDate,
            salesAmount: acc.salesAmount,
            purchaseAmount: acc.purchaseAmount,
            salesVatAmount: salesVat,
            purchaseVatAmount: purchaseVat,
            salesTotalAmount: acc.salesAmount + salesVat,
            purchaseTotalAmount: acc.purchaseAmount + purchaseVat,
            clientCompany: acc.clientCompany,
            vendorCompany: acc.vendorCompany,
            itemName:
              acc.itemNames.filter(Boolean).join(', ') || clientCompany,
            sourceItemId: acc.sourceItemId,
            approvalVersion: currentVersion,
            isActive: true,
          },
        })
      }

      return result
    })

    // 작성자에게 승인 완료 알림 (비동기)
    fetchMAClientCompany(id)
      .then((clientCompany) =>
        notifyMAApprovalApproved({
          id: approval.id,
          approvalNumber: approval.approvalNumber,
          clientCompany,
          createdById: approval.createdById,
        })
      )
      .catch((err) => console.error('MA 승인 알림 실패:', err))

    return NextResponse.json(updated)
  } catch (error) {
    console.error('MA 품의서 서명 오류:', error)
    const message = error instanceof Error ? error.message : '서명에 실패했습니다'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
