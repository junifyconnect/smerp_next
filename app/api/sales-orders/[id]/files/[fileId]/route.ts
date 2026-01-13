import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getPresignedDownloadUrl, deleteFromS3 } from '@/lib/s3'

interface RouteParams {
  params: Promise<{ id: string; fileId: string }>
}

// GET /api/sales-orders/[id]/files/[fileId] - 파일 다운로드 URL 조회
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, fileId } = await params

    const file = await prisma.salesOrderFile.findFirst({
      where: { id: fileId, orderId: id },
    })

    if (!file) {
      return NextResponse.json(
        { error: '파일을 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    // Presigned URL 생성 (1시간 유효)
    const downloadUrl = await getPresignedDownloadUrl(file.filePath, 3600)

    return NextResponse.json({
      downloadUrl,
      fileName: file.fileName,
      mimeType: file.mimeType,
    })
  } catch (error) {
    console.error('파일 다운로드 URL 생성 오류:', error)
    return NextResponse.json(
      { error: '파일 다운로드 URL 생성에 실패했습니다' },
      { status: 500 }
    )
  }
}

// DELETE /api/sales-orders/[id]/files/[fileId] - 파일 삭제
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, fileId } = await params

    const file = await prisma.salesOrderFile.findFirst({
      where: { id: fileId, orderId: id },
    })

    if (!file) {
      return NextResponse.json(
        { error: '파일을 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    // S3에서 파일 삭제
    await deleteFromS3(file.filePath)

    // DB에서 파일 정보 삭제
    await prisma.salesOrderFile.delete({ where: { id: fileId } })

    return NextResponse.json({ message: '파일이 삭제되었습니다' })
  } catch (error) {
    console.error('파일 삭제 오류:', error)
    return NextResponse.json(
      { error: '파일 삭제에 실패했습니다' },
      { status: 500 }
    )
  }
}
