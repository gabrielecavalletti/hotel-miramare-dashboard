'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import {
  BotIcon,
  PencilIcon,
  SaveIcon,
  StopCircleIcon,
  PlayCircleIcon,
  ShieldAlertIcon,
  CheckCircle2Icon,
  XCircleIcon,
  LoaderIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Le chiamate al runner passano per le nostre API server-side
// → /api/agent/stop  e  /api/agent/start
// In questo modo la callback URL viene impostata lato server
// e punta al nostro webhook /api/webhook/calls (niente n8n)

type AgentStatus = 'idle' | 'stopping' | 'editing' | 'saving' | 'saved' | 'starting'

// ─── Componente status badge ──────────────────────────────────────────────────
function AgentStatusPill({ status }: { status: AgentStatus }) {
  const cfg = {
    idle:     { label: 'Bot attivo',        icon: <CheckCircle2Icon className="size-3.5" />, cls: 'bg-green-100 text-green-700 border-green-200' },
    stopping: { label: 'Arresto in corso…', icon: <LoaderIcon      className="size-3.5 animate-spin" />, cls: 'bg-orange-100 text-orange-700 border-orange-200' },
    editing:  { label: 'Bot fermo — in modifica', icon: <PencilIcon className="size-3.5" />, cls: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
    saving:   { label: 'Riavvio in corso…', icon: <LoaderIcon      className="size-3.5 animate-spin" />, cls: 'bg-blue-100 text-blue-700 border-blue-200' },
    saved:    { label: 'Bot riavviato',     icon: <PlayCircleIcon  className="size-3.5" />, cls: 'bg-green-100 text-green-700 border-green-200' },
    starting: { label: 'Avvio in corso…',  icon: <LoaderIcon      className="size-3.5 animate-spin" />, cls: 'bg-blue-100 text-blue-700 border-blue-200' },
  }[status]

  return (
    <span className={cn('inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border', cfg.cls)}>
      {cfg.icon}
      {cfg.label}
    </span>
  )
}

// ─── Pagina principale ────────────────────────────────────────────────────────
export default function AgentPage() {
  const { data: session, status: sessionStatus } = useSession()
  const router = useRouter()

  const [prompt, setPrompt]           = useState('')
  const [savedPrompt, setSavedPrompt] = useState('')
  const [loading, setLoading]         = useState(true)
  const [agentStatus, setAgentStatus] = useState<AgentStatus>('idle')
  const [stopError, setStopError]     = useState<string | null>(null)

  // Guard: solo admin
  useEffect(() => {
    if (sessionStatus === 'loading') return
    const role = (session?.user as { role?: string })?.role
    if (!session || role !== 'ADMIN') router.replace('/calls')
  }, [session, sessionStatus, router])

  // Carica prompt dal DB
  useEffect(() => {
    fetch('/api/agent-config')
      .then((r) => r.json())
      .then((data) => {
        setPrompt(data.prompt ?? '')
        setSavedPrompt(data.prompt ?? '')
      })
      .catch(() => toast.error('Impossibile caricare la configurazione'))
      .finally(() => setLoading(false))
  }, [])

  // ── Modifica: ferma il bot tramite API server-side ────────────────────────
  async function handleEdit() {
    setStopError(null)
    setAgentStatus('stopping')
    try {
      const res = await fetch('/api/agent/stop', { method: 'POST' })
      if (!res.ok) {
        const detail = await res.text()
        throw new Error(`Runner ha risposto ${res.status}: ${detail}`)
      }
      setAgentStatus('editing')
      toast.success('Bot fermato — puoi modificare il prompt')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setStopError(msg)
      setAgentStatus('idle')
      toast.error('Impossibile fermare il bot', { description: msg })
    }
  }

  // ── Salva: aggiorna DB + riavvia tramite API server-side ──────────────────
  async function handleSave() {
    if (!prompt.trim()) {
      toast.error('Il prompt non può essere vuoto')
      return
    }
    setAgentStatus('saving')
    try {
      // 1. Salva il prompt nel DB
      const dbRes = await fetch('/api/agent-config', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ prompt: prompt.trim() }),
      })
      if (!dbRes.ok) throw new Error('Errore salvataggio nel database')

      // 2. Riavvia il bot — la route server-side legge il prompt dal DB
      //    e imposta la callback URL verso il nostro /api/webhook/calls
      const startRes = await fetch('/api/agent/start', { method: 'POST' })
      if (!startRes.ok) {
        const detail = await startRes.text()
        throw new Error(`Runner ha risposto ${startRes.status}: ${detail}`)
      }

      setSavedPrompt(prompt.trim())
      setAgentStatus('saved')
      toast.success('Bot riavviato con il nuovo prompt ✅')

      // Dopo 3s torna allo stato idle
      setTimeout(() => setAgentStatus('idle'), 3000)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setAgentStatus('editing') // torna in editing così l'utente può riprovare
      toast.error('Errore durante il salvataggio', { description: msg })
    }
  }

  // ── Avvia direttamente (bot già spento o da riavviare) ────────────────────
  async function handleStart() {
    setStopError(null)
    setAgentStatus('starting')
    try {
      // Prova a fermare prima (ignora errori — potrebbe già essere fermo)
      await fetch('/api/agent/stop', { method: 'POST' }).catch(() => null)

      // Avvia il bot
      const res = await fetch('/api/agent/start', { method: 'POST' })
      if (!res.ok) {
        const detail = await res.text()
        throw new Error(`Runner ha risposto ${res.status}: ${detail}`)
      }
      setAgentStatus('saved')
      toast.success('Bot avviato con il prompt corrente ✅')
      setTimeout(() => setAgentStatus('idle'), 3000)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setStopError(msg)
      setAgentStatus('idle')
      toast.error('Impossibile avviare il bot', { description: msg })
    }
  }

  // ── Annulla modifiche ──────────────────────────────────────────────────────
  function handleCancel() {
    setPrompt(savedPrompt)
    setAgentStatus('idle')
    setStopError(null)
  }

  const isEditing  = agentStatus === 'editing'
  const isSaving   = agentStatus === 'saving'
  const isStarting = agentStatus === 'starting'
  const isBusy     = agentStatus === 'stopping' || isSaving || isStarting

  if (sessionStatus === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400 gap-2">
        <LoaderIcon className="size-5 animate-spin" />
        Caricamento...
      </div>
    )
  }

  const role = (session?.user as { role?: string })?.role
  if (role !== 'ADMIN') return null

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BotIcon className="size-6 text-blue-600" />
            Gestione Bot Vocale
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Modifica il prompt dell&apos;assistente — il bot viene fermato e riavviato automaticamente
          </p>
        </div>
        <AgentStatusPill status={agentStatus} />
      </div>

      {/* Card principale prompt */}
      <Card className="bg-white shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-base font-semibold text-gray-800">
              Prompt dell&apos;assistente
            </CardTitle>
            <div className="flex items-center gap-2">
              {!isEditing && agentStatus !== 'saved' && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleStart}
                    disabled={isBusy}
                    className="gap-1.5 text-green-700 border-green-300 hover:bg-green-50"
                  >
                    {isStarting
                      ? <LoaderIcon className="size-4 animate-spin" />
                      : <PlayCircleIcon className="size-4 text-green-600" />
                    }
                    {isStarting ? 'Avvio…' : 'Avvia bot'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleEdit}
                    disabled={isBusy}
                    className="gap-1.5"
                  >
                    {agentStatus === 'stopping'
                      ? <LoaderIcon className="size-4 animate-spin" />
                      : <StopCircleIcon className="size-4 text-orange-500" />
                    }
                    {agentStatus === 'stopping' ? 'Arresto…' : 'Modifica'}
                  </Button>
                </>
              )}
              {isEditing && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancel}
                    className="gap-1.5 text-gray-500"
                  >
                    <XCircleIcon className="size-4" />
                    Annulla
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={isSaving || !prompt.trim() || prompt.trim() === savedPrompt}
                    className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {isSaving
                      ? <LoaderIcon className="size-4 animate-spin" />
                      : <SaveIcon className="size-4" />
                    }
                    {isSaving ? 'Riavvio in corso…' : 'Salva e riavvia'}
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>

        <Separator />

        <CardContent className="pt-4">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            readOnly={!isEditing}
            rows={14}
            className={cn(
              'font-mono text-sm resize-y transition-colors',
              isEditing
                ? 'border-blue-300 focus-visible:ring-blue-400 bg-white'
                : 'bg-gray-50 text-gray-600 border-gray-200 cursor-default focus-visible:ring-0'
            )}
            placeholder="Il prompt apparirà qui…"
          />

          {!isEditing && (
            <p className="mt-2 text-xs text-gray-400 flex items-center gap-1">
              <PencilIcon className="size-3" />
              Clicca <strong className="text-gray-500">Modifica</strong> per abilitare la scrittura — il bot verrà fermato prima di procedere
            </p>
          )}

          {isEditing && prompt.trim() !== savedPrompt && (
            <p className="mt-2 text-xs text-amber-600 flex items-center gap-1">
              <PencilIcon className="size-3" />
              Hai modifiche non salvate
            </p>
          )}
        </CardContent>
      </Card>

      {/* Errore stop */}
      {stopError && (
        <Card className="border-red-200 bg-red-50 shadow-none">
          <CardContent className="p-4 flex items-start gap-3">
            <XCircleIcon className="size-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-700">Impossibile fermare il bot</p>
              <p className="text-xs text-red-500 mt-0.5 font-mono break-all">{stopError}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info box */}
      <Card className="border-blue-100 bg-blue-50/60 shadow-none">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <ShieldAlertIcon className="size-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800 space-y-1">
              <p className="font-semibold">Come funziona la modifica</p>
              <ol className="list-decimal list-inside space-y-0.5 text-blue-700">
                <li>Clicca <strong>Modifica</strong> — il bot si ferma automaticamente</li>
                <li>Modifica il testo del prompt nel campo di testo</li>
                <li>Clicca <strong>Salva e riavvia</strong> — il bot riparte con il nuovo prompt</li>
              </ol>
              <p className="text-xs text-blue-500 mt-2">
                Durante la modifica il bot non risponde alle chiamate. Completa la modifica nel minor tempo possibile.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  )
}
