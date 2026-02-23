import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { generateSalesApproval, DocumentData, PurchaseItem } from '@/lib/excel/generator'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/sales-approvals/[id]/excel - 엑셀 다운로드
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const approval = await prisma.salesApproval.findUnique({
      where: { id },
      include: {
        products: {
          include: { items: { orderBy: { sortOrder: 'asc' } } },
          orderBy: { sortOrder: 'asc' },
        },
        salesManager: { select: { name: true, signatureUrl: true } },
        teamLeader: { select: { name: true, signatureUrl: true } },
        ceo: { select: { name: true, signatureUrl: true } },
      },
    })

    if (!approval) {
      return NextResponse.json({ error: '품의서를 찾을 수 없습니다' }, { status: 404 })
    }

    // Products → flat items for excel (매출 쪽)
    const salesItems = approval.products.map((product) => ({
      partNumber: product.name || undefined,
      description: product.items.map(i =>
        `${i.partNumber ? `[${i.partNumber}] ` : ''}${i.description || ''}`
      ).join('\n') || undefined,
      quantity: product.quantity,
      unitPrice: product.unitPrice ? Number(product.unitPrice) : undefined,
      totalPrice: product.totalPrice ? Number(product.totalPrice) : undefined,
    }))

    // Items → flat purchase items (매입 쪽)
    const purchaseItems: PurchaseItem[] = approval.products.flatMap((product) =>
      product.items
        .filter(item => item.vendorName || item.purchasePrice)
        .map(item => ({
          partNumber: item.partNumber || undefined,
          description: item.description || undefined,
          quantity: item.purchaseQty,
          unitPrice: item.purchasePrice ? Number(item.purchasePrice) : undefined,
          totalPrice: item.purchaseTotal ? Number(item.purchaseTotal) : undefined,
          purchaseDate: item.purchaseDate || undefined,
          vendorCompany: item.vendorName || undefined,
        }))
    )

    const data: DocumentData = {
      docNumber: approval.approvalNumber,
      approvalCode: approval.approvalCode || undefined,
      clientCompany: approval.clientCompany || undefined,
      clientContact: approval.clientContact || undefined,
      clientPhone: approval.clientPhone || undefined,
      endUser: approval.endUser || undefined,
      quoteDate: approval.approvalDate || undefined,
      deliveryDate: approval.deliveryDate || undefined,
      paymentTerms: approval.paymentTerms || undefined,
      invoiceEmail: approval.invoiceEmail || undefined,
      deliveryAddress: approval.deliveryAddress || undefined,
      receiverName: approval.receiverName || undefined,
      receiverPhone: approval.receiverPhone || undefined,
      notes: approval.notes || undefined,
      managerName: approval.managerName || undefined,
      items: salesItems,
      purchaseItems,
      totalAmount: approval.totalSalesAmount ? Number(approval.totalSalesAmount) : undefined,
      purchaseTotal: approval.totalPurchaseAmount ? Number(approval.totalPurchaseAmount) : undefined,
      signatures: {
        salesManager: approval.salesManager ? {
          name: approval.salesManager.name,
          signatureUrl: approval.salesManager.signatureUrl || undefined,
          signedAt: approval.salesManagerSignedAt || undefined,
        } : undefined,
        teamLeader: approval.teamLeader ? {
          name: approval.teamLeader.name,
          signatureUrl: approval.teamLeader.signatureUrl || undefined,
          signedAt: approval.teamLeaderSignedAt || undefined,
        } : undefined,
        ceo: approval.ceo ? {
          name: approval.ceo.name,
          signatureUrl: approval.ceo.signatureUrl || undefined,
          signedAt: approval.ceoSignedAt || undefined,
        } : undefined,
      },
    }

    const buffer = await generateSalesApproval(data)

    const dateStr = approval.approvalDate
      ? approval.approvalDate.toISOString().split('T')[0].replace(/-/g, '.')
      : new Date().toISOString().split('T')[0].replace(/-/g, '.')
    const clientName = approval.clientCompany || '고객사'
    const approvalCode = approval.approvalCode || approval.approvalNumber
    const fileName = encodeURIComponent(`${dateStr}_(${approvalCode})_(${clientName})_품의서.xlsx`)

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    })
  } catch (error) {
    console.error('품의서 엑셀 다운로드 오류:', error)
    return NextResponse.json({ error: '엑셀 파일 생성에 실패했습니다' }, { status: 500 })
  }
}
