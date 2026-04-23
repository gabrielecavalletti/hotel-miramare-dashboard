import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const leadConfig = {
  HOT: { label: '🔥 Caldo', className: 'bg-red-100 text-red-800 border-red-200' },
  WARM: { label: '🌤️ Tiepido', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  COLD: { label: '❄️ Freddo', className: 'bg-blue-100 text-blue-800 border-blue-200' },
}

export function LeadBadge({ quality }: { quality: string }) {
  const cfg = leadConfig[quality as keyof typeof leadConfig] ?? {
    label: quality,
    className: '',
  }
  return (
    <Badge variant="outline" className={cn(cfg.className)}>
      {cfg.label}
    </Badge>
  )
}
