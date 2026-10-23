import { formatDatePt, genreLabel, type City, type CitySuggestion, type RegionData } from '@tour/core'
import { Flag, Lock, RefreshCw, SkipForward, Trash2, Undo2 } from 'lucide-react'
import { useMemo } from 'react'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { Badge, Chip } from '../../../components/ui/Chip'
import { Select } from '../../../components/ui/Input'
import { cn } from '../../../lib/cn'
import type { SlotPick } from '../tourWizardStore'
import { SearchSelect, type SearchOption } from './SearchSelect'
import { bandsOfCity, venuesOfCity } from './slots'
import { SuggestionCard } from './SuggestionCard'
import { capitalize } from './text'
import type { WizardSlot } from './types'

export type SlotCardProps = {
  slot: WizardSlot
  index: number
  /** First slot sitting on the start city. */
  isStart: boolean
  city: City | null
  suggestions: CitySuggestion[]
  cityOptions: SearchOption[]
  data: RegionData
  onPickCity: (cityId: string, pick?: SlotPick) => void
  onSetVenue: (venueId: string | null) => void
  onToggleBand: (bandId: string) => void
  onSkip: () => void
  onUnlock: () => void
  onRemove: () => void
}

export function SlotCard({
  slot,
  index,
  isStart,
  city,
  suggestions,
  cityOptions,
  data,
  onPickCity,
  onSetVenue,
  onToggleBand,
  onSkip,
  onUnlock,
  onRemove,
}: SlotCardProps) {
  const venues = useMemo(() => (city ? venuesOfCity(data, city.id) : []), [data, city])
  const bands = useMemo(() => (city ? bandsOfCity(data, city.id) : []), [data, city])
  const filled = city !== null

  return (
    <Card className={cn('space-y-3', filled ? 'border-surface-3' : slot.skipped ? 'opacity-80' : 'border-brand-900/60')}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
              filled ? 'bg-brand-600 text-white' : 'bg-surface-2 text-ink-muted',
            )}
          >
            {index + 1}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{capitalize(formatDatePt(slot.date, 'long'))}</p>
            <p className="truncate text-xs text-ink-muted">
              {filled ? `${city.name} – ${city.state}` : slot.skipped ? 'Data pulada (fica na turnê sem cidade)' : 'Sem cidade ainda'}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-1">
          {isStart && (
            <Badge className="bg-emerald-900 text-emerald-100">
              <Flag className="mr-1 h-3 w-3" aria-hidden />
              Partida
            </Badge>
          )}
          {slot.fixed && (
            <Badge className="bg-brand-600/20 text-brand-200">
              <Lock className="mr-1 h-3 w-3" aria-hidden />
              Fechada
            </Badge>
          )}
          {slot.skipped && <Badge className="bg-surface-2 text-ink-muted">Pulada</Badge>}
        </div>
      </div>

      {filled && (
        <div className="space-y-3">
          <Select label="Casa" value={slot.venueId ?? ''} onChange={(e) => onSetVenue(e.target.value || null)}>
            <option value="">{venues.length > 0 ? 'Decidir depois' : 'Nenhuma casa cadastrada nesta cidade'}</option>
            {venues.map((venue) => (
              <option key={venue.id} value={venue.id}>
                {venue.name}
                {venue.capacity !== null ? ` · ${venue.capacity} pessoas` : ''}
                {!venue.acceptsTouringBands ? ' · não recebe bandas de fora' : ''}
              </option>
            ))}
          </Select>

          {bands.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-sm font-medium">Bandas locais para convidar</p>
              <div className="flex flex-wrap gap-2">
                {bands.map((band) => (
                  <Chip
                    key={band.id}
                    active={slot.bandIds.includes(band.id)}
                    onClick={() => onToggleBand(band.id)}
                    title={band.genres.map(genreLabel).join(', ')}
                  >
                    {band.name}
                  </Chip>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!filled && !slot.skipped && (
        <div className="space-y-3">
          {suggestions.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Sugestões</p>
              {suggestions.map((suggestion) => (
                <SuggestionCard
                  key={suggestion.city.id}
                  suggestion={suggestion}
                  onChoose={(pick) => onPickCity(suggestion.city.id, pick)}
                />
              ))}
            </div>
          ) : (
            <p className="rounded-xl bg-surface-2 p-3 text-sm text-ink-muted">
              Nenhuma cidade dentro do limite de km a partir da parada anterior. Aumente o limite nas restrições, pule esta
              data ou escolha uma cidade abaixo.
            </p>
          )}
          <SearchSelect
            label="Outra cidade…"
            placeholder="Buscar qualquer cidade"
            options={cityOptions}
            value={null}
            onChange={(id) => {
              if (id) onPickCity(id)
            }}
          />
        </div>
      )}

      <div className="flex flex-wrap gap-2 border-t border-surface-2 pt-3">
        {filled && !slot.fixed && (
          <Button variant="secondary" size="sm" onClick={onUnlock}>
            <RefreshCw className="h-4 w-4" aria-hidden />
            Trocar
          </Button>
        )}
        {!filled && !slot.skipped && (
          <Button variant="secondary" size="sm" onClick={onSkip}>
            <SkipForward className="h-4 w-4" aria-hidden />
            Pular
          </Button>
        )}
        {slot.skipped && (
          <Button variant="secondary" size="sm" onClick={onUnlock}>
            <Undo2 className="h-4 w-4" aria-hidden />
            Preencher
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={onRemove} className="ml-auto text-red-300 hover:text-red-200">
          <Trash2 className="h-4 w-4" aria-hidden />
          Remover data
        </Button>
      </div>
    </Card>
  )
}
