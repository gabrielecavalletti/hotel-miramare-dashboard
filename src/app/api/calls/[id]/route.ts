import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const call = await prisma.call.findUnique({
    where: { id },
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
      callNotes: {
        include: { author: { select: { name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
      },
      statusLogs: {
        include: { changedBy: { select: { name: true, email: true } } },
        orderBy: { changedAt: 'desc' },
      },
    },
  })

  if (!call) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(call)
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const call = await prisma.call.findUnique({ where: { id } })
  if (!call) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updateData: Record<string, unknown> = {}
  if (body.status) updateData.status = body.status
  if (body.assignedToId !== undefined) updateData.assignedToId = body.assignedToId || null

  const updated = await prisma.call.update({ where: { id }, data: updateData })

  if (body.status && body.status !== call.status) {
    await prisma.callStatusLog.create({
      data: {
        callId: id,
        fromStatus: call.status,
        toStatus: body.status,
        changedById: (session.user as { id: string }).id,
      },
    })
  }

  return NextResponse.json(updated)
}
