import type { City, Venue } from '@tour/core'
import { CalendarDays, Store, Users } from 'lucide-react'
import { Link } from 'react-router'
import { cn } from '../../lib/cn'
import { GenreBadges } from './GenreBadges'
import { cityLabel, showDaysLabel } from './filtering'

export type VenueCardProps = {
  venue: Venue
  city: City | undefined
  selected?: boolean
  className?: string
}

/** Compact row: name, city/UF, capacity, genres and show days. Links to the detail. */
export function VenueCard({ venue, city, selected = false, className }: VenueCardProps) {
  const days = showDaysLabel(venue.showDays)
  return (
    <Link
      to={`/casas/${venue.id}`}
      aria-current={selected ? 'page' : undefined}
      className={cn(
        'flex gap-3 rounded-xl border bg-surface-1 p-3 transition-colors hover:border-surface-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400',
        selected ? 'border-brand-500' : 'border-surface-2',
        className,
      )}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-600/15 text-brand-300">
        <Store className="h-5 w-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1 space-y-1">
        <span className="block truncate font-medium text-ink">{venue.name}</span>
        <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-ink-muted">
          {city && <span>{cityLabel(city)}</span>}
          {venue.capacity !== null && (
            <span className="inline-flex items-center gap-1">
              <Users className="h-3 w-3" aria-hidden />
              {venue.capacity.toLocaleString('pt-BR')}
            </span>
          )}
          {days && (
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3 w-3" aria-hidden />
              {days}
            </span>
          )}
        </span>
        <GenreBadges genres={venue.genres} />
      </span>
    </Link>
  )
}
