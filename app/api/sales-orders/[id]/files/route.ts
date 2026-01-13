import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { uploadToS3, generateS3Key } from '@/lib/s3'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/sales-orders/[id]/files - 파일 목록 조회
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const files = await prisma.salesOrderFile.findMany({
      where: { orderId: id },
      include: {
        uploadedBy: { select: { id: true, name: true } },
      },
      orderBy: { uploadedAt: 'desc' },
    })

    return NextResponse.json(files)
  } catch (error) {
    console.error('파일 목록 조회 오류:', error)
    return NextResponse.json(
      { error: '파일 목록 조회에 실패했습니다' },
      { status: 500 }
    )
  }
}

// POST /api/sales-orders/[id]/files - 파일 업로드
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    // 발주서 확인
    const order = await prisma.salesOrder.findUnique({
      where: { id },
      select: { id: true, status: true },
    })

    if (!order) {
      return NextResponse.json(
        { error: '발주서를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    // 발송 이후 상태에서만 파일 업로드 가능
    if (order.status === 'DRAFT') {
      return NextResponse.json(
        { error: '발송 후에만 파일을 업로드할 수 있습니다' },
        { status: 400 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const fileType = (formData.get('fileType') as string) || 'ATTACHMENT'

    if (!file) {
      return NextResponse.json(
        { error: '파일이 제공되지 않았습니다' },
        { status: 400 }
      )
    }

    // 파일 업로드
    const buffer = Buffer.from(await file.arrayBuffer())
    const s3Key = generateS3Key('sales-orders', id, file.name)
    await uploadToS3(s3Key, buffer, file.type)

    // DB에 파일 정보 저장
    let user = await prisma.user.findFirst({ where: { email: 'system@smerp.local' } })
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: 'system@smerp.local',
          passwordHash: 'not-used',
          name: 'System',
        },
      })
    }

    const savedFile = await prisma.salesOrderFile.create({
      data: {
        orderId: id,
        fileType: fileType as 'EXCEL_ORIGINAL' | 'EXCEL_GENERATED' | 'CLIENT_PO' | 'ATTACHMENT' | 'SIGNED_ORIGINAL',
        fileName: file.name,
        filePath: s3Key,
        fileSize: file.size,
        mimeType: file.type,
        uploadedById: user.id,
      },
      include: {
        uploadedBy: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json(savedFile, { status: 201 })
  } catch (error) {
    console.error('파일 업로드 오류:', error)
    return NextResponse.json(
      { error: '파일 업로드에 실패했습니다' },
      { status: 500 }
    )
  }
}
