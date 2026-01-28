import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/sales-approvals/[id]/compare - 버전별 아이템 비교
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    // 현재 품의서 조회
    const currentApproval = await prisma.salesApproval.findUnique({
      where: { id },
      select: {
        id: true,
        approvalCode: true,
        version: true,
        originalId: true,
        status: true,
        clientCompany: true,
        totalWithVat: true,
        approvalDate: true,
      },
    })

    if (!currentApproval) {
      return NextResponse.json(
        { error: '품의서를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    // 체인 루트 ID
    const chainRootId = currentApproval.originalId || currentApproval.id

    // 같은 체인의 모든 버전 조회
    const allVersions = await prisma.salesApproval.findMany({
      where: {
        OR: [
          { id: chainRootId },
          { originalId: chainRootId },
        ],
      },
      select: {
        id: true,
        approvalCode: true,
        version: true,
        status: true,
        isLatest: true,
        totalWithVat: true,
        approvalDate: true,
      },
      orderBy: { version: 'asc' },
    })

    // 최신 버전과 이전 버전 찾기
    const latestVersion = allVersions.find(v => v.isLatest) || allVersions[allVersions.length - 1]
    const previousVersion = allVersions.length > 1
      ? allVersions[allVersions.length - 2]
      : null

    if (!previousVersion) {
      // 이전 버전이 없으면 현재 버전만 반환
      const items = await prisma.salesApprovalItem.findMany({
        where: { approvalId: latestVersion.id },
        include: { details: { orderBy: { sortOrder: 'asc' } } },
        orderBy: { sortOrder: 'asc' },
      })

      const purchaseItems = await prisma.salesApprovalPurchaseItem.findMany({
        where: { approvalId: latestVersion.id },
        include: { details: { orderBy: { sortOrder: 'asc' } } },
        orderBy: { sortOrder: 'asc' },
      })

      return NextResponse.json({
        approvalCode: currentApproval.approvalCode,
        clientCompany: currentApproval.clientCompany,
        versions: allVersions,
        currentVersion: latestVersion,
        previousVersion: null,
        comparison: {
          sales: items.map(item => ({
            id: item.id,
            productName: item.productName,
            partNumber: item.partNumber,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            invoiceStatus: item.salesInvoiceStatus,
            changeType: 'unchanged' as const,
            current: item,
            previous: null,
          })),
          purchase: purchaseItems.map(item => ({
            id: item.id,
            productName: item.productName,
            partNumber: item.partNumber,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            vendorCompany: item.vendorCompany,
            invoiceStatus: item.purchaseInvoiceStatus,
            changeType: 'unchanged' as const,
            current: item,
            previous: null,
          })),
        },
      })
    }

    // 두 버전의 아이템 조회
    const [currentItems, previousItems, currentPurchaseItems, previousPurchaseItems] = await Promise.all([
      prisma.salesApprovalItem.findMany({
        where: { approvalId: latestVersion.id },
        include: { details: { orderBy: { sortOrder: 'asc' } } },
        orderBy: { sortOrder: 'asc' },
      }),
      prisma.salesApprovalItem.findMany({
        where: { approvalId: previousVersion.id },
        include: { details: { orderBy: { sortOrder: 'asc' } } },
        orderBy: { sortOrder: 'asc' },
      }),
      prisma.salesApprovalPurchaseItem.findMany({
        where: { approvalId: latestVersion.id },
        include: { details: { orderBy: { sortOrder: 'asc' } } },
        orderBy: { sortOrder: 'asc' },
      }),
      prisma.salesApprovalPurchaseItem.findMany({
        where: { approvalId: previousVersion.id },
        include: { details: { orderBy: { sortOrder: 'asc' } } },
        orderBy: { sortOrder: 'asc' },
      }),
    ])

    // 매출 아이템 비교
    const salesComparison = []
    const previousSalesMap = new Map(previousItems.map(i => [i.id, i]))
    const matchedPreviousIds = new Set<string>()

    for (const current of currentItems) {
      const previous = current.sourceItemId ? previousSalesMap.get(current.sourceItemId) : null

      if (previous) {
        matchedPreviousIds.add(previous.id)
        const isModified =
          current.quantity !== previous.quantity ||
          Number(current.unitPrice) !== Number(previous.unitPrice)

        salesComparison.push({
          id: current.id,
          productName: current.productName,
          partNumber: current.partNumber,
          quantity: current.quantity,
          unitPrice: current.unitPrice,
          totalPrice: current.totalPrice,
          invoiceStatus: current.salesInvoiceStatus,
          changeType: isModified ? 'modified' : 'unchanged',
          current: {
            quantity: current.quantity,
            unitPrice: current.unitPrice,
            totalPrice: current.totalPrice,
          },
          previous: {
            quantity: previous.quantity,
            unitPrice: previous.unitPrice,
            totalPrice: previous.totalPrice,
            invoiceStatus: previous.salesInvoiceStatus,
          },
        })
      } else {
        // 신규 아이템
        salesComparison.push({
          id: current.id,
          productName: current.productName,
          partNumber: current.partNumber,
          quantity: current.quantity,
          unitPrice: current.unitPrice,
          totalPrice: current.totalPrice,
          invoiceStatus: current.salesInvoiceStatus,
          changeType: 'added',
          current: {
            quantity: current.quantity,
            unitPrice: current.unitPrice,
            totalPrice: current.totalPrice,
          },
          previous: null,
        })
      }
    }

    // 삭제된 아이템 (이전 버전에 있고 현재 버전에 없는 것)
    for (const previous of previousItems) {
      if (!matchedPreviousIds.has(previous.id)) {
        salesComparison.push({
          id: previous.id,
          productName: previous.productName,
          partNumber: previous.partNumber,
          quantity: previous.quantity,
          unitPrice: previous.unitPrice,
          totalPrice: previous.totalPrice,
          invoiceStatus: previous.salesInvoiceStatus,
          changeType: 'deleted',
          current: null,
          previous: {
            quantity: previous.quantity,
            unitPrice: previous.unitPrice,
            totalPrice: previous.totalPrice,
            invoiceStatus: previous.salesInvoiceStatus,
          },
        })
      }
    }

    // 매입 아이템 비교
    const purchaseComparison = []
    const previousPurchaseMap = new Map(previousPurchaseItems.map(i => [i.id, i]))
    const matchedPreviousPurchaseIds = new Set<string>()

    for (const current of currentPurchaseItems) {
      const previous = current.sourceItemId ? previousPurchaseMap.get(current.sourceItemId) : null

      if (previous) {
        matchedPreviousPurchaseIds.add(previous.id)
        const isModified =
          current.quantity !== previous.quantity ||
          Number(current.unitPrice) !== Number(previous.unitPrice)

        purchaseComparison.push({
          id: current.id,
          productName: current.productName,
          partNumber: current.partNumber,
          quantity: current.quantity,
          unitPrice: current.unitPrice,
          totalPrice: current.totalPrice,
          vendorCompany: current.vendorCompany,
          invoiceStatus: current.purchaseInvoiceStatus,
          changeType: isModified ? 'modified' : 'unchanged',
          current: {
            quantity: current.quantity,
            unitPrice: current.unitPrice,
            totalPrice: current.totalPrice,
          },
          previous: {
            quantity: previous.quantity,
            unitPrice: previous.unitPrice,
            totalPrice: previous.totalPrice,
            invoiceStatus: previous.purchaseInvoiceStatus,
          },
        })
      } else {
        purchaseComparison.push({
          id: current.id,
          productName: current.productName,
          partNumber: current.partNumber,
          quantity: current.quantity,
          unitPrice: current.unitPrice,
          totalPrice: current.totalPrice,
          vendorCompany: current.vendorCompany,
          invoiceStatus: current.purchaseInvoiceStatus,
          changeType: 'added',
          current: {
            quantity: current.quantity,
            unitPrice: current.unitPrice,
            totalPrice: current.totalPrice,
          },
          previous: null,
        })
      }
    }

    for (const previous of previousPurchaseItems) {
      if (!matchedPreviousPurchaseIds.has(previous.id)) {
        purchaseComparison.push({
          id: previous.id,
          productName: previous.productName,
          partNumber: previous.partNumber,
          quantity: previous.quantity,
          unitPrice: previous.unitPrice,
          totalPrice: previous.totalPrice,
          vendorCompany: previous.vendorCompany,
          invoiceStatus: previous.purchaseInvoiceStatus,
          changeType: 'deleted',
          current: null,
          previous: {
            quantity: previous.quantity,
            unitPrice: previous.unitPrice,
            totalPrice: previous.totalPrice,
            invoiceStatus: previous.purchaseInvoiceStatus,
          },
        })
      }
    }

    return NextResponse.json({
      approvalCode: currentApproval.approvalCode,
      clientCompany: currentApproval.clientCompany,
      versions: allVersions,
      currentVersion: latestVersion,
      previousVersion,
      comparison: {
        sales: salesComparison,
        purchase: purchaseComparison,
      },
    })
  } catch (error) {
    console.error('버전 비교 오류:', error)
    return NextResponse.json(
      { error: '버전 비교에 실패했습니다' },
      { status: 500 }
    )
  }
}
