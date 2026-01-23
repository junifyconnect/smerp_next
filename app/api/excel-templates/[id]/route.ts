import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

// GET /api/excel-templates/[id] - 양식 상세 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const template = await prisma.excelTemplate.findUnique({
      where: { id },
    })

    if (!template) {
      return NextResponse.json(
        { error: '양식을 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    return NextResponse.json(template)
  } catch (error) {
    console.error('양식 조회 오류:', error)
    return NextResponse.json(
      { error: '양식 조회에 실패했습니다' },
      { status: 500 }
    )
  }
}

// PATCH /api/excel-templates/[id] - 양식 수정
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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
      isActive,
      isDefault,
    } = body

    // isDefault가 true이면 기존 기본 양식 해제
    if (isDefault && docType) {
      await prisma.excelTemplate.updateMany({
        where: { docType, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      })
    }

    const template = await prisma.excelTemplate.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(docType !== undefined && { docType }),
        ...(sampleFileName !== undefined && { sampleFileName }),
        ...(sampleFilePath !== undefined && { sampleFilePath }),
        ...(fieldMappings !== undefined && { fieldMappings }),
        ...(itemTableHeaderRow !== undefined && { itemTableHeaderRow }),
        ...(itemTableStartRow !== undefined && { itemTableStartRow }),
        ...(itemTableEndRow !== undefined && { itemTableEndRow }),
        ...(salesColumnMappings !== undefined && { salesColumnMappings }),
        ...(purchaseColumnMappings !== undefined && { purchaseColumnMappings }),
        ...(mainItemDetection !== undefined && { mainItemDetection }),
        ...(subItemDetection !== undefined && { subItemDetection }),
        ...(totalRowDetection !== undefined && { totalRowDetection }),
        ...(analyzedData !== undefined && { analyzedData }),
        ...(isActive !== undefined && { isActive }),
        ...(isDefault !== undefined && { isDefault }),
      },
    })

    return NextResponse.json(template)
  } catch (error) {
    console.error('양식 수정 오류:', error)
    return NextResponse.json(
      { error: '양식 수정에 실패했습니다' },
      { status: 500 }
    )
  }
}

// DELETE /api/excel-templates/[id] - 양식 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    await prisma.excelTemplate.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('양식 삭제 오류:', error)
    return NextResponse.json(
      { error: '양식 삭제에 실패했습니다' },
      { status: 500 }
    )
  }
}
