import type { Producer } from '@tour/core'
import { Mic, Store } from 'lucide-react'
import { Link } from 'react-router'
import { cn } from '../../lib/cn'
import { GenreBadges } from './GenreBadges'
import { type CityIndex, plural } from './filtering'

export type ProducerCardProps = {
  producer: Producer
  cities: CityIndex
  className?: string
}

/** Compact row: name, cities served, venues count and genres. Links to the detail. */
export function ProducerCard({ producer, cities, className }: ProducerCardProps) {
  const names = producer.cityIds
    .map((id) => cities.get(id)?.name)
    .filter((n): n is string => typeof n === 'string')
    .sort((a, b) => a.localeCompare(b, 'pt-BR'))
  const shown = names.slice(0, 2)
  const rest = names.length - shown.length
  const citiesLabel = shown.length > 0 ? `${shown.join(', ')}${rest > 0 ? ` +${rest}` : ''}` : 'Cidades não informadas'

  return (
    <Link
      to={`/produtoras/${producer.id}`}
      className={cn(
        'flex gap-3 rounded-xl border border-surface-2 bg-surface-1 p-3 transition-colors hover:border-surface-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400',
        className,
      )}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-500/15 text-sky-300">
        <Mic className="h-5 w-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1 space-y-1">
        <span className="block truncate font-medium text-ink">{producer.name}</span>
        <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-ink-muted">
          <span className="truncate">{citiesLabel}</span>
          {producer.venueIds.length > 0 && (
            <span className="inline-flex items-center gap-1">
              <Store className="h-3 w-3" aria-hidden />
              {plural(producer.venueIds.length, 'casa', 'casas')}
            </span>
          )}
        </span>
        <GenreBadges genres={producer.genres} />
      </span>
    </Link>
  )
}
