import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { uploadToS3, generateS3Key } from '@/lib/s3'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/sales-approvals/[id]/files - 파일 목록 조회
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const files = await prisma.salesApprovalFile.findMany({
      where: { approvalId: id },
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

// POST /api/sales-approvals/[id]/files - 파일 업로드
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    // 품의서 확인
    const approval = await prisma.salesApproval.findUnique({
      where: { id },
      select: { id: true, status: true },
    })

    if (!approval) {
      return NextResponse.json(
        { error: '품의서를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    // 결재 완료 후에만 원본 파일 업로드 가능
    if (approval.status !== 'APPROVED') {
      return NextResponse.json(
        { error: '결재 완료 후에만 원본 파일을 업로드할 수 있습니다' },
        { status: 400 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const fileType = (formData.get('fileType') as string) || 'SIGNED_ORIGINAL'

    if (!file) {
      return NextResponse.json(
        { error: '파일이 제공되지 않았습니다' },
        { status: 400 }
      )
    }

    // 파일 업로드
    const buffer = Buffer.from(await file.arrayBuffer())
    const s3Key = generateS3Key('sales-approvals', id, file.name)
    await uploadToS3(s3Key, buffer, file.type)

    // DB에 파일 정보 저장
    // TODO: 실제 사용자 ID 사용 (현재는 시스템 사용자 사용)
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

    const savedFile = await prisma.salesApprovalFile.create({
      data: {
        approvalId: id,
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
