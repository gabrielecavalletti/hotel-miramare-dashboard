'use client'

import { useEffect, useState, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { StatusBadge } from '@/components/calls/StatusBadge'
import { LeadBadge } from '@/components/calls/LeadBadge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeftIcon,
  PhoneIcon,
  CalendarIcon,
  UsersIcon,
  BedDoubleIcon,
  ClipboardListIcon,
  AlertCircleIcon,
  ClockIcon,
  SendIcon,
  UserIcon,
} from 'lucide-react'

interface CallNote {
  id: string
  content: string
  createdAt: string
  author: { name: string | null; email: string }
}

interface StatusLog {
  id: string
  fromStatus: string
  toStatus: string
  changedAt: string
  changedBy: { name: string | null; email: string }
}

interface CallDetail {
  id: string
  receivedAt: string
  updatedAt: string
  status: string
  leadQuality: string
  requestType: string | null
  customerName: string
  customerPhone: string
  checkIn: string | null
  checkOut: string | null
  guests: number | null
  nights: number | null
  roomType: string | null
  notes: string | null
  operationalSummary: string | null
  requiredAction: string | null
  assignedTo: { id: string; name: string | null; email: string } | null
  callNotes: CallNote[]
  statusLogs: StatusLog[]
}

const STATUS_OPTIONS = [
  { value: 'NEW', label: 'Nuova' },
  { value: 'TO_CALL_BACK', label: 'Da richiamare' },
  { value: 'IN_PROGRESS', label: 'In lavorazione' },
  { value: 'CONFIRMED', label: 'Confermata' },
  { value: 'CANCELLED', label: 'Annullata' },
  { value: 'ARCHIVED', label: 'Archiviata' },
]

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('it-IT', {
    weekday: 'short',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <div className="mt-0.5 text-gray-400 flex-shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</p>
        <div className="text-sm text-gray-800 mt-0.5">{value}</div>
      </div>
    </div>
  )
}

export default function CallDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  const [call, setCall] = useState<CallDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusUpdating, setStatusUpdating] = useState(false)
  const [noteContent, setNoteContent] = useState('')
  const [noteSubmitting, setNoteSubmitting] = useState(false)

  const fetchCall = useCallback(async () => {
    try {
      const res = await fetch(`/api/calls/${id}`)
      if (res.ok) {
        setCall(await res.json())
      } else if (res.status === 404) {
        router.push('/calls')
      }
    } finally {
      setLoading(false)
    }
  }, [id, router])

  useEffect(() => {
    fetchCall()
  }, [fetchCall])

  async function handleStatusChange(newStatus: string) {
    if (!call || newStatus === call.status) return
    setStatusUpdating(true)
    try {
      const res = await fetch(`/api/calls/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        await fetchCall()
        toast.success('Stato aggiornato')
      } else {
        toast.error('Errore aggiornamento stato')
      }
    } catch {
      toast.error('Errore di connessione')
    } finally {
      setStatusUpdating(false)
    }
  }

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault()
    if (!noteContent.trim()) return
    setNoteSubmitting(true)
    try {
      const res = await fetch(`/api/calls/${id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: noteContent }),
      })
      if (res.ok) {
        setNoteContent('')
        await fetchCall()
        toast.success('Nota aggiunta')
      } else {
        toast.error('Errore aggiunta nota')
      }
    } catch {
      toast.error('Errore di connessione')
    } finally {
      setNoteSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-gray-400">Caricamento...</div>
      </div>
    )
  }

  if (!call) return null

  return (
    <div className="space-y-6">
      {/* Back button + header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => router.push('/calls')}
          className="text-gray-500"
        >
          <ArrowLeftIcon className="size-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900 truncate">{call.customerName}</h1>
          <p className="text-sm text-gray-400">Ricevuta il {formatDateTime(call.receivedAt)}</p>
        </div>
        <div className="flex items-center gap-2">
          <LeadBadge quality={call.leadQuality} />
          <StatusBadge status={call.status} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN: Call data */}
        <div className="lg:col-span-2 space-y-4">
          {/* Customer info */}
          <Card className="bg-white shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-gray-800">Dati cliente</CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-gray-50">
              <InfoRow
                icon={<UserIcon className="size-4" />}
                label="Nome"
                value={<span className="font-medium">{call.customerName}</span>}
              />
              <InfoRow
                icon={<PhoneIcon className="size-4" />}
                label="Telefono"
                value={
                  <a href={`tel:${call.customerPhone}`} className="text-blue-600 hover:underline font-medium">
                    {call.customerPhone}
                  </a>
                }
              />
              {call.requestType && (
                <InfoRow
                  icon={<ClipboardListIcon className="size-4" />}
                  label="Tipo richiesta"
                  value={call.requestType}
                />
              )}
            </CardContent>
          </Card>

          {/* Stay info */}
          {(call.checkIn || call.checkOut || call.guests || call.nights || call.roomType) && (
            <Card className="bg-white shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-gray-800">Dettagli soggiorno</CardTitle>
              </CardHeader>
              <CardContent className="divide-y divide-gray-50">
                {call.checkIn && (
                  <InfoRow
                    icon={<CalendarIcon className="size-4" />}
                    label="Check-in"
                    value={formatDate(call.checkIn)}
                  />
                )}
                {call.checkOut && (
                  <InfoRow
                    icon={<CalendarIcon className="size-4" />}
                    label="Check-out"
                    value={formatDate(call.checkOut)}
                  />
                )}
                {call.nights && (
                  <InfoRow
                    icon={<ClockIcon className="size-4" />}
                    label="Notti"
                    value={`${call.nights} notti`}
                  />
                )}
                {call.guests && (
                  <InfoRow
                    icon={<UsersIcon className="size-4" />}
                    label="Ospiti"
                    value={`${call.guests} ospiti`}
                  />
                )}
                {call.roomType && (
                  <InfoRow
                    icon={<BedDoubleIcon className="size-4" />}
                    label="Tipo camera"
                    value={call.roomType}
                  />
                )}
              </CardContent>
            </Card>
          )}

          {/* Notes from AI */}
          {(call.notes || call.operationalSummary || call.requiredAction) && (
            <Card className="bg-white shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-gray-800">Riepilogo assistente</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {call.operationalSummary && (
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Riepilogo operativo</p>
                    <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 leading-relaxed">{call.operationalSummary}</p>
                  </div>
                )}
                {call.requiredAction && (
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Azione richiesta</p>
                    <div className="flex items-start gap-2 bg-orange-50 border border-orange-100 rounded-lg p-3">
                      <AlertCircleIcon className="size-4 text-orange-500 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-orange-800">{call.requiredAction}</p>
                    </div>
                  </div>
                )}
                {call.notes && (
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Note trascrizione</p>
                    <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 leading-relaxed whitespace-pre-line">{call.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Staff notes */}
          <Card className="bg-white shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-gray-800">
                Note staff {call.callNotes.length > 0 && (
                  <span className="ml-1 text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full font-normal">
                    {call.callNotes.length}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add note form */}
              <form onSubmit={handleAddNote} className="space-y-2">
                <Textarea
                  placeholder="Aggiungi una nota..."
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  className="min-h-20 resize-none text-sm"
                />
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    size="sm"
                    disabled={noteSubmitting || !noteContent.trim()}
                    className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <SendIcon className="size-3.5" />
                    {noteSubmitting ? 'Invio...' : 'Aggiungi nota'}
                  </Button>
                </div>
              </form>

              {/* Notes list */}
              {call.callNotes.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    {call.callNotes.map((note) => (
                      <div key={note.id} className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-medium text-gray-700">
                            {note.author.name ?? note.author.email}
                          </span>
                          <span className="text-xs text-gray-400">{formatDateTime(note.createdAt)}</span>
                        </div>
                        <p className="text-sm text-gray-700 whitespace-pre-line">{note.content}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: Management panel */}
        <div className="space-y-4">
          {/* Status management */}
          <Card className="bg-white shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-gray-800">Gestione</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Stato chiamata</p>
                <Select
                  value={call.status}
                  onValueChange={(v) => { if (v) handleStatusChange(v) }}
                  disabled={statusUpdating}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Lead quality</p>
                <div className="flex items-center">
                  <LeadBadge quality={call.leadQuality} />
                </div>
              </div>

              {call.assignedTo && (
                <div className="space-y-1.5">
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Assegnato a</p>
                  <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                    <div className="size-6 rounded-full bg-blue-100 flex items-center justify-center text-xs font-medium text-blue-700">
                      {(call.assignedTo.name ?? call.assignedTo.email)[0].toUpperCase()}
                    </div>
                    <span className="text-sm text-gray-700">
                      {call.assignedTo.name ?? call.assignedTo.email}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status history */}
          {call.statusLogs.length > 0 && (
            <Card className="bg-white shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-gray-800">Cronologia stati</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2.5">
                  {call.statusLogs.map((log) => (
                    <div key={log.id} className="flex items-start gap-2 text-xs">
                      <div className="mt-0.5 size-1.5 rounded-full bg-gray-300 flex-shrink-0 mt-1.5" />
                      <div>
                        <div className="text-gray-600">
                          <StatusBadge status={log.fromStatus} />
                          <span className="mx-1 text-gray-400">→</span>
                          <StatusBadge status={log.toStatus} />
                        </div>
                        <div className="text-gray-400 mt-0.5">
                          {log.changedBy.name ?? log.changedBy.email} · {formatDateTime(log.changedAt)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick actions */}
          <Card className="bg-white shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-gray-800">Azioni rapide</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <a href={`tel:${call.customerPhone}`} className="block">
                <Button variant="outline" size="sm" className="w-full gap-2 justify-start">
                  <PhoneIcon className="size-4 text-green-600" />
                  Chiama {call.customerName.split(' ')[0]}
                </Button>
              </a>
              {call.status === 'NEW' && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2 justify-start"
                  disabled={statusUpdating}
                  onClick={() => handleStatusChange('IN_PROGRESS')}
                >
                  <ClipboardListIcon className="size-4 text-yellow-600" />
                  Prendi in carico
                </Button>
              )}
              {(call.status === 'IN_PROGRESS' || call.status === 'TO_CALL_BACK') && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2 justify-start"
                  disabled={statusUpdating}
                  onClick={() => handleStatusChange('CONFIRMED')}
                >
                  <ClipboardListIcon className="size-4 text-green-600" />
                  Conferma prenotazione
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
