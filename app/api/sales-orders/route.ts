import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"

// 발주서 목록 조회
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const status = searchParams.get("status")
    const search = searchParams.get("search")

    const where: Record<string, unknown> = {}

    if (status) {
      where.status = status
    }

    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: "insensitive" } },
        { vendorCompany: { contains: search, mode: "insensitive" } },
        { managerName: { contains: search, mode: "insensitive" } },
      ]
    }

    const [orders, total] = await Promise.all([
      prisma.salesOrder.findMany({
        where,
        include: {
          items: true,
          deal: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.salesOrder.count({ where }),
    ])

    return NextResponse.json({
      data: orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("발주서 목록 조회 오류:", error)
    return NextResponse.json(
      { error: "발주서 목록을 불러오는데 실패했습니다" },
      { status: 500 }
    )
  }
}

// 발주서 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      dealId,
      orderDate,
      managerName,
      deliveryAddress,
      paymentTerms,
      vendorCompany,
      vendorContact,
      vendorPhone,
      vendorEmail,
      notes,
      items = [],
    } = body

    // 발주서 번호 생성 (SO-YYYY-NNNN)
    const year = new Date().getFullYear()
    const lastOrder = await prisma.salesOrder.findFirst({
      where: {
        orderNumber: { startsWith: `SO-${year}-` },
      },
      orderBy: { orderNumber: "desc" },
    })

    let nextNumber = 1
    if (lastOrder) {
      const lastNumber = parseInt(lastOrder.orderNumber.split("-")[2])
      nextNumber = lastNumber + 1
    }
    const orderNumber = `SO-${year}-${String(nextNumber).padStart(4, "0")}`

    // 금액 계산
    const totalAmount = items.reduce((sum: number, item: { quantity?: number; unitPrice?: number }) => {
      return sum + (item.quantity || 1) * (item.unitPrice || 0)
    }, 0)
    const vatAmount = Math.round(totalAmount * 0.1)
    const totalWithVat = totalAmount + vatAmount

    const order = await prisma.salesOrder.create({
      data: {
        orderNumber,
        dealId: dealId || undefined,
        orderDate: orderDate ? new Date(orderDate) : new Date(),
        managerName,
        deliveryAddress,
        paymentTerms,
        vendorCompany,
        vendorContact,
        vendorPhone,
        vendorEmail,
        totalAmount,
        vatAmount,
        totalWithVat,
        notes,
        createdById: "system", // TODO: 실제 사용자 ID로 변경
        items: {
          create: items.map((item: {
            partNumber?: string
            description?: string
            quantity?: number
            srpPrice?: number
            unitPrice?: number
          }, index: number) => ({
            sortOrder: index,
            partNumber: item.partNumber,
            description: item.description,
            quantity: item.quantity || 1,
            srpPrice: item.srpPrice || 0,
            unitPrice: item.unitPrice || 0,
            totalPrice: (item.quantity || 1) * (item.unitPrice || 0),
          })),
        },
      },
      include: {
        items: true,
      },
    })

    return NextResponse.json(order, { status: 201 })
  } catch (error) {
    console.error("발주서 생성 오류:", error)
    return NextResponse.json(
      { error: "발주서 생성에 실패했습니다" },
      { status: 500 }
    )
  }
}
