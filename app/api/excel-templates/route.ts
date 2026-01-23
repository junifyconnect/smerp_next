import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

// GET /api/excel-templates - 양식 목록 조회
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const docType = searchParams.get('docType')
    const activeOnly = searchParams.get('activeOnly') !== 'false'

    const where: { docType?: string; isActive?: boolean } = {}
    if (docType) where.docType = docType
    if (activeOnly) where.isActive = true

    const templates = await prisma.excelTemplate.findMany({
      where,
      orderBy: [
        { isDefault: 'desc' },
        { updatedAt: 'desc' },
      ],
      select: {
        id: true,
        name: true,
        docType: true,
        sampleFileName: true,
        itemTableHeaderRow: true,
        itemTableStartRow: true,
        isActive: true,
        isDefault: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json(templates)
  } catch (error) {
    console.error('양식 목록 조회 오류:', error)
    return NextResponse.json(
      { error: '양식 목록 조회에 실패했습니다' },
      { status: 500 }
    )
  }
}

// POST /api/excel-templates - 양식 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      name,
      docType,
      sampleFileName,
      sampleFilePath,
      fieldMappings,
      itemTableHeaderRow,
      itemTableStartRow,
      itemTableEndRow,
      salesColumnMappings,
      purchaseColumnMappings,
      mainItemDetection,
      subItemDetection,
      totalRowDetection,
      analyzedData,
      isDefault,
    } = body

    if (!name || !docType) {
      return NextResponse.json(
        { error: '양식명과 문서 타입은 필수입니다' },
        { status: 400 }
      )
    }

    // isDefault가 true이면 기존 기본 양식 해제
    if (isDefault) {
      await prisma.excelTemplate.updateMany({
        where: { docType, isDefault: true },
        data: { isDefault: false },
      })
    }

    const template = await prisma.excelTemplate.create({
      data: {
        name,
        docType,
        sampleFileName,
        sampleFilePath,
        fieldMappings: fieldMappings || {},
        itemTableHeaderRow: itemTableHeaderRow || 16,
        itemTableStartRow: itemTableStartRow || 17,
        itemTableEndRow,
        salesColumnMappings: salesColumnMappings || {},
        purchaseColumnMappings: purchaseColumnMappings || {},
        mainItemDetection,
        subItemDetection,
        totalRowDetection,
        analyzedData,
        isDefault: isDefault || false,
      },
    })

    return NextResponse.json(template, { status: 201 })
  } catch (error) {
    console.error('양식 생성 오류:', error)
    return NextResponse.json(
      { error: '양식 생성에 실패했습니다' },
      { status: 500 }
    )
  }
}
