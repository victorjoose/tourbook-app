import { fillGaps, formatHours, formatKm, routeTotals, type RegionData, type SuggestConstraints } from '@tour/core'
import { CalendarCheck, MapPin, Route } from 'lucide-react'
import { useMemo } from 'react'
import { Card } from '../../../components/ui/Card'
import { EmptyState } from '../../../components/ui/EmptyState'
import { useRegionIndex } from '../../../hooks/useRegionData'
import { useTourWizardStore } from '../tourWizardStore'
import { SlotCard } from './SlotCard'
import { filledCount, routeStops, toGapSlots } from './slots'
import { plural } from '../../../lib/text'
import { effectiveEndCityId, stepIssues } from './validation'

export function StepFill({ data, showErrors, onGoToStep }: { data: RegionData; showErrors: boolean; onGoToStep: (step: number) => void }) {
  const state = useTourWizardStore()
  const { pickCity, setSlotVenue, toggleSlotBand, skipSlot, unlockSlot, removeSlot } = useTourWizardStore()
  const index = useRegionIndex(data)

  const startCity = state.startCityId ? index.cities.get(state.startCityId) : undefined
  const endCityId = effectiveEndCityId(state)
  const endCity = endCityId ? index.cities.get(endCityId) : undefined

  const { slots, maxKmPerDay, genres, capacityMin, capacityMax, states } = state

  const suggestions = useMemo(() => {
    if (!startCity) return new Map<string, never[]>()
    const constraints: SuggestConstraints = { maxKmPerDay, genres, capacityMin, capacityMax, states }
    return fillGaps({ slots: toGapSlots(slots), constraints, data, startCity, endCity: endCity ?? null })
  }, [slots, maxKmPerDay, genres, capacityMin, capacityMax, states, data, startCity, endCity])

  const cityOptions = useMemo(
    () => data.cities.map((c) => ({ id: c.id, label: c.name, sublabel: c.state })),
    [data.cities],
  )

  const stops = useMemo(() => routeStops(slots, index.cities), [slots, index.cities])
  const totals = useMemo(() => routeTotals(stops.map((s) => s.city)), [stops])
  const filled = filledCount(slots)
  const issues = showErrors ? stepIssues(state, 'fill') : []

  if (!startCity) {
    return (
      <EmptyState
        icon={<MapPin className="h-8 w-8" aria-hidden />}
        title="Falta a cidade de partida"
        description="As sugestões partem dela. Escolha a cidade de partida para continuar."
        action={
          <button type="button" onClick={() => onGoToStep(2)} className="text-sm text-brand-300 underline">
            Escolher cidade de partida
          </button>
        }
      />
    )
  }

  if (slots.length === 0) {
    return (
      <EmptyState
        icon={<CalendarCheck className="h-8 w-8" aria-hidden />}
        title="Nenhuma data para preencher"
        description="Volte ao passo de datas e defina quando a turnê acontece."
        action={
          <button type="button" onClick={() => onGoToStep(1)} className="text-sm text-brand-300 underline">
            Ir para as datas
          </button>
        }
      />
    )
  }

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <span className="inline-flex items-center gap-2">
          <CalendarCheck className="h-4 w-4 text-brand-300" aria-hidden />
          <strong>{filled}</strong> de {plural(slots.length, 'data preenchida', 'datas preenchidas')}
        </span>
        <span className="inline-flex items-center gap-2 text-ink-muted">
          <Route className="h-4 w-4 text-brand-300" aria-hidden />
          {formatKm(totals.km)} · {formatHours(totals.hours)} na estrada
        </span>
        <span className="text-ink-muted">Limite: {formatKm(maxKmPerDay)} por dia</span>
      </Card>

      {issues.length > 0 && (
        <p className="text-sm text-red-400" role="alert">
          {issues[0]}
        </p>
      )}

      <ol className="space-y-3">
        {slots.map((slot, i) => {
          const city = slot.cityId ? (index.cities.get(slot.cityId) ?? null) : null
          return (
            <li key={slot.date}>
              <SlotCard
                slot={slot}
                index={i}
                isStart={i === 0 && city !== null && city.id === startCity.id}
                city={city}
                suggestions={suggestions.get(slot.date) ?? []}
                cityOptions={cityOptions}
                data={data}
                onPickCity={(cityId, pick) => pickCity(slot.date, cityId, pick)}
                onSetVenue={(venueId) => setSlotVenue(slot.date, venueId)}
                onToggleBand={(bandId) => toggleSlotBand(slot.date, bandId)}
                onSkip={() => skipSlot(slot.date)}
                onUnlock={() => unlockSlot(slot.date)}
                onRemove={() => removeSlot(slot.date)}
              />
            </li>
          )
        })}
      </ol>
    </div>
  )
}
