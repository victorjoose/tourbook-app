import {
  boundsAround,
  boundsOf,
  formatDatePt,
  formatHours,
  formatKm,
  formatPeriodPt,
  genreLabel,
  routeAlerts,
  routeTotals,
  type City,
  type RegionData,
} from '@tour/core'
import { AlertCircle, AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react'
import { useMemo } from 'react'
import { Card, SectionTitle } from '../../../components/ui/Card'
import { useRegionIndex } from '../../../hooks/useRegionData'
import { MapView, type MapStop } from '../../map/MapView'
import { useTourWizardStore } from '../tourWizardStore'
import { buildLegs, filledCount, routeStops } from './slots'
import { plural } from '../../../lib/text'
import { cityLabel } from './text'
import { effectiveEndCityId } from './validation'

export function StepReview({ data }: { data: RegionData }) {
  const state = useTourWizardStore()
  const index = useRegionIndex(data)
  const { slots, maxKmPerDay } = state

  const startCity = state.startCityId ? index.cities.get(state.startCityId) : undefined
  const endCityId = effectiveEndCityId(state)
  const endCity = endCityId ? index.cities.get(endCityId) : undefined

  const stops = useMemo(() => routeStops(slots, index.cities), [slots, index.cities])

  // Route points: start city (if the first stop is elsewhere) → stops → end city (if it differs from the last stop).
  const points = useMemo(() => {
    const out: Array<{ city: City; date: string | null }> = []
    const first = stops[0]
    const last = stops.at(-1)
    if (startCity && first && first.city.id !== startCity.id) out.push({ city: startCity, date: null })
    for (const stop of stops) out.push({ city: stop.city, date: stop.date })
    if (endCity && last && last.city.id !== endCity.id) out.push({ city: endCity, date: null })
    return out
  }, [stops, startCity, endCity])

  const legs = useMemo(() => buildLegs(points), [points])
  const totals = useMemo(() => routeTotals(points.map((p) => p.city)), [points])
  const alerts = useMemo(
    () => routeAlerts(slots.map((s) => ({ date: s.date, city: s.cityId ? (index.cities.get(s.cityId) ?? null) : null })), maxKmPerDay),
    [slots, index.cities, maxKmPerDay],
  )

  const mapStops = useMemo<MapStop[]>(() => {
    const out: MapStop[] = stops.map((stop, i) => ({
      id: stop.date,
      lat: stop.city.lat,
      lng: stop.city.lng,
      label: String(i + 1),
      title: `${formatDatePt(stop.date)} · ${stop.city.name}`,
    }))
    const first = stops[0]
    const last = stops.at(-1)
    if (startCity && first && first.city.id !== startCity.id) {
      out.unshift({ id: 'start', lat: startCity.lat, lng: startCity.lng, label: 'P', title: `Partida: ${startCity.name}`, color: '#3f3f46' })
    }
    if (endCity && last && last.city.id !== endCity.id) {
      out.push({ id: 'end', lat: endCity.lat, lng: endCity.lng, label: 'F', title: `Fim: ${endCity.name}`, color: '#3f3f46' })
    }
    return out
  }, [stops, startCity, endCity])

  const route = useMemo(() => points.map((p) => ({ lat: p.city.lat, lng: p.city.lng })), [points])
  const fitTo = useMemo(() => {
    const first = points[0]
    if (!first) return null
    const bounds = boundsOf(points.map((p) => p.city))
    if (!bounds || (bounds.minLat === bounds.maxLat && bounds.minLng === bounds.maxLng)) return boundsAround(first.city, 120)
    return bounds
  }, [points])

  const firstDate = slots[0]?.date
  const lastDate = slots.at(-1)?.date
  const uniqueCities = new Set(stops.map((s) => s.city.id)).size
  const errorCount = alerts.filter((a) => a.level === 'error').length

  return (
    <div className="space-y-6">
      <div className="h-64 overflow-hidden rounded-2xl border border-surface-2 md:h-80">
        <MapView stops={mapStops} route={route} fitTo={fitTo} />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Datas" value={String(slots.length)} detail={`${filledCount(slots)} com cidade`} />
        <Stat label="Cidades" value={String(uniqueCities)} detail={state.states.join(', ')} />
        <Stat label="Estrada" value={formatKm(totals.km)} detail={formatHours(totals.hours)} />
        <Stat label="Alertas" value={String(alerts.length)} detail={errorCount > 0 ? plural(errorCount, 'crítico', 'críticos') : 'nenhum crítico'} />
      </div>

      <Card className="space-y-2 text-sm">
        <SectionTitle>Turnê</SectionTitle>
        <p className="text-base font-semibold">{state.name || 'Sem nome'}</p>
        <p className="text-ink-muted">
          {state.bandName}
          {state.genres.length > 0 && <> · {state.genres.map(genreLabel).join(', ')}</>}
        </p>
        <p className="text-ink-muted">
          {firstDate && lastDate ? formatPeriodPt(firstDate, lastDate) : 'Sem datas'}
          {startCity && <> · Saída de {cityLabel(startCity)}</>}
          {endCity && endCity.id !== startCity?.id && <> · Fim em {cityLabel(endCity)}</>}
          {endCity && endCity.id === startCity?.id && <> · Volta para casa</>}
        </p>
        <p className="text-ink-muted">
          Até {formatKm(maxKmPerDay)} por dia
          {state.capacityMin !== null || state.capacityMax !== null ? (
            <> · Capacidade {state.capacityMin ?? '—'} a {state.capacityMax ?? '—'}</>
          ) : null}
          {state.allowOffDays ? ' · Dias livres permitidos' : ' · Sem dias livres'}
        </p>
      </Card>

      <section className="space-y-2">
        <SectionTitle>Trechos</SectionTitle>
        {legs.length === 0 ? (
          <Card className="text-sm text-ink-muted">Sem deslocamento entre cidades.</Card>
        ) : (
          <ul className="divide-y divide-surface-2 rounded-2xl border border-surface-2 bg-surface-1">
            {legs.map((leg, i) => (
              <li key={`${leg.from.id}-${leg.to.id}-${i}`} className="flex items-center gap-3 px-3 py-2 text-sm">
                <span className="min-w-0 flex-1 truncate">
                  {leg.from.name}
                  <ArrowRight className="mx-1.5 inline h-3.5 w-3.5 text-ink-muted" aria-hidden />
                  {leg.to.name}
                  {leg.toDate && <span className="text-ink-muted"> · {formatDatePt(leg.toDate)}</span>}
                </span>
                <span className={leg.km > maxKmPerDay ? 'font-medium text-red-300' : 'text-ink-muted'}>
                  {formatKm(leg.km)} · {formatHours(leg.hours)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <SectionTitle>Alertas</SectionTitle>
        {alerts.length === 0 ? (
          <Card className="flex items-center gap-2 text-sm text-emerald-200">
            <CheckCircle2 className="h-4 w-4" aria-hidden />
            Nenhum alerta: datas e trechos dentro do combinado.
          </Card>
        ) : (
          <ul className="space-y-2">
            {alerts.map((alert, i) => (
              <li
                key={`${alert.date}-${i}`}
                className={
                  alert.level === 'error'
                    ? 'flex items-start gap-2 rounded-xl border border-red-900 bg-red-950/40 px-3 py-2 text-sm text-red-100'
                    : 'flex items-start gap-2 rounded-xl border border-amber-900 bg-amber-950/40 px-3 py-2 text-sm text-amber-100'
                }
              >
                {alert.level === 'error' ? (
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                ) : (
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                )}
                <span>
                  <span className="font-medium">{formatDatePt(alert.date)}</span> · {alert.message}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <SectionTitle>Datas</SectionTitle>
        <ul className="divide-y divide-surface-2 rounded-2xl border border-surface-2 bg-surface-1">
          {slots.map((slot) => {
            const city = slot.cityId ? index.cities.get(slot.cityId) : undefined
            const venue = slot.venueId ? index.venues.get(slot.venueId) : undefined
            return (
              <li key={slot.date} className="flex items-center gap-3 px-3 py-2 text-sm">
                <span className="w-24 shrink-0 font-medium">{formatDatePt(slot.date)}</span>
                <span className="min-w-0 flex-1 truncate text-ink-muted">
                  {city ? cityLabel(city) : 'Sem cidade'}
                  {venue && <> · {venue.name}</>}
                  {slot.bandIds.length > 0 && <> · {plural(slot.bandIds.length, 'banda convidada', 'bandas convidadas')}</>}
                </span>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}

function Stat({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <Card className="p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">{label}</p>
      <p className="text-xl font-semibold">{value}</p>
      {detail && <p className="truncate text-xs text-ink-muted">{detail}</p>}
    </Card>
  )
}
