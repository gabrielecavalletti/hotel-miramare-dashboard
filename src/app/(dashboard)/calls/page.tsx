'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { StatusBadge } from '@/components/calls/StatusBadge'
import { LeadBadge } from '@/components/calls/LeadBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { RefreshCwIcon, SearchIcon, ChevronLeftIcon, ChevronRightIcon, PhoneIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Call {
  id: string
  receivedAt: string
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
  assignedTo: { name: string | null; email: string } | null
}

interface ApiResponse {
  calls: Call[]
  total: number
  page: number
  limit: number
  newCount: number
}

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'Tutti gli stati' },
  { value: 'NEW', label: 'Nuove' },
  { value: 'TO_CALL_BACK', label: 'Da richiamare' },
  { value: 'IN_PROGRESS', label: 'In lavorazione' },
  { value: 'CONFIRMED', label: 'Confermate' },
  { value: 'CANCELLED', label: 'Annullate' },
  { value: 'ARCHIVED', label: 'Archiviate' },
]

const LEAD_OPTIONS = [
  { value: 'ALL', label: 'Tutti i lead' },
  { value: 'HOT', label: '🔥 Caldo' },
  { value: 'WARM', label: '🌤️ Tiepido' },
  { value: 'COLD', label: '❄️ Freddo' },
]

const DATE_RANGE_OPTIONS = [
  { value: 'ALL', label: 'Sempre' },
  { value: 'today', label: 'Oggi' },
  { value: '7d', label: '7 giorni' },
  { value: 'month', label: 'Questo mese' },
]

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function CallsPage() {
  const router = useRouter()

  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('ALL')
  const [lead, setLead] = useState('ALL')
  const [dateRange, setDateRange] = useState('ALL')
  const [page, setPage] = useState(1)

  const fetchCalls = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (status && status !== 'ALL') params.append('status', status)
      if (lead && lead !== 'ALL') params.set('lead', lead)
      if (dateRange && dateRange !== 'ALL') params.set('dateRange', dateRange)
      params.set('page', String(page))

      const res = await fetch(`/api/calls?${params.toString()}`)
      if (res.ok) setData(await res.json())
    } finally {
      setLoading(false)
    }
  }, [search, status, lead, dateRange, page])

  useEffect(() => { fetchCalls() }, [fetchCalls])

  useEffect(() => {
    const interval = setInterval(fetchCalls, 30000)
    return () => clearInterval(interval)
  }, [fetchCalls])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setPage(1)
  }

  const totalPages = data ? Math.ceil(data.total / data.limit) : 1

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Chiamate</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {data
              ? `${data.total} chiamate${dateRange !== 'ALL' ? ' nel periodo selezionato' : ''} · ${data.newCount} nuove`
              : 'Caricamento...'}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchCalls}
          disabled={loading}
          className="gap-1.5"
        >
          <RefreshCwIcon className={`size-4 ${loading ? 'animate-spin' : ''}`} />
          Aggiorna
        </Button>
      </div>

      {/* Filters */}
      <Card className="bg-white shadow-sm">
        <CardContent className="p-4 space-y-3">
          {/* Date range pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Periodo:</span>
            {DATE_RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => { setDateRange(opt.value); setPage(1) }}
                className={cn(
                  'px-3 py-1 rounded-full text-sm font-medium transition-colors border',
                  dateRange === opt.value
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Search + status + lead */}
          <form onSubmit={handleSearch} className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-48">
              <div className="relative">
                <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                <Input
                  placeholder="Cerca per nome o telefono..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={status} onValueChange={(v) => { setStatus(v ?? 'ALL'); setPage(1) }}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Stato" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={lead} onValueChange={(v) => { setLead(v ?? 'ALL'); setPage(1) }}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Lead" />
              </SelectTrigger>
              <SelectContent>
                {LEAD_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="submit" size="sm">Cerca</Button>
          </form>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="bg-white shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 hover:bg-gray-50">
                  <TableHead className="w-36">Data</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="hidden sm:table-cell">Telefono</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead>Lead</TableHead>
                  <TableHead className="hidden md:table-cell">Tipo richiesta</TableHead>
                  <TableHead className="hidden lg:table-cell">Check-in</TableHead>
                  <TableHead className="hidden lg:table-cell">Assegnato a</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && !data ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-gray-400">
                      Caricamento...
                    </TableCell>
                  </TableRow>
                ) : data?.calls.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-gray-400">
                      Nessuna chiamata trovata nel periodo selezionato
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.calls.map((call) => (
                    <TableRow
                      key={call.id}
                      className="hover:bg-blue-50/30 cursor-pointer transition-colors"
                      onClick={() => router.push(`/calls/${call.id}`)}
                    >
                      <TableCell className="text-xs text-gray-500 whitespace-nowrap">
                        {formatDateTime(call.receivedAt)}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-gray-900">{call.customerName}</div>
                        {call.requestType && (
                          <div className="text-xs text-gray-400">{call.requestType}</div>
                        )}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <a
                          href={`tel:${call.customerPhone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
                        >
                          <PhoneIcon className="size-3" />
                          {call.customerPhone}
                        </a>
                      </TableCell>
                      <TableCell><StatusBadge status={call.status} /></TableCell>
                      <TableCell><LeadBadge quality={call.leadQuality} /></TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-gray-600">
                        {call.requestType || '—'}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-gray-600">
                        {formatDate(call.checkIn)}
                        {call.nights ? ` · ${call.nights}n` : ''}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-gray-500">
                        {call.assignedTo?.name ?? call.assignedTo?.email ?? '—'}
                      </TableCell>
                      <TableCell>
                        <span className="text-gray-300 text-lg">›</span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>

        {data && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Pagina {page} di {totalPages} · {data.total} risultati
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon-sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeftIcon className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRightIcon className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
