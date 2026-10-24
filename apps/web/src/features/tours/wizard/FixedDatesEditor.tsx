import { formatDatePt, todayIso, type RegionData } from '@tour/core'
import { Lock, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { Input, Select } from '../../../components/ui/Input'
import { useRegionIndex } from '../../../hooks/useRegionData'
import { useTourWizardStore } from '../tourWizardStore'
import { SearchSelect } from '../../../components/ui/SearchSelect'
import { isIsoDate, venuesOfCity } from './slots'
import { cityLabel } from './text'

/** "Já tenho datas fechadas": date + city + optional venue. */
export function FixedDatesEditor({ data }: { data: RegionData }) {
  const fixedDates = useTourWizardStore((s) => s.fixedDates)
  const upsertFixedDate = useTourWizardStore((s) => s.upsertFixedDate)
  const removeFixedDate = useTourWizardStore((s) => s.removeFixedDate)
  const index = useRegionIndex(data)

  const [date, setDate] = useState('')
  const [cityId, setCityId] = useState<string | null>(null)
  const [venueId, setVenueId] = useState<string | null>(null)

  const cityOptions = useMemo(
    () => data.cities.map((c) => ({ id: c.id, label: c.name, sublabel: c.state })),
    [data.cities],
  )
  const venues = useMemo(() => (cityId ? venuesOfCity(data, cityId) : []), [data, cityId])
  const canAdd = isIsoDate(date) && cityId !== null
  const replacing = fixedDates.some((f) => f.date === date)

  function add() {
    if (!canAdd || !cityId) return
    upsertFixedDate({ date, cityId, venueId })
    setDate('')
    setCityId(null)
    setVenueId(null)
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-[10rem_1fr_1fr_auto] md:items-end">
        <Input
          label="Data"
          type="date"
          min={todayIso()}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <SearchSelect
          label="Cidade"
          placeholder="Buscar cidade…"
          options={cityOptions}
          value={cityId}
          onChange={(id) => {
            setCityId(id)
            setVenueId(null)
          }}
        />
        <Select
          label="Casa (opcional)"
          value={venueId ?? ''}
          disabled={!cityId}
          onChange={(e) => setVenueId(e.target.value || null)}
        >
          <option value="">{cityId ? (venues.length ? 'Sem casa definida' : 'Nenhuma casa cadastrada') : 'Escolha a cidade'}</option>
          {venues.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </Select>
        <Button variant="secondary" onClick={add} disabled={!canAdd}>
          <Plus className="h-4 w-4" aria-hidden />
          {replacing ? 'Substituir' : 'Adicionar'}
        </Button>
      </div>

      {fixedDates.length > 0 && (
        <ul className="divide-y divide-surface-2 rounded-xl border border-surface-2">
          {fixedDates.map((f) => {
            const city = index.cities.get(f.cityId)
            const venue = f.venueId ? index.venues.get(f.venueId) : undefined
            return (
              <li key={f.date} className="flex items-center gap-3 px-3 py-2 text-sm">
                <Lock className="h-4 w-4 shrink-0 text-brand-300" aria-hidden />
                <span className="w-24 shrink-0 text-ink-muted">{formatDatePt(f.date)}</span>
                <span className="min-w-0 flex-1 truncate">
                  {city ? cityLabel(city) : 'Cidade desconhecida'}
                  {venue && <span className="text-ink-muted"> · {venue.name}</span>}
                </span>
                <button
                  type="button"
                  aria-label={`Remover data fechada de ${formatDatePt(f.date)}`}
                  onClick={() => removeFixedDate(f.date)}
                  className="rounded-md p-1 text-ink-muted hover:bg-surface-2 hover:text-red-300"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
