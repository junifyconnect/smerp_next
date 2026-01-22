import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

// GET /api/vendors - 매입처 목록/검색
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const limit = parseInt(searchParams.get('limit') || '10')

    const where: Record<string, unknown> = {
      isActive: true,
    }

    if (search.trim()) {
      where.name = {
        contains: search,
        mode: 'insensitive',
      }
    }

    const vendors = await prisma.vendor.findMany({
      where,
      orderBy: [
        { usageCount: 'desc' }, // 자주 사용하는 매입처 우선
        { name: 'asc' },
      ],
      take: limit,
      select: {
        id: true,
        name: true,
        contactName: true,
        phone: true,
        email: true,
      },
    })

    return NextResponse.json(vendors)
  } catch (error) {
    console.error('매입처 조회 오류:', error)
    return NextResponse.json(
      { error: '매입처 목록을 불러오는데 실패했습니다' },
      { status: 500 }
    )
  }
}

// POST /api/vendors - 매입처 생성 (품의서 저장 시 자동 호출)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, contactName, phone, email, notes } = body

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: '매입처명은 필수입니다' },
        { status: 400 }
      )
    }

    // 이미 존재하는지 확인
    const existing = await prisma.vendor.findUnique({
      where: { name: name.trim() },
    })

    if (existing) {
      // 이미 존재하면 사용 횟수 증가
      const updated = await prisma.vendor.update({
        where: { id: existing.id },
        data: { usageCount: { increment: 1 } },
      })
      return NextResponse.json(updated)
    }

    // 새로 생성
    const vendor = await prisma.vendor.create({
      data: {
        name: name.trim(),
        contactName: contactName?.trim() || null,
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        notes: notes?.trim() || null,
        usageCount: 1,
      },
    })

    return NextResponse.json(vendor, { status: 201 })
  } catch (error) {
    console.error('매입처 생성 오류:', error)
    return NextResponse.json(
      { error: '매입처 생성에 실패했습니다' },
      { status: 500 }
    )
  }
}
