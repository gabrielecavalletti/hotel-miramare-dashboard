import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const statusConfig = {
  NEW: { label: 'Nuova', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  TO_CALL_BACK: { label: 'Da richiamare', className: 'bg-orange-100 text-orange-800 border-orange-200' },
  IN_PROGRESS: { label: 'In lavorazione', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  CONFIRMED: { label: 'Confermata', className: 'bg-green-100 text-green-800 border-green-200' },
  CANCELLED: { label: 'Annullata', className: 'bg-red-100 text-red-800 border-red-200' },
  ARCHIVED: { label: 'Archiviata', className: 'bg-gray-100 text-gray-600 border-gray-200' },
}

export function StatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status as keyof typeof statusConfig] ?? {
    label: status,
    className: '',
  }
  return (
    <Badge variant="outline" className={cn(cfg.className)}>
      {cfg.label}
    </Badge>
  )
}
