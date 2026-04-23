import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { content } = await request.json()
  if (!content?.trim()) return NextResponse.json({ error: 'Content required' }, { status: 400 })

  const note = await prisma.callNote.create({
    data: {
      callId: id,
      authorId: (session.user as { id: string }).id,
      content: content.trim(),
    },
    include: { author: { select: { name: true, email: true } } },
  })

  return NextResponse.json(note, { status: 201 })
}
