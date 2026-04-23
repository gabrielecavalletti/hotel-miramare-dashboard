import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(request: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') || ''
  const status = searchParams.getAll('status')
  const lead = searchParams.get('lead') || ''
  const dateRange = searchParams.get('dateRange') || ''
  const page = parseInt(searchParams.get('page') || '1')
  const limit = 20

  const where: Record<string, unknown> = {}

  if (search) {
    where.OR = [
      { customerName: { contains: search } },
      { customerPhone: { contains: search } },
    ]
  }
  if (status.length > 0) where.status = { in: status }
  if (lead) where.leadQuality = lead

  if (dateRange) {
    const now = new Date()
    let from: Date | null = null
    if (dateRange === 'today') {
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    } else if (dateRange === '7d') {
      from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    } else if (dateRange === 'month') {
      from = new Date(now.getFullYear(), now.getMonth(), 1)
    }
    if (from) where.receivedAt = { gte: from }
  }

  const [calls, total, newCount] = await Promise.all([
    prisma.call.findMany({
      where,
      orderBy: { receivedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { assignedTo: { select: { name: true, email: true } } },
    }),
    prisma.call.count({ where }),
    prisma.call.count({ where: { status: 'NEW' } }),
  ])

  return NextResponse.json({ calls, total, page, limit, newCount })
}
