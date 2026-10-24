import { boundsAround, boundsOf, type City, type RegionData } from '@tour/core'
import { useMemo } from 'react'
import { Checkbox } from '../../../components/ui/Input'
import { useRegionIndex } from '../../../hooks/useRegionData'
import { MapView, type MapStop } from '../../map/MapView'
import { useTourWizardStore } from '../tourWizardStore'
import { SearchSelect } from '../../../components/ui/SearchSelect'
import { effectiveEndCityId, tourFormErrors } from './validation'

export function StepStart({ data, showErrors }: { data: RegionData; showErrors: boolean }) {
  const state = useTourWizardStore()
  const setFields = useTourWizardStore((s) => s.setFields)
  const index = useRegionIndex(data)
  const errors = showErrors ? tourFormErrors(state) : {}

  const cityOptions = useMemo(
    () => data.cities.map((c) => ({ id: c.id, label: c.name, sublabel: c.state })),
    [data.cities],
  )

  const startCity = state.startCityId ? index.cities.get(state.startCityId) : undefined
  const endCityId = effectiveEndCityId(state)
  const endCity = endCityId ? index.cities.get(endCityId) : undefined

  const stops = useMemo<MapStop[]>(() => {
    const out: MapStop[] = []
    if (startCity) out.push({ id: 'start', lat: startCity.lat, lng: startCity.lng, label: 'P', title: `Partida: ${startCity.name}` })
    if (endCity && endCity.id !== startCity?.id) {
      out.push({ id: 'end', lat: endCity.lat, lng: endCity.lng, label: 'F', title: `Fim: ${endCity.name}`, color: '#3f3f46' })
    }
    return out
  }, [startCity, endCity])

  const fitTo = useMemo(() => {
    const points: City[] = []
    if (startCity) points.push(startCity)
    if (endCity && endCity.id !== startCity?.id) points.push(endCity)
    const first = points[0]
    if (!first) return null
    return points.length === 1 ? boundsAround(first, 120) : boundsOf(points)
  }, [startCity, endCity])

  return (
    <div className="space-y-6">
      <SearchSelect
        label="Cidade de partida"
        hint="De onde a banda sai. A primeira data começa aqui."
        placeholder="Buscar cidade…"
        options={cityOptions}
        value={state.startCityId}
        onChange={(startCityId) => setFields({ startCityId })}
        error={errors.startCityId}
      />

      <div className="space-y-3">
        <Checkbox
          label="Voltar para casa no fim (cidade final = partida)"
          checked={state.returnHome}
          onChange={(e) => setFields({ returnHome: e.target.checked })}
        />
        {!state.returnHome && (
          <SearchSelect
            label="Cidade final (opcional)"
            hint="Onde a turnê termina. Ajuda a puxar as sugestões nessa direção."
            placeholder="Buscar cidade…"
            options={cityOptions}
            value={state.endCityId}
            onChange={(endCityId) => setFields({ endCityId })}
            error={errors.endCityId}
          />
        )}
      </div>

      <div className="h-56 overflow-hidden rounded-2xl border border-surface-2 md:h-72">
        <MapView stops={stops} fitTo={fitTo} />
      </div>
    </div>
  )
}
