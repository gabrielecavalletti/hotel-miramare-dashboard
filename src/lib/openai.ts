import OpenAI from 'openai'

// Singleton client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export type ConversationMessage = {
  role: 'assistant' | 'user'
  content: string
  timestamp?: string
}

export type CallAnalysis = {
  customerName: string           // nome e cognome estratto (o "Sconosciuto")
  callbackPhone: string | null   // numero di ricontatto (può differire dall'originale)
  recap: string                  // sintesi breve delle richieste
  requiredAction: string         // cosa deve fare lo staff
  status: 'prenotazione_completata' | 'da_confermare' | 'informazioni' | 'non_pertinente'
  leadQuality: 'HOT' | 'WARM' | 'COLD'
  checkIn: string | null         // YYYY-MM-DD
  checkOut: string | null        // YYYY-MM-DD
  guests: number | null
  roomType: string | null
  requestType: string            // breve etichetta del tipo di richiesta
}

const SYSTEM_PROMPT = `Sei un assistente specializzato nell'analisi di conversazioni telefoniche di un hotel.
Ti verrà fornita una conversazione tra l'assistente vocale dell'hotel e un cliente.
Devi estrarre le informazioni chiave e restituire SOLO un oggetto JSON valido (nessun testo aggiuntivo).

Regole:
- customerName: nome e cognome del cliente se menzionato, altrimenti "Sconosciuto"
- callbackPhone: numero di telefono di ricontatto se diverso da quello chiamante, null altrimenti
- recap: sintesi in 2-4 frasi delle richieste principali del cliente (in italiano)
- requiredAction: cosa deve fare lo staff (es. "Richiamare per confermare disponibilità camera doppia")
- status: scegli tra ["prenotazione_completata", "da_confermare", "informazioni", "non_pertinente"]
  * prenotazione_completata = prenotazione già confermata durante la chiamata
  * da_confermare = interesse concreto ma richiede follow-up
  * informazioni = solo richiesta di info generali, nessun interesse diretto
  * non_pertinente = chiamata errata, spam, o argomento non inerente all'hotel
- leadQuality: HOT = interesse forte e prenotazione imminente, WARM = interesse ma incerto, COLD = solo curiosità
- checkIn/checkOut: date in formato YYYY-MM-DD se menzionate, null altrimenti
- guests: numero di ospiti se menzionato, null altrimenti
- roomType: tipo di camera richiesta se menzionata, null altrimenti
- requestType: etichetta breve (es. "Prenotazione camera", "Info prezzi", "Cancellazione")`

export async function analyzeConversation(
  conversation: ConversationMessage[],
  callerPhone: string
): Promise<CallAnalysis> {
  const conversationText = conversation
    .map((m) => {
      const ts = m.timestamp ? ` [${m.timestamp}]` : ''
      const role = m.role === 'assistant' ? 'ASSISTENTE' : 'CLIENTE'
      return `${role}${ts}: ${m.content}`
    })
    .join('\n')

  const userPrompt = `Numero chiamante: ${callerPhone}

Conversazione:
${conversationText}

Restituisci l'analisi come oggetto JSON.`

  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1, // bassa temperatura per output deterministici
  })

  const raw = response.choices[0]?.message?.content
  if (!raw) throw new Error('OpenAI returned empty response')

  const parsed = JSON.parse(raw) as CallAnalysis

  // Normalizzazioni di sicurezza
  if (!parsed.customerName?.trim()) parsed.customerName = 'Sconosciuto'
  if (!['HOT', 'WARM', 'COLD'].includes(parsed.leadQuality)) parsed.leadQuality = 'WARM'
  if (!['prenotazione_completata', 'da_confermare', 'informazioni', 'non_pertinente'].includes(parsed.status)) {
    parsed.status = 'da_confermare'
  }

  return parsed
}
