import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

const RUNNER_BASE = 'http://185.81.1.32:8686/api/v1/runner/agents'
const AGENT_NAME  = 'Hotel_Miramare'

export async function POST() {
  const session = await auth()
  if (!session || (session.user as { role?: string }).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const res = await fetch(`${RUNNER_BASE}/stop/${AGENT_NAME}`, { method: 'POST' })

  const text = await res.text()
  return new NextResponse(text, {
    status: res.status,
    headers: { 'Content-Type': res.headers.get('Content-Type') ?? 'application/json' },
  })
}
