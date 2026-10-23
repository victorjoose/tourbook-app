import type { Band, City } from '@tour/core'
import { Guitar } from 'lucide-react'
import { Link } from 'react-router'
import { Badge } from '../../components/ui/Chip'
import { cn } from '../../lib/cn'
import { GenreBadges } from './GenreBadges'
import { cityLabel } from './filtering'

export type BandCardProps = {
  band: Band
  city: City | undefined
  className?: string
}

/** Compact row: name, base city, genres and the "opens for touring bands" badge. */
export function BandCard({ band, city, className }: BandCardProps) {
  return (
    <Link
      to={`/bandas/${band.id}`}
      className={cn(
        'flex gap-3 rounded-xl border border-surface-2 bg-surface-1 p-3 transition-colors hover:border-surface-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400',
        className,
      )}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-300">
        <Guitar className="h-5 w-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1 space-y-1">
        <span className="flex items-center gap-2">
          <span className="truncate font-medium text-ink">{band.name}</span>
          {band.opensForTouring && <Badge className="shrink-0 bg-emerald-900 text-emerald-100">Topa abrir show</Badge>}
        </span>
        <span className="block text-xs text-ink-muted">{city ? cityLabel(city) : 'Cidade não informada'}</span>
        <GenreBadges genres={band.genres} />
      </span>
    </Link>
  )
}
