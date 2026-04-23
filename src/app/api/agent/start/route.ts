import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'

const RUNNER_BASE = 'http://185.81.1.32:8686/api/v1/runner/agents'
const AGENT_NAME  = 'Hotel_Miramare'

export async function POST() {
  const session = await auth()
  if (!session || (session.user as { role?: string }).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Legge il prompt aggiornato dal DB
  const config = await prisma.agentConfig.findUnique({ where: { id: 'default' } })
  if (!config) {
    return NextResponse.json({ error: 'Configurazione agente non trovata' }, { status: 404 })
  }

  // La callback URL punta direttamente al nostro webhook (niente n8n)
  const appUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
  const callbackUrl = `${appUrl}/api/webhook/calls`

  const body = {
    name:             AGENT_NAME,
    description:      "Risponde a delle chiamate in arrivo di clienti che chiedono informazioni sull'hotel",
    prompt:           config.prompt,
    first_phrase:     'Buongiorno, Hotel Miramare di Ladispoli, come posso aiutarla?',
    phone_number:     '+390759975072',
    agent_type:       'standard',
    n8n_callback_url: callbackUrl,   // rinominato lato runner, ma ora punta a noi
    plugins: [
      {
        name: 'slope',
        data: {
          api_token: 'b1c8a8533ad9e5d4f71dd2bf5e2f8247',
          base_url:  'https://api.staging.slope.it/v1',
        },
      },
    ],
  }

  const res = await fetch(`${RUNNER_BASE}/start`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  })

  const text = await res.text()
  return new NextResponse(text, {
    status: res.status,
    headers: { 'Content-Type': res.headers.get('Content-Type') ?? 'application/json' },
  })
}
