import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { auth } from '@/lib/auth'

// GET /api/sales-approvals - 목록 조회
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    const currentUserId = session?.user?.id

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const includeAllVersions = searchParams.get('allVersions') === 'true'

    // DRAFT는 작성자 본인만, 나머지는 모두 볼 수 있음
    // status 필터가 DRAFT면 본인 것만, 아니면 DRAFT 제외 + 해당 status
    const where: Record<string, unknown> = {}

    // 기본적으로 최신 버전만 조회 (allVersions=true면 모든 버전)
    // isLatest가 true이거나 null(기존 데이터)인 경우 조회, false만 제외
    if (!includeAllVersions) {
      where.isLatest = { not: false }
    }

    if (status === 'DRAFT') {
      // DRAFT 조회 시 본인 것만
      where.status = 'DRAFT'
      if (currentUserId) {
        where.createdById = currentUserId
      }
    } else if (status) {
      // 특정 상태 조회 (DRAFT가 아닌 상태)
      where.status = status
    } else {
      // 전체 조회: DRAFT가 아니거나, DRAFT면서 본인 것
      where.OR = [
        { status: { not: 'DRAFT' } },
        ...(currentUserId ? [{ status: 'DRAFT', createdById: currentUserId }] : []),
      ]
    }

    if (search) {
      // 검색어가 있으면 AND 조건으로 추가
      where.AND = [
        {
          OR: [
            { approvalNumber: { contains: search, mode: 'insensitive' } },
            { approvalCode: { contains: search, mode: 'insensitive' } },
            { clientCompany: { contains: search, mode: 'insensitive' } },
          ],
        },
      ]
    }

    const [items, total] = await Promise.all([
      prisma.salesApproval.findMany({
        where,
        include: {
          _count: { select: { items: true, purchaseItems: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.salesApproval.count({ where }),
    ])

    return NextResponse.json({
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('품의서 목록 조회 오류:', error)
    return NextResponse.json(
      { error: '목록을 불러오는데 실패했습니다' },
      { status: 500 }
    )
  }
}

// POST /api/sales-approvals - 생성
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    const body = await request.json()
    const {
      dealId,
      quoteId, // 견적서에서 품의서 생성 시
      approvalCode,
      approvalDate,
      managerName,
      clientCompany,
      clientContact,
      clientPhone,
      endUser,
      paymentTerms,
      deliveryAddress,
      deliveryDate,
      invoiceEmail,
      receiverName,
      receiverPhone,
      notes,
      // 기존 구조 (하위 호환)
      items = [],
      purchaseItems = [],
      // 새 구조
      isConsolidatedSales = false,
      consolidatedSalesName,
      consolidatedSalesPrice,
      salesItems = [],
      purchaseGroups = [],
      // 최신 구조: 제품(매출) + 품목(매입) 분리
      products = [],
      standaloneItems = [],
    } = body

    // 견적서에서 생성하는 경우, 견적서 데이터 가져오기
    let quoteData = null
    if (quoteId) {
      quoteData = await prisma.salesQuote.findUnique({
        where: { id: quoteId },
        include: { items: { orderBy: { sortOrder: 'asc' } } },
      })
    }

    // 인증된 사용자 ID 사용
    const createdById = session?.user?.id || 'dummy-user-id'
    // 이메일에서 사용자 ID 추출 (@ 앞부분)
    const userEmail = session?.user?.email || ''
    const userId = userEmail.split('@')[0] || ''

    // 품의번호 생성 (SA-YYYY-NNNN) - 시스템 내부 고유키
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
    const approvalNumber = `SA-${year}-${sequence.toString().padStart(4, '0')}`

    // 품의코드 자동생성 (사용자ID첫글자 + YYMMDD + -순번)
    // 예: h260115-01 (hmlee@servermate.net이 2026년 1월 15일 첫 번째 품의서)
    let finalApprovalCode = approvalCode

    // 사용자가 직접 입력한 품의코드가 있으면 중복 검증
    if (finalApprovalCode) {
      const existingApproval = await prisma.salesApproval.findFirst({
        where: { approvalCode: finalApprovalCode },
      })
      if (existingApproval) {
        return NextResponse.json(
          { error: `품의코드 '${finalApprovalCode}'가 이미 존재합니다` },
          { status: 400 }
        )
      }
    }

    // 품의코드가 없으면 자동 생성
    if (!finalApprovalCode && userId) {
      const today = new Date()
      const yy = String(today.getFullYear()).slice(-2)
      const mm = String(today.getMonth() + 1).padStart(2, '0')
      const dd = String(today.getDate()).padStart(2, '0')
      const dateStr = `${yy}${mm}${dd}`
      const initial = userId.charAt(0).toUpperCase()

      // 해당 날짜 + 이니셜로 시작하는 품의코드 중 마지막 순번 조회
      const prefix = `${initial}${dateStr}-`
      const lastCodeApproval = await prisma.salesApproval.findFirst({
        where: { approvalCode: { startsWith: prefix } },
        orderBy: { approvalCode: 'desc' },
      })

      let codeSequence = 1
      if (lastCodeApproval?.approvalCode) {
        const lastSeq = parseInt(lastCodeApproval.approvalCode.split('-')[1])
        if (!isNaN(lastSeq)) {
          codeSequence = lastSeq + 1
        }
      }
      finalApprovalCode = `${prefix}${String(codeSequence).padStart(2, '0')}`
    }

    // 견적서에서 생성하는 경우 데이터 초기화
    const finalClientCompany = clientCompany || quoteData?.clientCompany
    const finalClientContact = clientContact || quoteData?.clientContact
    const finalClientPhone = clientPhone || quoteData?.clientPhone
    const finalManagerName = managerName || quoteData?.managerName
    const finalPaymentTerms = paymentTerms || quoteData?.paymentTerms
    const finalDealId = dealId || quoteData?.dealId
    // 매출 품목 결정: 최신 구조(products + standaloneItems) > 새 구조(salesItems) > 기존 구조(items) > 견적서 데이터
    let finalSalesItems: { partNumber?: string; productName?: string; quantity?: number; unitPrice?: number; details?: { partNumber?: string; description?: string; quantity?: number; sortOrder?: number }[]; sortOrder?: number }[] = []
    // 매입 품목도 함께 수집 (최신 구조에서)
    let newPurchaseItems: { productName?: string; partNumber?: string; description?: string; quantity?: number; unitPrice?: number; vendorCompany?: string; sortOrder?: number }[] = []

    if (products.length > 0 || standaloneItems.length > 0) {
      // 최신 구조: 제품(매출) + 품목(매입) 분리
      let salesIndex = 0
      let purchaseIndex = 0

      // 제품에서 매출 품목 생성
      for (const product of products) {
        if (product.name || product.salesUnitPrice > 0) {
          // 제품 → 매출 품목
          const productDetails = (product.items || []).map((item: { partNumber?: string; description?: string; quantity?: number }, dIdx: number) => ({
            partNumber: item.partNumber,
            description: item.description,
            quantity: item.quantity,
            sortOrder: dIdx,
          }))
          finalSalesItems.push({
            productName: product.name || '제품',
            quantity: product.quantity || 1,
            unitPrice: product.salesUnitPrice || 0,
            sortOrder: salesIndex++,
            details: productDetails,
          })

          // 제품 레벨 매입 정보가 있으면 제품 자체를 매입 품목으로 추가 (일괄 매입)
          if (product.purchaseUnitPrice > 0 || product.vendorCompany) {
            newPurchaseItems.push({
              productName: product.name || '제품',
              partNumber: '',
              description: `${product.name || '제품'} 일괄 매입`,
              quantity: product.quantity || 1,
              unitPrice: product.purchaseUnitPrice || 0,
              vendorCompany: product.vendorCompany || '',
              sortOrder: purchaseIndex++,
            })
          }

          // 제품 소속 품목들 → 매입 품목 (품목별 개별 매입)
          // 매입 정보가 있는 품목만 매입 품목으로 생성 (통합 매입 시에는 품목에 매입 정보가 없음)
          for (const item of (product.items || [])) {
            if (item.purchaseUnitPrice > 0 || item.vendorCompany) {
              newPurchaseItems.push({
                productName: item.description || item.partNumber || '품목', // 개별 품목명 사용
                partNumber: item.partNumber,
                description: item.description,
                quantity: item.quantity || 1,
                unitPrice: item.purchaseUnitPrice || 0,
                vendorCompany: item.vendorCompany || '',
                sortOrder: purchaseIndex++,
              })
            }
          }
        }
      }

      // 독립 품목에서 매출 + 매입 품목 생성
      for (const item of standaloneItems) {
        if (item.partNumber || item.description || item.salesUnitPrice > 0 || item.purchaseUnitPrice > 0) {
          // 독립 품목 → 매출 품목
          finalSalesItems.push({
            productName: item.description || item.partNumber || '품목',
            quantity: item.quantity || 1,
            unitPrice: item.salesUnitPrice || 0,
            sortOrder: salesIndex++,
            details: item.partNumber ? [{ partNumber: item.partNumber, sortOrder: 0 }] : [],
          })

          // 독립 품목 → 매입 품목
          if (item.purchaseUnitPrice > 0 || item.vendorCompany) {
            newPurchaseItems.push({
              productName: item.description || item.partNumber || '품목',
              partNumber: item.partNumber,
              description: item.description,
              quantity: item.quantity || 1,
              unitPrice: item.purchaseUnitPrice || 0,
              vendorCompany: item.vendorCompany || '',
              sortOrder: purchaseIndex++,
            })
          }
        }
      }
    } else if (salesItems.length > 0) {
      // 새 UI에서 전송된 매출 품목
      finalSalesItems = salesItems.map((item: { partNumber?: string; productName?: string; quantity?: number; unitPrice?: number }, index: number) => ({
        productName: item.productName || '제품',
        quantity: item.quantity || 1,
        unitPrice: item.unitPrice || 0,
        sortOrder: index,
        details: item.partNumber ? [{ partNumber: item.partNumber, sortOrder: 0 }] : [],
      }))
    } else if (items.length > 0) {
      // 기존 UI에서 전송된 데이터
      finalSalesItems = items
    } else if (quoteData?.items) {
      // 견적서에서 가져온 데이터
      finalSalesItems = quoteData.items.map((item: { partNumber: string | null; description: string | null; quantity: number; unitPrice: unknown; totalPrice: unknown; sortOrder: number }) => ({
        productName: item.partNumber || '제품',
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice) || 0,
        sortOrder: item.sortOrder,
        details: item.description ? [{ description: item.description, sortOrder: 0 }] : [],
      }))
    }

    // 매출 금액 계산
    let totalAmount = 0

    // 통합 매출인 경우
    if (isConsolidatedSales && consolidatedSalesPrice) {
      totalAmount = consolidatedSalesPrice
    }

    const itemsWithTotal = finalSalesItems.map((item, index: number) => {
      const qty = item.quantity || 1
      const price = item.unitPrice || 0
      // 통합 매출이 아닐 때만 개별 금액 계산
      const itemTotal = isConsolidatedSales ? 0 : qty * price
      if (!isConsolidatedSales) {
        totalAmount += itemTotal
      }
      const details = item.details || []
      return {
                productName: isConsolidatedSales && index === 0 && consolidatedSalesName
          ? consolidatedSalesName
          : (item.productName || '제품'),
        sortOrder: item.sortOrder ?? index,
        quantity: qty,
        unitPrice: isConsolidatedSales && index === 0 ? consolidatedSalesPrice : price,
        totalPrice: isConsolidatedSales && index === 0 ? consolidatedSalesPrice : itemTotal,
        // 통합 여부: 통합 매출이고 첫 번째 아이템이거나, 디테일이 여러 개인 경우
        isConsolidated: (isConsolidatedSales && index === 0) || details.length > 1,
        // P/N: 개별인 경우 디테일에서 가져옴
        partNumber: !isConsolidatedSales && details.length === 1 ? details[0]?.partNumber : null,
        details: {
          create: details.map((detail, detailIndex) => ({
            partNumber: detail.partNumber,
            description: detail.description,
            quantity: detail.quantity,
            sortOrder: detail.sortOrder ?? detailIndex,
          })),
        },
      }
    })

    const vatAmount = Math.round(totalAmount * 0.1)
    const totalWithVat = totalAmount + vatAmount

    // 매입 품목 처리: 최신 구조(newPurchaseItems) > 새 구조(purchaseGroups) > 기존 구조(purchaseItems)
    let finalPurchaseItems: { productName?: string; quantity?: number; unitPrice?: number; vendorCompany?: string; purchaseDate?: string; details?: { partNumber?: string; description?: string; quantity?: number; sortOrder?: number }[]; sortOrder?: number }[] = []

    if (newPurchaseItems.length > 0) {
      // 최신 구조: 제품의 품목들 + 독립 품목에서 수집된 매입 정보
      finalPurchaseItems = newPurchaseItems.map((item, index) => ({
        productName: item.productName || '제품',
        quantity: item.quantity || 1,
        unitPrice: item.unitPrice || 0,
        vendorCompany: item.vendorCompany,
        sortOrder: item.sortOrder ?? index,
        details: item.partNumber || item.description ? [{
          partNumber: item.partNumber,
          description: item.description,
          sortOrder: 0,
        }] : [],
      }))
    } else if (purchaseGroups.length > 0) {
      // 새 UI에서 전송된 매입 그룹 데이터를 purchaseItems로 변환
      let sortIndex = 0
      for (const group of purchaseGroups) {
        if (group.isConsolidated) {
          // 일괄 매입: 하나의 품목으로 변환
          finalPurchaseItems.push({
            productName: group.vendorName ? `${group.vendorName} 일괄` : '일괄 매입',
            quantity: 1,
            unitPrice: group.consolidatedAmount || 0,
            vendorCompany: group.vendorName,
            sortOrder: sortIndex++,
            details: [],
          })
        } else {
          // 개별 품목: 각 품목을 별도로 추가
          for (const item of group.items || []) {
            if (item.productName || item.partNumber || item.unitPrice > 0) {
              finalPurchaseItems.push({
                productName: item.productName || '제품',
                quantity: item.quantity || 1,
                unitPrice: item.unitPrice || 0,
                vendorCompany: group.vendorName,
                sortOrder: sortIndex++,
                details: item.partNumber ? [{ partNumber: item.partNumber, sortOrder: 0 }] : [],
              })
            }
          }
        }
      }
    } else if (purchaseItems.length > 0) {
      // 기존 UI에서 전송된 데이터
      finalPurchaseItems = purchaseItems
    }

    // 매입 금액 계산
    let purchaseTotal = 0
    const purchaseItemsWithTotal = finalPurchaseItems.map((item, index: number) => {
      const qty = item.quantity || 1
      const price = item.unitPrice || 0
      const itemTotal = qty * price
      purchaseTotal += itemTotal
      const details = item.details || []
      // 디테일이 없거나 productName에 '일괄'이 포함되어 있으면 통합으로 간주
      const isConsolidated = details.length === 0 || (item.productName || '').includes('일괄')
      return {
                productName: item.productName || '제품',
        sortOrder: item.sortOrder ?? index,
        quantity: qty,
        unitPrice: price,
        totalPrice: itemTotal,
        purchaseDate: item.purchaseDate ? new Date(item.purchaseDate) : null,
        vendorCompany: item.vendorCompany,
        // 통합 여부
        isConsolidated,
        // P/N: 개별인 경우 디테일에서 가져옴
        partNumber: !isConsolidated && details.length === 1 ? details[0]?.partNumber : null,
        details: {
          create: details.map((detail, detailIndex) => ({
            partNumber: detail.partNumber,
            description: detail.description,
            quantity: detail.quantity,
            sortOrder: detail.sortOrder ?? detailIndex,
          })),
        },
      }
    })

    const purchaseTotalWithVat = purchaseTotal + Math.round(purchaseTotal * 0.1)

    // 매입처 자동 등록 (고유한 매입처명만)
    const uniqueVendors = [...new Set(
      purchaseItemsWithTotal
        .map(item => item.vendorCompany?.trim())
        .filter((v): v is string => !!v)
    )]

    for (const vendorName of uniqueVendors) {
      try {
        await prisma.vendor.upsert({
          where: { name: vendorName },
          update: { usageCount: { increment: 1 } },
          create: { name: vendorName, usageCount: 1 },
        })
      } catch (vendorError) {
        // 매입처 등록 실패해도 품의서 생성은 계속 진행
        console.error('매입처 자동등록 오류:', vendorError)
      }
    }

    const approval = await prisma.salesApproval.create({
      data: {
        approvalNumber,
        ...(finalDealId && { deal: { connect: { id: finalDealId } } }),
        approvalCode: finalApprovalCode,
        approvalDate: approvalDate ? new Date(approvalDate) : null,
        managerName: finalManagerName,
        clientCompany: finalClientCompany,
        clientContact: finalClientContact,
        clientPhone: finalClientPhone,
        endUser,
        paymentTerms: finalPaymentTerms,
        deliveryAddress,
        deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
        invoiceEmail,
        receiverName,
        receiverPhone,
        notes,
        totalAmount,
        vatAmount,
        totalWithVat,
        purchaseTotal,
        purchaseTotalWithVat,
        createdById,
        items: {
          create: itemsWithTotal,
        },
        purchaseItems: {
          create: purchaseItemsWithTotal,
        },
      },
      include: {
        items: {
          include: { details: { orderBy: { sortOrder: 'asc' } } },
          orderBy: { sortOrder: 'asc' },
        },
        purchaseItems: {
          include: { details: { orderBy: { sortOrder: 'asc' } } },
          orderBy: { sortOrder: 'asc' },
        },
        deal: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json(approval, { status: 201 })
  } catch (error) {
    console.error('품의서 생성 오류:', error)
    return NextResponse.json(
      { error: '품의서 생성에 실패했습니다' },
      { status: 500 }
    )
  }
}
