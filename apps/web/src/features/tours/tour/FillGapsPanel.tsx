import {
  WEEKDAY_SHORT_PT,
  fillGaps,
  formatDatePt,
  formatHours,
  formatKm,
  type CitySuggestion,
  type RegionData,
  type TourDate,
  type TourWithDates,
} from '@tour/core'
import { Briefcase, Building2, CalendarCheck, Check, ChevronDown, MapPin, Users, Wand2, X } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { Button } from '../../../components/ui/Button'
import { Card, SectionTitle } from '../../../components/ui/Card'
import { EmptyState } from '../../../components/ui/EmptyState'
import { Spinner } from '../../../components/ui/Spinner'
import { cn } from '../../../lib/cn'
import { capitalize, plural } from '../../../lib/text'
import { errorMessage } from '../../../lib/errorMessage'
import {
  buildGapSlots,
  datesWithoutCity,
  startCityFor,
  suggestConstraintsOf,
  type RegionIndex,
  type ResolvedTourDate,
} from './helpers'
import { useUpdateTourDate, type DatePatchInput } from './useTourDateMutations'

export type FillGapsPanelProps = {
  tour: TourWithDates
  resolved: readonly ResolvedTourDate[]
  data: RegionData
  index: RegionIndex
  canEdit: boolean
  onClose: () => void
}

/** One suggested city for a gap, with an optional venue pick. */
function SuggestionRow({
  suggestion,
  canEdit,
  pending,
  onUse,
}: {
  suggestion: CitySuggestion
  canEdit: boolean
  pending: boolean
  onUse: (venueId: string | null) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [venueId, setVenueId] = useState<string | null>(null)
  const { city, venues, producers, bands, reasons, kmFromPrev, hoursFromPrev, kmToNext } = suggestion

  return (
    <div className={cn('rounded-xl border border-surface-2 bg-surface p-3', suggestion.isEmpty && 'opacity-80')}>
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
        {canEdit && (
          <Button size="sm" onClick={() => onUse(venueId)} disabled={pending}>
            {pending ? <Spinner className="h-3.5 w-3.5 border-white/40 border-t-white" /> : <MapPin className="h-3.5 w-3.5" aria-hidden />}
            Usar esta cidade
          </Button>
        )}
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
        {venues.length > 0 && canEdit && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="ml-auto inline-flex items-center gap-1 text-brand-300 hover:text-brand-200"
          >
            {expanded ? 'Menos' : venueId ? 'Trocar casa' : 'Escolher casa'}
            <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', expanded && 'rotate-180')} aria-hidden />
          </button>
        )}
      </div>

      {expanded && venues.length > 0 && (
        <fieldset className="mt-3 space-y-1.5 border-t border-surface-2 pt-3">
          <legend className="text-xs font-semibold tracking-wide text-ink-muted uppercase">Casa</legend>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input type="radio" name={`venue-${city.id}`} checked={venueId === null} onChange={() => setVenueId(null)} className="accent-brand-500" />
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
    </div>
  )
}

/**
 * "Preencher buracos": for each date without a city, the suggestion engine
 * (fillGaps) proposes cities from the previous filled city toward the next fixed one.
 */
export function FillGapsPanel({ tour, resolved, data, index, canEdit, onClose }: FillGapsPanelProps) {
  const update = useUpdateTourDate(tour.id)
  const gaps = useMemo(() => datesWithoutCity(tour.dates), [tour.dates])
  const startCity = useMemo(() => startCityFor(tour, index.cities, resolved), [tour, index.cities, resolved])
  const endCity = tour.endCityId ? (index.cities.get(tour.endCityId) ?? null) : null

  const suggestions = useMemo(() => {
    if (!startCity || gaps.length === 0) return new Map<string, CitySuggestion[]>()
    return fillGaps({
      slots: buildGapSlots(tour.dates),
      constraints: suggestConstraintsOf(tour),
      data,
      startCity,
      endCity,
    })
  }, [tour, gaps.length, data, startCity, endCity])

  function use(date: TourDate, suggestion: CitySuggestion, venueId: string | null) {
    const patch: DatePatchInput['patch'] = { cityId: suggestion.city.id }
    if (venueId) patch.venueId = venueId
    update.mutate({ dateId: date.id, patch })
  }

  const pendingFor = (dateId: string, cityId: string): boolean =>
    update.isPending && update.variables?.dateId === dateId && update.variables.patch.cityId === cityId

  let body: ReactNode
  if (tour.dates.length === 0) {
    body = (
      <EmptyState
        icon={<CalendarCheck className="h-8 w-8" aria-hidden />}
        title="Nenhuma data para preencher"
        description="Adicione datas à turnê; as que ficarem sem cidade aparecem aqui com sugestões."
        action={
          <Button variant="secondary" onClick={onClose}>
            Fechar
          </Button>
        }
      />
    )
  } else if (gaps.length === 0) {
    body = (
      <EmptyState
        icon={<CalendarCheck className="h-8 w-8" aria-hidden />}
        title="Todas as datas já têm cidade"
        description="Para pedir sugestões de novo, edite uma data e limpe a cidade dela."
        action={
          <Button variant="secondary" onClick={onClose}>
            Fechar
          </Button>
        }
      />
    )
  } else if (!startCity) {
    body = (
      <EmptyState
        icon={<MapPin className="h-8 w-8" aria-hidden />}
        title="Falta um ponto de partida"
        description="As sugestões partem da cidade de origem da turnê ou da primeira data com cidade. Defina a cidade de uma data para começar."
        action={
          <Button variant="secondary" onClick={onClose}>
            Fechar
          </Button>
        }
      />
    )
  } else {
    body = (
      <div className="space-y-5">
        <p className="text-xs text-ink-muted">
          {plural(gaps.length, 'data sem cidade', 'datas sem cidade')} · partindo de {startCity.name}/{startCity.state}
          {endCity && ` · terminando em ${endCity.name}/${endCity.state}`} · até {formatKm(tour.maxKmPerDay)} por dia
        </p>
        {gaps.map((date) => {
          const list = suggestions.get(date.date) ?? []
          const failed = update.isError && update.variables?.dateId === date.id
          return (
            <section key={date.id} className="space-y-2" aria-label={`Sugestões para ${formatDatePt(date.date, 'short')}`}>
              <h3 className="text-sm font-semibold">{capitalize(formatDatePt(date.date, 'short'))}</h3>
              {list.length === 0 ? (
                <p className="rounded-xl border border-dashed border-surface-3 px-3 py-2 text-sm text-ink-muted">
                  Nenhuma cidade dentro de {formatKm(tour.maxKmPerDay)} por dia que ainda chegue na próxima data. Aumente o limite
                  de km ou escolha a cidade manualmente ao editar a data.
                </p>
              ) : (
                <div className="space-y-2">
                  {list.map((s) => (
                    <SuggestionRow
                      key={s.city.id}
                      suggestion={s}
                      canEdit={canEdit}
                      pending={pendingFor(date.id, s.city.id)}
                      onUse={(venueId) => use(date, s, venueId)}
                    />
                  ))}
                </div>
              )}
              {failed && (
                <p role="alert" className="text-xs text-red-400">
                  {errorMessage(update.error, 'Não foi possível salvar a cidade.')}
                </p>
              )}
            </section>
          )
        })}
      </div>
    )
  }

  return (
    <Card className="space-y-4 border-brand-900/60">
      <div className="flex items-center justify-between gap-2">
        <SectionTitle className="inline-flex items-center gap-1.5">
          <Wand2 className="h-3.5 w-3.5" aria-hidden />
          Preencher buracos
        </SectionTitle>
        <button type="button" onClick={onClose} aria-label="Fechar sugestões" className="rounded-lg p-1 text-ink-muted hover:bg-surface-2 hover:text-ink">
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
      {body}
    </Card>
  )
}
