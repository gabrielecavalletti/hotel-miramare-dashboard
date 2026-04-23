import nodemailer from 'nodemailer'
import type { CallAnalysis } from './openai'

// ─── Transporter Brevo SMTP ──────────────────────────────────────────────────
// Credenziali: dashboard Brevo → SMTP & API → onglet SMTP
// BREVO_SMTP_USER  = il tuo indirizzo email Brevo (login)
// BREVO_SMTP_PASS  = la SMTP key generata da Brevo (NON la password account)

function createTransporter() {
  return nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    secure: false, // STARTTLS su 587
    auth: {
      user: process.env.BREVO_SMTP_USER,
      pass: process.env.BREVO_SMTP_PASS,
    },
  })
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  prenotazione_completata: '✅ Prenotazione completata',
  da_confermare: '📞 Da confermare',
  informazioni: 'ℹ️ Richiesta informazioni',
  non_pertinente: '❌ Non pertinente',
}

const LEAD_LABELS: Record<string, string> = {
  HOT:  '🔥 Caldo',
  WARM: '🌤️ Tiepido',
  COLD: '❄️ Freddo',
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('it-IT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

// ─── HTML della mail ─────────────────────────────────────────────────────────

function buildHtml(analysis: CallAnalysis, callerPhone: string, callId: string): string {
  const appUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
  const detailUrl = `${appUrl}/calls/${callId}`

  const row = (label: string, value: string) =>
    value && value !== '—'
      ? `<tr>
           <td style="padding:6px 12px 6px 0;color:#6b7280;font-size:13px;white-space:nowrap;vertical-align:top">${label}</td>
           <td style="padding:6px 0;font-size:13px;color:#111827;font-weight:500">${value}</td>
         </tr>`
      : ''

  return `<!DOCTYPE html>
<html lang="it">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:'Segoe UI',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:32px 16px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1)">

        <!-- Header -->
        <tr>
          <td style="background:#1d4ed8;padding:24px 32px">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <div style="display:inline-block;width:36px;height:36px;background:rgba(255,255,255,.2);border-radius:8px;text-align:center;line-height:36px;font-weight:700;font-size:18px;color:#fff;margin-right:10px;vertical-align:middle">M</div>
                  <span style="color:#fff;font-size:16px;font-weight:600;vertical-align:middle">Hotel Miramare — Nuova chiamata</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Status badge -->
        <tr>
          <td style="padding:24px 32px 0">
            <span style="display:inline-block;padding:4px 12px;border-radius:99px;font-size:12px;font-weight:600;background:#dbeafe;color:#1e40af">
              ${STATUS_LABELS[analysis.status] ?? analysis.status}
            </span>
            <span style="display:inline-block;padding:4px 12px;border-radius:99px;font-size:12px;font-weight:600;background:#fef3c7;color:#92400e;margin-left:8px">
              ${LEAD_LABELS[analysis.leadQuality] ?? analysis.leadQuality}
            </span>
          </td>
        </tr>

        <!-- Nome cliente grande -->
        <tr>
          <td style="padding:16px 32px 0">
            <h1 style="margin:0;font-size:22px;color:#111827;font-weight:700">${analysis.customerName}</h1>
            <p style="margin:4px 0 0;color:#6b7280;font-size:14px">
              📞 ${analysis.callbackPhone ?? callerPhone}
            </p>
          </td>
        </tr>

        <!-- Dettagli riga per riga -->
        <tr>
          <td style="padding:20px 32px 0">
            <table cellpadding="0" cellspacing="0">
              ${row('Tipo richiesta', analysis.requestType ?? '—')}
              ${row('Check-in', formatDate(analysis.checkIn))}
              ${row('Check-out', formatDate(analysis.checkOut))}
              ${row('Ospiti', analysis.guests ? String(analysis.guests) : '—')}
              ${row('Camera', analysis.roomType ?? '—')}
            </table>
          </td>
        </tr>

        <!-- Recap -->
        <tr>
          <td style="padding:20px 32px 0">
            <p style="margin:0 0 6px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:#9ca3af">Sintesi chiamata</p>
            <div style="background:#f9fafb;border-left:3px solid #1d4ed8;border-radius:0 6px 6px 0;padding:12px 16px;font-size:14px;color:#374151;line-height:1.6">
              ${analysis.recap}
            </div>
          </td>
        </tr>

        <!-- Azione richiesta -->
        <tr>
          <td style="padding:16px 32px 0">
            <p style="margin:0 0 6px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:#9ca3af">Azione richiesta</p>
            <div style="background:#fffbeb;border-left:3px solid #f59e0b;border-radius:0 6px 6px 0;padding:12px 16px;font-size:14px;color:#374151;line-height:1.6">
              ${analysis.requiredAction}
            </div>
          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td style="padding:28px 32px">
            <a href="${detailUrl}" style="display:inline-block;background:#1d4ed8;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:10px 24px;border-radius:8px">
              Apri nel pannello →
            </a>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:16px 32px;border-top:1px solid #f3f4f6">
            <p style="margin:0;font-size:11px;color:#9ca3af">
              Hotel Miramare Ladispoli · Messaggio generato automaticamente dall'assistente vocale
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// ─── Funzione principale ──────────────────────────────────────────────────────

export async function sendCallRecapEmail(
  analysis: CallAnalysis,
  callerPhone: string,
  callId: string
): Promise<void> {
  const to = process.env.MAIL_TO
  const from = process.env.MAIL_FROM ?? 'Hotel Miramare <noreply@hotelmiramare.it>'

  if (!to) {
    console.warn('[mailer] MAIL_TO non configurato — email non inviata')
    return
  }
  if (!process.env.BREVO_SMTP_USER || !process.env.BREVO_SMTP_PASS) {
    console.warn('[mailer] BREVO_SMTP_USER/PASS non configurati — email non inviata')
    return
  }

  const subject = `[Miramare] ${STATUS_LABELS[analysis.status] ?? 'Nuova chiamata'} — ${analysis.customerName}`

  const transporter = createTransporter()

  await transporter.sendMail({
    from,
    to,
    subject,
    html: buildHtml(analysis, callerPhone, callId),
    text: [
      `NUOVA CHIAMATA — Hotel Miramare`,
      ``,
      `Cliente: ${analysis.customerName}`,
      `Telefono: ${analysis.callbackPhone ?? callerPhone}`,
      `Stato: ${STATUS_LABELS[analysis.status] ?? analysis.status}`,
      `Lead: ${LEAD_LABELS[analysis.leadQuality] ?? analysis.leadQuality}`,
      ``,
      `Sintesi: ${analysis.recap}`,
      `Azione richiesta: ${analysis.requiredAction}`,
      ``,
      `Dettaglio: ${process.env.NEXTAUTH_URL ?? 'http://localhost:3000'}/calls/${callId}`,
    ].join('\n'),
  })

  console.log(`[mailer] Email inviata a ${to} per chiamata ${callId}`)
}
