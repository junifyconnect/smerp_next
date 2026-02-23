import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/sales-approvals/[id]/compare - 버전별 비교
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const currentApproval = await prisma.salesApproval.findUnique({
      where: { id },
      select: {
        id: true,
        approvalCode: true,
        version: true,
        originalId: true,
        status: true,
        clientCompany: true,
      },
    })

    if (!currentApproval) {
      return NextResponse.json({ error: '품의서를 찾을 수 없습니다' }, { status: 404 })
    }

    const chainRootId = currentApproval.originalId || currentApproval.id

    const allVersions = await prisma.salesApproval.findMany({
      where: {
        OR: [{ id: chainRootId }, { originalId: chainRootId }],
      },
      select: {
        id: true,
        approvalCode: true,
        version: true,
        status: true,
        isLatest: true,
      },
      orderBy: { version: 'asc' },
    })

    const latestVersion = allVersions.find(v => v.isLatest) || allVersions[allVersions.length - 1]
    const previousVersion = allVersions.length > 1 ? allVersions[allVersions.length - 2] : null

    // 최신 버전의 제품+품목 조회
    const currentProducts = await prisma.salesApprovalProduct.findMany({
      where: { approvalId: latestVersion.id },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { sortOrder: 'asc' },
    })

    if (!previousVersion) {
      return NextResponse.json({
        approvalCode: currentApproval.approvalCode,
        clientCompany: currentApproval.clientCompany,
        versions: allVersions,
        currentVersion: latestVersion,
        previousVersion: null,
        comparison: {
          products: currentProducts.map(p => ({
            id: p.id,
            name: p.name,
            quantity: p.quantity,
            unitPrice: p.unitPrice,
            totalPrice: p.totalPrice,
            salesInvoiceStatus: p.salesInvoiceStatus,
            changeType: 'unchanged' as const,
            items: p.items.map(item => ({
              id: item.id,
              partNumber: item.partNumber,
              description: item.description,
              vendorName: item.vendorName,
              purchasePrice: item.purchasePrice,
              purchaseTotal: item.purchaseTotal,
              purchaseInvoiceStatus: item.purchaseInvoiceStatus,
              changeType: 'unchanged' as const,
            })),
          })),
        },
      })
    }

    // 이전 버전의 제품+품목 조회
    const previousProducts = await prisma.salesApprovalProduct.findMany({
      where: { approvalId: previousVersion.id },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { sortOrder: 'asc' },
    })

    // Product 비교 (sourceProductId 기반)
    const prevProductMap = new Map(previousProducts.map(p => [p.id, p]))
    const matchedPrevProductIds = new Set<string>()

    const productComparison = []

    for (const current of currentProducts) {
      const previous = current.sourceProductId ? prevProductMap.get(current.sourceProductId) : null

      if (previous) {
        matchedPrevProductIds.add(previous.id)
        const isModified =
          current.quantity !== previous.quantity ||
          Number(current.unitPrice) !== Number(previous.unitPrice)

        // Item 비교
        const prevItemMap = new Map(previous.items.map(i => [i.id, i]))
        const matchedPrevItemIds = new Set<string>()

        const itemComparison = []
        for (const curItem of current.items) {
          const prevItem = curItem.sourceItemId ? prevItemMap.get(curItem.sourceItemId) : null
          if (prevItem) {
            matchedPrevItemIds.add(prevItem.id)
            const itemModified =
              curItem.quantity !== prevItem.quantity ||
              Number(curItem.purchasePrice) !== Number(prevItem.purchasePrice)
            itemComparison.push({
              ...curItem,
              changeType: itemModified ? 'modified' : 'unchanged',
              previous: prevItem,
            })
          } else {
            itemComparison.push({ ...curItem, changeType: 'added', previous: null })
          }
        }
        // 삭제된 items
        for (const prevItem of previous.items) {
          if (!matchedPrevItemIds.has(prevItem.id)) {
            itemComparison.push({ ...prevItem, changeType: 'deleted', previous: prevItem })
          }
        }

        productComparison.push({
          id: current.id,
          name: current.name,
          quantity: current.quantity,
          unitPrice: current.unitPrice,
          totalPrice: current.totalPrice,
          salesInvoiceStatus: current.salesInvoiceStatus,
          changeType: isModified ? 'modified' : 'unchanged',
          previous: { quantity: previous.quantity, unitPrice: previous.unitPrice, totalPrice: previous.totalPrice },
          items: itemComparison,
        })
      } else {
        productComparison.push({
          id: current.id,
          name: current.name,
          quantity: current.quantity,
          unitPrice: current.unitPrice,
          totalPrice: current.totalPrice,
          salesInvoiceStatus: current.salesInvoiceStatus,
          changeType: 'added',
          previous: null,
          items: current.items.map(item => ({ ...item, changeType: 'added', previous: null })),
        })
      }
    }

    // 삭제된 products
    for (const prev of previousProducts) {
      if (!matchedPrevProductIds.has(prev.id)) {
        productComparison.push({
          id: prev.id,
          name: prev.name,
          quantity: prev.quantity,
          unitPrice: prev.unitPrice,
          totalPrice: prev.totalPrice,
          salesInvoiceStatus: prev.salesInvoiceStatus,
          changeType: 'deleted',
          previous: { quantity: prev.quantity, unitPrice: prev.unitPrice, totalPrice: prev.totalPrice },
          items: prev.items.map(item => ({ ...item, changeType: 'deleted', previous: item })),
        })
      }
    }

    return NextResponse.json({
      approvalCode: currentApproval.approvalCode,
      clientCompany: currentApproval.clientCompany,
      versions: allVersions,
      currentVersion: latestVersion,
      previousVersion,
      comparison: { products: productComparison },
    })
  } catch (error) {
    console.error('버전 비교 오류:', error)
    return NextResponse.json({ error: '버전 비교에 실패했습니다' }, { status: 500 })
  }
}
