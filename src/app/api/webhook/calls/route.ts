import { NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { analyzeConversation } from '@/lib/openai'
import { sendCallRecapEmail } from '@/lib/mailer'

// ─── Schema payload dal software vocale ──────────────────────────────────────

const conversationMessageSchema = z.object({
  role: z.enum(['assistant', 'user']),
  content: z.string(),
  timestamp: z.string().optional(),
})

const voicePayloadSchema = z.object({
  agent_phone_number: z.string().optional(),
  channel_id: z.string().optional(),
  phone_number: z.string().min(1, 'phone_number è obbligatorio'),
  conversation: z.array(conversationMessageSchema).min(1, 'conversation non può essere vuota'),
})

// ─── Mappa stato OpenAI → CallStatus Prisma ──────────────────────────────────

const STATUS_MAP = {
  prenotazione_completata: 'CONFIRMED',
  da_confermare:           'TO_CALL_BACK',
  informazioni:            'NEW',
  non_pertinente:          'CANCELLED',
} as const

// ─── Calcola durata in secondi dai timestamp della conversazione ──────────────

function calcDuration(conversation: { timestamp?: string }[]): number | null {
  const timestamps = conversation
    .map((m) => m.timestamp ? new Date(m.timestamp).getTime() : NaN)
    .filter((t) => !isNaN(t))
  if (timestamps.length < 2) return null
  const durationMs = Math.max(...timestamps) - Math.min(...timestamps)
  return Math.round(durationMs / 1000)
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  // 1. Autenticazione via header secret
  const secret = request.headers.get('x-webhook-secret')
  if (secret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Parsing e validazione payload
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = voicePayloadSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Payload non valido', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { phone_number, conversation, channel_id, agent_phone_number } = parsed.data

  // 3. Controllo se conversazione avvenuta (branch true/false come in n8n)
  //    Scarta le chiamate in cui il cliente non ha mai risposto (linea muta,
  //    riagganciato subito, ecc.) — equivale al nodo IF di n8n
  const userMessages = conversation.filter(
    (m) => m.role === 'user' && m.content.trim().length > 0
  )
  if (userMessages.length === 0) {
    console.log(`[webhook] Conversazione scartata (nessun messaggio utente) — ${phone_number}`)
    return NextResponse.json(
      { skipped: true, reason: 'Nessuna risposta dal cliente' },
      { status: 200 }
    )
  }

  // 4. Analisi conversazione con OpenAI
  let analysis
  try {
    analysis = await analyzeConversation(conversation, phone_number)
  } catch (err) {
    console.error('[webhook] OpenAI error:', err)
    return NextResponse.json(
      { error: 'Errore analisi conversazione', detail: String(err) },
      { status: 502 }
    )
  }

  // 4. Calcola durata chiamata
  const durationSeconds = calcDuration(conversation)

  // 5. Salva nel DB
  const call = await prisma.call.create({
    data: {
      status:             STATUS_MAP[analysis.status] ?? 'NEW',
      leadQuality:        analysis.leadQuality,
      requestType:        analysis.requestType ?? null,
      customerName:       analysis.customerName,
      customerPhone:      analysis.callbackPhone ?? phone_number,
      checkIn:            analysis.checkIn  ? new Date(analysis.checkIn)  : null,
      checkOut:           analysis.checkOut ? new Date(analysis.checkOut) : null,
      guests:             analysis.guests   ?? null,
      roomType:           analysis.roomType ?? null,
      notes:              analysis.recap,
      operationalSummary: analysis.recap,
      requiredAction:     analysis.requiredAction,
      durationSeconds,
      rawPayload: JSON.stringify({
        agent_phone_number,
        channel_id,
        phone_number,
        conversation,
        _analysis: analysis,
      }),
    },
  })

  // 6. Invia email di recap (non bloccante: un errore mail non blocca la risposta)
  sendCallRecapEmail(analysis, phone_number, call.id).catch((err) =>
    console.error('[webhook] Errore invio email:', err)
  )

  return NextResponse.json(
    {
      id:           call.id,
      status:       call.status,
      customerName: analysis.customerName,
      leadQuality:  analysis.leadQuality,
    },
    { status: 201 }
  )
}
