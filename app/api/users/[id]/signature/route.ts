import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { uploadToS3, deleteFromS3 } from '@/lib/s3'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/users/[id]/signature - 서명 이미지 URL 조회
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, signatureUrl: true },
    })

    if (!user) {
      return NextResponse.json(
        { error: '사용자를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: user.id,
      name: user.name,
      signatureUrl: user.signatureUrl,
    })
  } catch (error) {
    console.error('서명 조회 오류:', error)
    return NextResponse.json(
      { error: '서명 조회에 실패했습니다' },
      { status: 500 }
    )
  }
}

// POST /api/users/[id]/signature - 서명 이미지 업로드
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, signatureUrl: true },
    })

    if (!user) {
      return NextResponse.json(
        { error: '사용자를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { error: '파일이 필요합니다' },
        { status: 400 }
      )
    }

    // 이미지 파일 검증
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: '이미지 파일만 업로드 가능합니다' },
        { status: 400 }
      )
    }

    // 파일 크기 제한 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: '파일 크기는 5MB 이하여야 합니다' },
        { status: 400 }
      )
    }

    // 기존 서명 이미지 삭제
    if (user.signatureUrl) {
      try {
        await deleteFromS3(user.signatureUrl)
      } catch {
        // 기존 파일 삭제 실패해도 계속 진행
        console.warn('기존 서명 이미지 삭제 실패:', user.signatureUrl)
      }
    }

    // S3 업로드
    const buffer = Buffer.from(await file.arrayBuffer())
    const ext = file.name.split('.').pop() || 'png'
    const timestamp = Date.now()
    const s3Key = `signatures/${id}/${timestamp}.${ext}`

    await uploadToS3(s3Key, buffer, file.type)

    // DB 업데이트
    const updatedUser = await prisma.user.update({
      where: { id },
      data: { signatureUrl: s3Key },
      select: { id: true, name: true, signatureUrl: true },
    })

    return NextResponse.json(updatedUser, { status: 200 })
  } catch (error) {
    console.error('서명 업로드 오류:', error)
    return NextResponse.json(
      { error: '서명 업로드에 실패했습니다' },
      { status: 500 }
    )
  }
}

// DELETE /api/users/[id]/signature - 서명 이미지 삭제
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, signatureUrl: true },
    })

    if (!user) {
      return NextResponse.json(
        { error: '사용자를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    if (!user.signatureUrl) {
      return NextResponse.json(
        { error: '등록된 서명이 없습니다' },
        { status: 400 }
      )
    }

    // S3에서 삭제
    await deleteFromS3(user.signatureUrl)

    // DB 업데이트
    await prisma.user.update({
      where: { id },
      data: { signatureUrl: null },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('서명 삭제 오류:', error)
    return NextResponse.json(
      { error: '서명 삭제에 실패했습니다' },
      { status: 500 }
    )
  }
}
