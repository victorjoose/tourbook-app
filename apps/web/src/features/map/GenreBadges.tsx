import { genreLabel } from '@tour/core'
import { Badge } from '../../components/ui/Chip'
import { cn } from '../../lib/cn'

/** Genre pills; collapses the tail into "+n" when there are more than `max`. */
export function GenreBadges({ genres, max = 3, className }: { genres: readonly string[]; max?: number; className?: string }) {
  if (genres.length === 0) return null
  const visible = max > 0 ? genres.slice(0, max) : genres
  const rest = genres.length - visible.length
  return (
    <ul className={cn('flex flex-wrap gap-1', className)} aria-label="Gêneros">
      {visible.map((g) => (
        <li key={g}>
          <Badge className="bg-surface-2 text-ink-muted">{genreLabel(g)}</Badge>
        </li>
      ))}
      {rest > 0 && (
        <li>
          <Badge className="bg-surface-2 text-ink-muted" aria-label={`mais ${rest} gêneros`}>
            +{rest}
          </Badge>
        </li>
      )}
    </ul>
  )
}
