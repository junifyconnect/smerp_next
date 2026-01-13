import { NextRequest, NextResponse } from 'next/server'
import {
  listS3Objects,
  uploadToS3,
  deleteFromS3,
  getS3BucketName,
} from '@/lib/s3'

// GET /api/cloud - S3 파일/폴더 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const prefix = searchParams.get('prefix') || ''

    const { objects, prefixes } = await listS3Objects(prefix)

    // 폴더와 파일 분리
    const folders = prefixes.map((p) => ({
      key: p,
      name: p.replace(prefix, '').replace(/\/$/, ''),
      isFolder: true,
      size: 0,
      lastModified: null,
    }))

    const files = objects
      .filter((obj) => obj.key !== prefix) // 현재 폴더 자체 제외
      .map((obj) => ({
        key: obj.key,
        name: obj.key.split('/').pop() || obj.key,
        isFolder: false,
        size: obj.size,
        lastModified: obj.lastModified,
      }))

    return NextResponse.json({
      bucket: getS3BucketName(),
      prefix,
      items: [...folders, ...files],
      totalFolders: folders.length,
      totalFiles: files.length,
    })
  } catch (error) {
    console.error('S3 목록 조회 오류:', error)
    return NextResponse.json(
      { error: 'S3 목록 조회에 실패했습니다' },
      { status: 500 }
    )
  }
}

// POST /api/cloud - 파일 업로드
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const folder = (formData.get('folder') as string) || ''

    if (!file) {
      return NextResponse.json({ error: '파일이 필요합니다' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const key = folder ? `${folder}${file.name}` : file.name

    await uploadToS3(key, buffer, file.type || 'application/octet-stream')

    return NextResponse.json({
      message: '파일이 업로드되었습니다',
      key,
      fileName: file.name,
      size: file.size,
    })
  } catch (error) {
    console.error('파일 업로드 오류:', error)
    return NextResponse.json(
      { error: '파일 업로드에 실패했습니다' },
      { status: 500 }
    )
  }
}

// DELETE /api/cloud - 파일 삭제
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const key = searchParams.get('key')

    if (!key) {
      return NextResponse.json(
        { error: '삭제할 파일 키가 필요합니다' },
        { status: 400 }
      )
    }

    await deleteFromS3(key)

    return NextResponse.json({
      message: '파일이 삭제되었습니다',
      key,
    })
  } catch (error) {
    console.error('파일 삭제 오류:', error)
    return NextResponse.json(
      { error: '파일 삭제에 실패했습니다' },
      { status: 500 }
    )
  }
}
