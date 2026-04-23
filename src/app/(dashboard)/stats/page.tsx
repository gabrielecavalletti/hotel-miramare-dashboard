'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { PhoneCallIcon, ClockIcon, TrendingUpIcon, CheckCircleIcon } from 'lucide-react'

interface StatsData {
  total: number
  totalMinutes: number
  avgMinutes: number
  conversionRate: number
  statusDistribution: { status: string; count: number }[]
  leadDistribution: { quality: string; count: number }[]
  callsByDay: { date: string; calls: number; minutes: number }[]
}

const DATE_RANGE_OPTIONS = [
  { value: 'today', label: 'Oggi' },
  { value: '7d', label: '7 giorni' },
  { value: 'month', label: 'Questo mese' },
  { value: '30d', label: '30 giorni' },
  { value: '3m', label: '3 mesi' },
]

const STATUS_LABELS: Record<string, string> = {
  NEW: 'Nuove',
  TO_CALL_BACK: 'Da richiamare',
  IN_PROGRESS: 'In lavorazione',
  CONFIRMED: 'Confermate',
  CANCELLED: 'Annullate',
  ARCHIVED: 'Archiviate',
}

const STATUS_COLORS: Record<string, string> = {
  NEW: '#3b82f6',
  TO_CALL_BACK: '#f97316',
  IN_PROGRESS: '#eab308',
  CONFIRMED: '#22c55e',
  CANCELLED: '#ef4444',
  ARCHIVED: '#9ca3af',
}

const LEAD_LABELS: Record<string, string> = {
  HOT: '🔥 Caldo',
  WARM: '🌤️ Tiepido',
  COLD: '❄️ Freddo',
}

const LEAD_COLORS: Record<string, string> = {
  HOT: '#ef4444',
  WARM: '#f59e0b',
  COLD: '#60a5fa',
}

function formatDay(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })
}

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ReactNode
  color: string
}

function StatCard({ title, value, subtitle, icon, color }: StatCardProps) {
  return (
    <Card className="bg-white shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
            {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
          </div>
          <div className={cn('p-2.5 rounded-xl', color)}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { color: string; name: string; value: number }[]; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
        <p className="font-medium text-gray-700 mb-1">{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }}>
            {p.name}: <span className="font-semibold">{p.value}</span>
          </p>
        ))}
      </div>
    )
  }
  return null
}

const PieTooltip = ({ active, payload }: { active?: boolean; payload?: { name: string; value: number; payload: { percent: number } }[] }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
        <p className="font-medium text-gray-700">{payload[0].name}</p>
        <p className="text-gray-600">
          {payload[0].value} chiamate ({(payload[0].payload.percent * 100).toFixed(0)}%)
        </p>
      </div>
    )
  }
  return null
}

export default function StatsPage() {
  const [data, setData] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('30d')

  const fetchStats = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/stats?dateRange=${dateRange}`)
      if (res.ok) setData(await res.json())
    } finally {
      setLoading(false)
    }
  }, [dateRange])

  useEffect(() => { fetchStats() }, [fetchStats])

  const statusData = data?.statusDistribution.map((s) => ({
    ...s,
    name: STATUS_LABELS[s.status] ?? s.status,
    fill: STATUS_COLORS[s.status] ?? '#9ca3af',
  })) ?? []

  const leadData = data?.leadDistribution.map((l) => ({
    ...l,
    name: LEAD_LABELS[l.quality] ?? l.quality,
    fill: LEAD_COLORS[l.quality] ?? '#9ca3af',
  })) ?? []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Statistiche</h1>
          <p className="text-sm text-gray-500 mt-0.5">Analisi delle chiamate ricevute dall&apos;assistente vocale</p>
        </div>

        {/* Date range pills */}
        <div className="flex items-center gap-2 flex-wrap">
          {DATE_RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setDateRange(opt.value)}
              className={cn(
                'px-3 py-1.5 rounded-full text-sm font-medium transition-colors border',
                dateRange === opt.value
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {loading && !data ? (
        <div className="flex items-center justify-center py-24 text-gray-400">
          Caricamento statistiche...
        </div>
      ) : data ? (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Chiamate ricevute"
              value={data.total}
              subtitle="nel periodo selezionato"
              icon={<PhoneCallIcon className="size-5 text-blue-600" />}
              color="bg-blue-50"
            />
            <StatCard
              title="Minuti totali"
              value={data.totalMinutes > 0 ? `${data.totalMinutes} min` : '—'}
              subtitle={data.totalMinutes > 0 ? 'durata cumulativa' : 'dati non ancora disponibili'}
              icon={<ClockIcon className="size-5 text-purple-600" />}
              color="bg-purple-50"
            />
            <StatCard
              title="Durata media"
              value={data.avgMinutes > 0 ? `${data.avgMinutes} min` : '—'}
              subtitle={data.avgMinutes > 0 ? 'per chiamata' : 'dati non ancora disponibili'}
              icon={<TrendingUpIcon className="size-5 text-orange-600" />}
              color="bg-orange-50"
            />
            <StatCard
              title="Tasso conversione"
              value={`${data.conversionRate}%`}
              subtitle="chiamate → prenotazioni confermate"
              icon={<CheckCircleIcon className="size-5 text-green-600" />}
              color="bg-green-50"
            />
          </div>

          {/* Andamento chiamate nel tempo */}
          {data.callsByDay.length > 0 && (
            <Card className="bg-white shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-gray-800">
                  Andamento chiamate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.callsByDay} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatDay}
                      tick={{ fontSize: 11, fill: '#9ca3af' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#9ca3af' }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="calls" name="Chiamate" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Durata per giorno (solo se ci sono dati) */}
          {data.callsByDay.some((d) => d.minutes > 0) && (
            <Card className="bg-white shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-gray-800">
                  Minuti di chiamata per giorno
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={data.callsByDay} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatDay}
                      tick={{ fontSize: 11, fill: '#9ca3af' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#9ca3af' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="minutes"
                      name="Minuti"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      dot={{ r: 3, fill: '#8b5cf6' }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Distribuzione: stato + lead */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Esiti / stati */}
            <Card className="bg-white shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-gray-800">
                  Distribuzione per esito
                </CardTitle>
              </CardHeader>
              <CardContent>
                {statusData.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">Nessun dato</p>
                ) : (
                  <div className="flex flex-col lg:flex-row items-center gap-4">
                    <ResponsiveContainer width={200} height={200}>
                      <PieChart>
                        <Pie
                          data={statusData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={85}
                          paddingAngle={2}
                          dataKey="count"
                        >
                          {statusData.map((entry, i) => (
                            <Cell key={i} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip content={<PieTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex-1 space-y-2 w-full">
                      {statusData
                        .sort((a, b) => b.count - a.count)
                        .map((s) => (
                          <div key={s.status} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.fill }} />
                              <span className="text-gray-700">{s.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-900">{s.count}</span>
                              <span className="text-gray-400 w-10 text-right">
                                {data.total > 0 ? `${Math.round((s.count / data.total) * 100)}%` : '0%'}
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Lead quality */}
            <Card className="bg-white shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-gray-800">
                  Qualità lead
                </CardTitle>
              </CardHeader>
              <CardContent>
                {leadData.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">Nessun dato</p>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={160}>
                      <BarChart
                        data={leadData}
                        layout="vertical"
                        margin={{ top: 0, right: 16, left: 8, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                        <XAxis
                          type="number"
                          tick={{ fontSize: 11, fill: '#9ca3af' }}
                          axisLine={false}
                          tickLine={false}
                          allowDecimals={false}
                        />
                        <YAxis
                          type="category"
                          dataKey="name"
                          tick={{ fontSize: 12, fill: '#6b7280' }}
                          axisLine={false}
                          tickLine={false}
                          width={90}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="count" name="Chiamate" radius={[0, 4, 4, 0]}>
                          {leadData.map((entry, i) => (
                            <Cell key={i} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="mt-3 flex gap-4 justify-center flex-wrap">
                      {leadData.map((l) => (
                        <div key={l.quality} className="flex items-center gap-1.5 text-sm">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: l.fill }} />
                          <span className="text-gray-600">{l.name}</span>
                          <span className="font-semibold text-gray-900">{l.count}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {data.totalMinutes === 0 && (
            <div className="rounded-xl border border-dashed border-blue-200 bg-blue-50/50 p-4 text-sm text-blue-700 text-center">
              I grafici sui minuti di chiamata appariranno quando n8n invierà il campo <code className="font-mono bg-blue-100 px-1 rounded">durationSeconds</code> nel payload webhook.
            </div>
          )}
        </>
      ) : null}
    </div>
  )
}
