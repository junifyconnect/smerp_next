import { NextRequest, NextResponse } from 'next/server'
import { getPresignedDownloadUrl } from '@/lib/s3'

// GET /api/cloud/download - 다운로드 URL 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const key = searchParams.get('key')

    if (!key) {
      return NextResponse.json(
        { error: '파일 키가 필요합니다' },
        { status: 400 }
      )
    }

    // 1시간 유효한 presigned URL 생성
    const downloadUrl = await getPresignedDownloadUrl(key, 3600)

    return NextResponse.json({
      downloadUrl,
      key,
      expiresIn: 3600,
    })
  } catch (error) {
    console.error('다운로드 URL 생성 오류:', error)
    return NextResponse.json(
      { error: '다운로드 URL 생성에 실패했습니다' },
      { status: 500 }
    )
  }
}
