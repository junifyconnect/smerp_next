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
        items: { orderBy: { sortOrder: 'asc' } },
        purchaseItems: { orderBy: { sortOrder: 'asc' } },
      },
    })

    if (!approval) {
      return NextResponse.json(
        { error: '품의서를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    // DocumentData 형식으로 변환
    const purchaseItems: PurchaseItem[] = approval.purchaseItems.map((item) => ({
      partNumber: item.partNumber || undefined,
      description: item.description || undefined,
      quantity: item.quantity,
      unitPrice: item.unitPrice ? Number(item.unitPrice) : undefined,
      totalPrice: item.totalPrice ? Number(item.totalPrice) : undefined,
      purchaseDate: item.purchaseDate || undefined,
      vendorCompany: item.vendorCompany || undefined,
    }))

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
      items: approval.items.map((item) => ({
        partNumber: item.partNumber || undefined,
        description: item.description || undefined,
        quantity: item.quantity,
        unitPrice: item.unitPrice ? Number(item.unitPrice) : undefined,
        totalPrice: item.totalPrice ? Number(item.totalPrice) : undefined,
      })),
      purchaseItems,
      totalAmount: approval.totalAmount ? Number(approval.totalAmount) : undefined,
      vatAmount: approval.vatAmount ? Number(approval.vatAmount) : undefined,
      totalWithVat: approval.totalWithVat ? Number(approval.totalWithVat) : undefined,
      purchaseTotal: approval.purchaseTotal ? Number(approval.purchaseTotal) : undefined,
    }

    const buffer = await generateSalesApproval(data)

    // 파일명 생성
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
    return NextResponse.json(
      { error: '엑셀 파일 생성에 실패했습니다' },
      { status: 500 }
    )
  }
}
