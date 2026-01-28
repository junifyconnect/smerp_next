import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

interface RouteParams {
  params: Promise<{ id: string }>
}

interface ItemDetail {
  partNumber?: string
  description?: string
  quantity?: number
  sortOrder?: number
}

interface ItemInput {
  sourceItemId?: string  // 복사 원본 아이템 ID (수정된 아이템)
  productName?: string
  partNumber?: string | null
  isConsolidated?: boolean
  quantity?: number
  unitPrice?: number
  vendorCompany?: string
  sortOrder?: number
  details?: ItemDetail[]
}

interface ReviseBody {
  approvalCode?: string
  approvalDate?: string
  managerName?: string
  clientCompany?: string
  clientContact?: string
  clientPhone?: string
  endUser?: string
  paymentTerms?: string
  invoiceEmail?: string
  deliveryAddress?: string
  deliveryDate?: string
  receiverName?: string
  receiverPhone?: string
  notes?: string
  items?: ItemInput[]
  purchaseItems?: ItemInput[]
}

// POST /api/sales-approvals/[id]/revise - 새 버전 생성 (단순 복사 방식)
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    // body 파싱
    let body: ReviseBody = {}
    try {
      body = await request.json()
    } catch {
      // body가 없으면 빈 객체
    }

    // 원본 품의서 조회
    const originalApproval = await prisma.salesApproval.findUnique({
      where: { id },
      include: {
        deal: true,
        items: {
          include: { details: { orderBy: { sortOrder: 'asc' } } },
          orderBy: { sortOrder: 'asc' },
        },
        purchaseItems: {
          include: { details: { orderBy: { sortOrder: 'asc' } } },
          orderBy: { sortOrder: 'asc' },
        },
      },
    })

    if (!originalApproval) {
      return NextResponse.json(
        { error: '원본 품의서를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    // DRAFT 상태는 직접 수정
    if (originalApproval.status === 'DRAFT') {
      return NextResponse.json(
        { error: '작성중인 품의서는 직접 수정 가능합니다' },
        { status: 400 }
      )
    }

    // 최신 버전이 아니면 수정 불가
    if (!originalApproval.isLatest) {
      return NextResponse.json(
        { error: '이전 버전은 수정할 수 없습니다. 최신 버전에서 수정해주세요.' },
        { status: 400 }
      )
    }

    // 새 품의번호 생성
    const year = new Date().getFullYear()
    const lastApproval = await prisma.salesApproval.findFirst({
      where: { approvalNumber: { startsWith: `SA-${year}-` } },
      orderBy: { approvalNumber: 'desc' },
    })

    let sequence = 1
    if (lastApproval) {
      const lastNum = parseInt(lastApproval.approvalNumber.split('-')[2])
      sequence = lastNum + 1
    }
    const newApprovalNumber = `SA-${year}-${String(sequence).padStart(4, '0')}`

    // 버전 정보
    const newVersion = (originalApproval.version || 1) + 1
    const chainRootId = originalApproval.originalId || originalApproval.id

    // body에 아이템이 있으면 사용, 없으면 원본에서 복사
    const salesItems = body.items || originalApproval.items.map(item => ({
      sourceItemId: item.id,
      productName: item.productName,
      partNumber: item.partNumber,
      isConsolidated: item.isConsolidated,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      sortOrder: item.sortOrder,
      details: item.details.map(d => ({
        partNumber: d.partNumber,
        description: d.description,
        quantity: d.quantity,
        sortOrder: d.sortOrder,
      })),
    }))

    const purchaseItems = body.purchaseItems || originalApproval.purchaseItems.map(item => ({
      sourceItemId: item.id,
      productName: item.productName,
      isConsolidated: item.isConsolidated,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      vendorCompany: item.vendorCompany,
      sortOrder: item.sortOrder,
      details: item.details.map(d => ({
        sourceDetailId: d.id,
        partNumber: d.partNumber,
        description: d.description,
        quantity: d.quantity,
        sortOrder: d.sortOrder,
        // 개별 매입 필드들도 복사
        salesItemDetailId: d.salesItemDetailId,
        vendorCompany: d.vendorCompany,
        unitPrice: d.unitPrice ? Number(d.unitPrice) : null,
        totalPrice: d.totalPrice ? Number(d.totalPrice) : null,
      })),
    }))

    // 금액 계산
    const totalAmount = salesItems.reduce((sum, item) =>
      sum + (item.quantity || 1) * (item.unitPrice || 0), 0)
    const vatAmount = Math.round(totalAmount * 0.1)
    const totalWithVat = totalAmount + vatAmount
    const purchaseTotal = purchaseItems.reduce((sum, item) =>
      sum + (item.quantity || 1) * (item.unitPrice || 0), 0)
    const purchaseTotalWithVat = Math.round(purchaseTotal * 1.1)

    // 원본 아이템 맵 (계산서 상태 복사용)
    const originalSalesItemMap = new Map(originalApproval.items.map(i => [i.id, i]))
    const originalPurchaseItemMap = new Map(originalApproval.purchaseItems.map(i => [i.id, i]))

    // 트랜잭션으로 처리
    const newApproval = await prisma.$transaction(async (tx) => {
      // 1. 기존 버전 isLatest = false
      await tx.salesApproval.update({
        where: { id: originalApproval.id },
        data: { isLatest: false },
      })

      // 2. 새 품의서 생성
      const approval = await tx.salesApproval.create({
        data: {
          deal: originalApproval.dealId ? { connect: { id: originalApproval.dealId } } : undefined,
          approvalNumber: newApprovalNumber,
          status: 'DRAFT',
          approvalCode: body.approvalCode || originalApproval.approvalCode,
          version: newVersion,
          original: { connect: { id: chainRootId } },
          isLatest: true,
          approvalDate: body.approvalDate ? new Date(body.approvalDate) : new Date(),
          managerName: body.managerName ?? originalApproval.managerName,
          clientCompany: body.clientCompany ?? originalApproval.clientCompany,
          clientContact: body.clientContact ?? originalApproval.clientContact,
          clientPhone: body.clientPhone ?? originalApproval.clientPhone,
          endUser: body.endUser ?? originalApproval.endUser,
          totalAmount,
          vatAmount,
          totalWithVat,
          purchaseTotal,
          purchaseTotalWithVat,
          paymentTerms: body.paymentTerms ?? originalApproval.paymentTerms,
          deliveryAddress: body.deliveryAddress ?? originalApproval.deliveryAddress,
          deliveryDate: body.deliveryDate ? new Date(body.deliveryDate) : (originalApproval.deliveryDate || null),
          invoiceEmail: body.invoiceEmail ?? originalApproval.invoiceEmail,
          receiverName: body.receiverName ?? originalApproval.receiverName,
          receiverPhone: body.receiverPhone ?? originalApproval.receiverPhone,
          notes: body.notes ?? originalApproval.notes,
          createdById: originalApproval.createdById,
        },
      })

      // 3. 매출 아이템 복사 생성 (계산서 상태 계산 포함)
      const copiedSalesItemIds = new Set<string>()

      for (let i = 0; i < salesItems.length; i++) {
        const item = salesItems[i]
        const originalItem = item.sourceItemId ? originalSalesItemMap.get(item.sourceItemId) : null

        if (item.sourceItemId) {
          copiedSalesItemIds.add(item.sourceItemId)
        }

        // 계산서 상태 결정
        let invoiceStatus: 'PENDING' | 'ISSUED' | 'AMENDMENT_NEEDED' = 'PENDING'

        if (originalItem) {
          const prevStatus = originalItem.salesInvoiceStatus
          // 이미 발행됐거나 수정 필요 상태면 계속 추적
          if (prevStatus === 'ISSUED' || prevStatus === 'AMENDMENT_NEEDED') {
            const isModified =
              (item.quantity || 1) !== originalItem.quantity ||
              (item.unitPrice || 0) !== Number(originalItem.unitPrice)

            if (prevStatus === 'ISSUED') {
              // 발행 완료 상태에서 변경되면 수정 필요, 아니면 발행 유지
              invoiceStatus = isModified ? 'AMENDMENT_NEEDED' : 'ISSUED'
            } else {
              // 이미 수정 필요 상태면 계속 수정 필요 유지
              invoiceStatus = 'AMENDMENT_NEEDED'
            }
          }
          // PENDING이면 그대로 PENDING
        }

        await tx.salesApprovalItem.create({
          data: {
            approvalId: approval.id,
            sourceItemId: item.sourceItemId || null,
            sortOrder: item.sortOrder ?? i,
            productName: item.productName || '품목',
            partNumber: item.partNumber || null,
            isConsolidated: item.isConsolidated || false,
            quantity: item.quantity || 1,
            unitPrice: item.unitPrice || 0,
            totalPrice: (item.quantity || 1) * (item.unitPrice || 0),
            salesInvoiceStatus: invoiceStatus,
            salesInvoiceDate: invoiceStatus === 'ISSUED' ? originalItem?.salesInvoiceDate : null,
            invoiceRemarks: originalItem?.invoiceRemarks || null,
            details: {
              create: (item.details || []).map((detail, detailIndex) => ({
                sortOrder: detail.sortOrder ?? detailIndex,
                partNumber: detail.partNumber || '',
                description: detail.description || '',
                quantity: detail.quantity || 1,
              })),
            },
          },
        })
      }

      // 삭제된 매출 아이템 처리 (원본에 있고 새 버전에 없는 것)
      for (const originalItem of originalApproval.items) {
        const prevStatus = originalItem.salesInvoiceStatus
        // 발행됐거나 수정 필요 상태인 아이템이 삭제되면 취소 필요
        if (!copiedSalesItemIds.has(originalItem.id) &&
            (prevStatus === 'ISSUED' || prevStatus === 'AMENDMENT_NEEDED')) {
          await tx.salesApprovalItem.update({
            where: { id: originalItem.id },
            data: { salesInvoiceStatus: 'CANCELLATION_NEEDED' },
          })
        }
      }

      // 4. 매입 아이템 복사 생성 (계산서 상태 계산 포함)
      const copiedPurchaseItemIds = new Set<string>()

      for (let i = 0; i < purchaseItems.length; i++) {
        const item = purchaseItems[i]
        const originalItem = item.sourceItemId ? originalPurchaseItemMap.get(item.sourceItemId) : null

        if (item.sourceItemId) {
          copiedPurchaseItemIds.add(item.sourceItemId)
        }

        // 계산서 상태 결정
        let invoiceStatus: 'PENDING' | 'ISSUED' | 'AMENDMENT_NEEDED' = 'PENDING'

        if (originalItem) {
          const prevStatus = originalItem.purchaseInvoiceStatus
          // 이미 발행됐거나 수정 필요 상태면 계속 추적
          if (prevStatus === 'ISSUED' || prevStatus === 'AMENDMENT_NEEDED') {
            const isModified =
              (item.quantity || 1) !== originalItem.quantity ||
              (item.unitPrice || 0) !== Number(originalItem.unitPrice)

            if (prevStatus === 'ISSUED') {
              // 발행 완료 상태에서 변경되면 수정 필요, 아니면 발행 유지
              invoiceStatus = isModified ? 'AMENDMENT_NEEDED' : 'ISSUED'
            } else {
              // 이미 수정 필요 상태면 계속 수정 필요 유지
              invoiceStatus = 'AMENDMENT_NEEDED'
            }
          }
          // PENDING이면 그대로 PENDING
        }

        await tx.salesApprovalPurchaseItem.create({
          data: {
            approvalId: approval.id,
            sourceItemId: item.sourceItemId || null,
            sortOrder: item.sortOrder ?? i,
            productName: item.productName || '품목',
            isConsolidated: item.isConsolidated || false,
            quantity: item.quantity || 1,
            unitPrice: item.unitPrice || 0,
            totalPrice: (item.quantity || 1) * (item.unitPrice || 0),
            vendorCompany: item.vendorCompany || '',
            purchaseInvoiceStatus: invoiceStatus,
            purchaseInvoiceDate: invoiceStatus === 'ISSUED' ? originalItem?.purchaseInvoiceDate : null,
            invoiceRemarks: originalItem?.invoiceRemarks || null,
            details: {
              create: (item.details || []).map((detail: {
                sourceDetailId?: string
                partNumber?: string
                description?: string
                quantity?: number
                sortOrder?: number
                salesItemDetailId?: string | null
                vendorCompany?: string | null
                unitPrice?: number | null
                totalPrice?: number | null
              }, detailIndex: number) => ({
                sortOrder: detail.sortOrder ?? detailIndex,
                partNumber: detail.partNumber || '',
                description: detail.description || '',
                quantity: detail.quantity || 1,
                // 새 구조 필드들
                sourceDetailId: detail.sourceDetailId || null,
                salesItemDetailId: detail.salesItemDetailId || null,
                vendorCompany: detail.vendorCompany || null,
                unitPrice: detail.unitPrice || null,
                totalPrice: detail.totalPrice || null,
              })),
            },
          },
        })
      }

      // 삭제된 매입 아이템 처리 (원본에 있고 새 버전에 없는 것)
      for (const originalItem of originalApproval.purchaseItems) {
        const prevStatus = originalItem.purchaseInvoiceStatus
        // 발행됐거나 수정 필요 상태인 아이템이 삭제되면 취소 필요
        if (!copiedPurchaseItemIds.has(originalItem.id) &&
            (prevStatus === 'ISSUED' || prevStatus === 'AMENDMENT_NEEDED')) {
          await tx.salesApprovalPurchaseItem.update({
            where: { id: originalItem.id },
            data: { purchaseInvoiceStatus: 'CANCELLATION_NEEDED' },
          })
        }
      }

      return approval
    })

    // 결과 조회
    const result = await prisma.salesApproval.findUnique({
      where: { id: newApproval.id },
      include: {
        items: {
          include: { details: { orderBy: { sortOrder: 'asc' } } },
          orderBy: { sortOrder: 'asc' },
        },
        purchaseItems: {
          include: { details: { orderBy: { sortOrder: 'asc' } } },
          orderBy: { sortOrder: 'asc' },
        },
        deal: { select: { id: true, name: true, status: true } },
      },
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('새 버전 생성 오류:', error)
    return NextResponse.json(
      { error: '새 버전 생성에 실패했습니다' },
      { status: 500 }
    )
  }
}
