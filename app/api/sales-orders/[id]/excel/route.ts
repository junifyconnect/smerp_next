import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { generateSalesOrder, DocumentData } from '@/lib/excel/generator'

// GET /api/sales-orders/[id]/excel - 발주서 엑셀 다운로드
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const order = await prisma.salesOrder.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    })

    if (!order) {
      return NextResponse.json(
        { error: '발주서를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    // 엑셀 생성에 필요한 데이터 구성
    const data: DocumentData = {
      docNumber: order.orderNumber,
      vendorCompany: order.vendorCompany || undefined,
      vendorContact: order.vendorContact || undefined,
      vendorPhone: order.vendorPhone || undefined,
      vendorEmail: order.vendorEmail || undefined,
      quoteDate: order.orderDate || undefined,
      deliveryAddress: order.deliveryAddress || undefined,
      managerName: order.managerName || undefined,
      managerPhone: order.managerPhone || undefined,
      paymentTerms: order.paymentTerms || undefined,
      notes: order.notes || undefined,
      items: order.items.map((item) => ({
        partNumber: item.partNumber || undefined,
        description: item.description || undefined,
        quantity: item.quantity,
        srpPrice: item.srpPrice ? Number(item.srpPrice) : undefined,
        unitPrice: item.unitPrice ? Number(item.unitPrice) : undefined,
        totalPrice: item.totalPrice ? Number(item.totalPrice) : undefined,
      })),
      totalAmount: Number(order.totalAmount),
      vatAmount: Number(order.vatAmount),
      totalWithVat: Number(order.totalWithVat),
    }

    const buffer = await generateSalesOrder(data)

    // 파일명 설정
    const filename = `${order.orderNumber}.xlsx`
    const encodedFilename = encodeURIComponent(filename)

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`,
      },
    })
  } catch (error) {
    console.error('엑셀 다운로드 오류:', error)
    return NextResponse.json(
      { error: '엑셀 다운로드에 실패했습니다' },
      { status: 500 }
    )
  }
}
