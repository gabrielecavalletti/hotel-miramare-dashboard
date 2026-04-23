import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'

function getDateRange(range: string): Date | null {
  const now = new Date()
  if (range === 'today') return new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (range === '7d') return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  if (range === '30d') return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  if (range === 'month') return new Date(now.getFullYear(), now.getMonth(), 1)
  if (range === '3m') return new Date(now.getFullYear(), now.getMonth() - 3, 1)
  return null
}

export async function GET(request: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const dateRange = searchParams.get('dateRange') || '30d'

  const from = getDateRange(dateRange)
  const where: Record<string, unknown> = from ? { receivedAt: { gte: from } } : {}

  const calls = await prisma.call.findMany({
    where,
    select: {
      id: true,
      receivedAt: true,
      status: true,
      leadQuality: true,
      durationSeconds: true,
    },
    orderBy: { receivedAt: 'asc' },
  })

  const total = calls.length
  const withDuration = calls.filter((c) => c.durationSeconds != null)
  const totalSeconds = withDuration.reduce((s, c) => s + (c.durationSeconds ?? 0), 0)
  const avgSeconds = withDuration.length > 0 ? Math.round(totalSeconds / withDuration.length) : 0

  // Status distribution
  const statusCounts: Record<string, number> = {}
  for (const c of calls) {
    statusCounts[c.status] = (statusCounts[c.status] ?? 0) + 1
  }

  // Lead distribution
  const leadCounts: Record<string, number> = {}
  for (const c of calls) {
    leadCounts[c.leadQuality] = (leadCounts[c.leadQuality] ?? 0) + 1
  }

  // Calls per day (last N days)
  const callsByDay: Record<string, { calls: number; seconds: number }> = {}
  for (const c of calls) {
    const day = c.receivedAt.toISOString().slice(0, 10)
    if (!callsByDay[day]) callsByDay[day] = { calls: 0, seconds: 0 }
    callsByDay[day].calls++
    callsByDay[day].seconds += c.durationSeconds ?? 0
  }

  // Conversion rate: CONFIRMED / total
  const confirmed = statusCounts['CONFIRMED'] ?? 0
  const conversionRate = total > 0 ? Math.round((confirmed / total) * 100) : 0

  return NextResponse.json({
    total,
    totalMinutes: Math.round(totalSeconds / 60),
    avgMinutes: Math.round(avgSeconds / 60 * 10) / 10,
    conversionRate,
    statusDistribution: Object.entries(statusCounts).map(([status, count]) => ({ status, count })),
    leadDistribution: Object.entries(leadCounts).map(([quality, count]) => ({ quality, count })),
    callsByDay: Object.entries(callsByDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, calls: v.calls, minutes: Math.round(v.seconds / 60) })),
  })
}
