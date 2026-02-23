import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"
import { auth } from "@/lib/auth"

// 발주서 목록 조회
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    const currentUserId = session?.user?.id

    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const status = searchParams.get("status")
    const search = searchParams.get("search")
    const includeAllVersions = searchParams.get("allVersions") === "true"

    const where: Record<string, unknown> = {}

    // 기본적으로 최신 버전만 조회
    if (!includeAllVersions) {
      where.isLatest = { not: false }
    }

    // DRAFT는 작성자 본인만, 나머지는 모두 볼 수 있음
    if (status === "DRAFT") {
      where.status = "DRAFT"
      if (currentUserId) {
        where.createdById = currentUserId
      }
    } else if (status) {
      where.status = status
    } else {
      // 전체 조회: DRAFT가 아니거나, DRAFT면서 본인 것
      where.OR = [
        { status: { not: "DRAFT" } },
        ...(currentUserId ? [{ status: "DRAFT", createdById: currentUserId }] : []),
      ]
    }

    if (search) {
      where.AND = [
        {
          OR: [
            { orderNumber: { contains: search, mode: "insensitive" } },
            { vendorCompany: { contains: search, mode: "insensitive" } },
            { managerName: { contains: search, mode: "insensitive" } },
          ],
        },
      ]
    }

    const [orders, total] = await Promise.all([
      prisma.salesOrder.findMany({
        where,
        include: {
          items: true,
          createdBy: {
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
    const session = await auth()
    const currentUserId = session?.user?.id

    const body = await request.json()
    const {
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
        createdById: currentUserId || "system",
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
        createdBy: { select: { id: true, name: true } },
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
