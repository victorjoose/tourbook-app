import { WEEKDAY_SHORT_PT, formatHours, formatKm, genreLabel, type CitySuggestion } from '@tour/core'
import { Briefcase, Building2, Check, ChevronDown, Users } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { Checkbox } from '../../../components/ui/Input'
import { cn } from '../../../lib/cn'
import type { SlotPick } from '../tourWizardStore'
import { plural } from '../../../lib/text'
export function SuggestionCard({ suggestion, onChoose }: { suggestion: CitySuggestion; onChoose: (pick: SlotPick) => void }) {
  const [expanded, setExpanded] = useState(false)
  const [venueId, setVenueId] = useState<string | null>(null)
  const [bandIds, setBandIds] = useState<string[]>([])
  const { city, venues, producers, bands, reasons, kmFromPrev, hoursFromPrev, kmToNext } = suggestion
  const hasDetails = venues.length > 0 || bands.length > 0

  function toggleBand(id: string) {
    setBandIds((ids) => (ids.includes(id) ? ids.filter((b) => b !== id) : [...ids, id]))
  }

  return (
    <div className={cn('rounded-xl border bg-surface p-3', suggestion.isEmpty ? 'border-surface-2 opacity-80' : 'border-surface-2')}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium">
            {city.name} <span className="text-ink-muted">{city.state}</span>
          </p>
          <p className="text-xs text-ink-muted">
            {formatKm(kmFromPrev)} · {formatHours(hoursFromPrev)}
            {kmToNext !== undefined && <> · {formatKm(kmToNext)} até a próxima</>}
          </p>
        </div>
        <Button size="sm" onClick={() => onChoose({ venueId, bandIds })}>
          Escolher
        </Button>
      </div>

      {reasons.length > 0 && (
        <ul className="mt-2 space-y-0.5 text-xs text-ink-muted">
          {reasons.map((reason, i) => (
            <li key={`${i}-${reason}`} className="flex gap-1.5">
              <Check className="mt-0.5 h-3 w-3 shrink-0 text-brand-300" aria-hidden />
              <span>{reason}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
        <span className="inline-flex items-center gap-1">
          <Building2 className="h-3.5 w-3.5" aria-hidden />
          {plural(venues.length, 'casa', 'casas')}
        </span>
        <span className="inline-flex items-center gap-1">
          <Briefcase className="h-3.5 w-3.5" aria-hidden />
          {plural(producers.length, 'produtora', 'produtoras')}
        </span>
        <span className="inline-flex items-center gap-1">
          <Users className="h-3.5 w-3.5" aria-hidden />
          {plural(bands.length, 'banda local', 'bandas locais')}
        </span>
        {hasDetails && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="ml-auto inline-flex items-center gap-1 text-brand-300 hover:text-brand-200"
          >
            {expanded ? 'Menos' : 'Escolher casa e bandas'}
            <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', expanded && 'rotate-180')} aria-hidden />
          </button>
        )}
      </div>

      {expanded && (
        <div className="mt-3 space-y-3 border-t border-surface-2 pt-3">
          {venues.length > 0 && (
            <fieldset className="space-y-1.5">
              <legend className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Casa</legend>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name={`venue-${city.id}`}
                  checked={venueId === null}
                  onChange={() => setVenueId(null)}
                  className="accent-brand-500"
                />
                Decidir depois
              </label>
              {venues.map((venue) => (
                <label key={venue.id} className="flex cursor-pointer items-start gap-2 text-sm">
                  <input
                    type="radio"
                    name={`venue-${city.id}`}
                    checked={venueId === venue.id}
                    onChange={() => setVenueId(venue.id)}
                    className="mt-1 accent-brand-500"
                  />
                  <span className="min-w-0">
                    <span className="block">{venue.name}</span>
                    <span className="block text-xs text-ink-muted">
                      {venue.capacity !== null && <>{venue.capacity} pessoas · </>}
                      {venue.showDays.length > 0
                        ? `Shows: ${venue.showDays.map((d) => WEEKDAY_SHORT_PT[d] ?? '').join(', ')}`
                        : 'Dias de show não informados'}
                    </span>
                  </span>
                </label>
              ))}
            </fieldset>
          )}

          {bands.length > 0 && (
            <fieldset className="space-y-1.5">
              <legend className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Bandas locais para convidar</legend>
              {bands.map((band) => (
                <Checkbox
                  key={band.id}
                  checked={bandIds.includes(band.id)}
                  onChange={() => toggleBand(band.id)}
                  label={
                    <span>
                      {band.name}
                      {band.genres.length > 0 && (
                        <span className="text-xs text-ink-muted"> · {band.genres.map(genreLabel).join(', ')}</span>
                      )}
                    </span>
                  }
                />
              ))}
            </fieldset>
          )}
        </div>
      )}
    </div>
  )
}
