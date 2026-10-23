import { PILOT_STATES, STATE_NAMES, formatKm } from '@tour/core'
import { Chip } from '../../../components/ui/Chip'
import { Checkbox, Field, Input } from '../../../components/ui/Input'
import { useTourWizardStore } from '../tourWizardStore'
import { tourFormErrors } from './validation'

const MIN_KM = 100
const MAX_KM = 1000
const KM_STEP = 25

function parseOptionalInt(value: string): number | null {
  if (value.trim() === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : null
}

export function StepConstraints({ showErrors }: { showErrors: boolean }) {
  const state = useTourWizardStore()
  const setFields = useTourWizardStore((s) => s.setFields)
  const errors = showErrors ? tourFormErrors(state) : {}

  function toggleState(uf: string) {
    setFields({ states: state.states.includes(uf) ? state.states.filter((s) => s !== uf) : [...state.states, uf] })
  }

  return (
    <div className="space-y-6">
      <Field
        label="Máximo de km por dia"
        hint="Cidades mais longe que isso da parada anterior saem das sugestões."
        error={errors.maxKmPerDay}
      >
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={MIN_KM}
            max={MAX_KM}
            step={KM_STEP}
            value={Math.min(MAX_KM, Math.max(MIN_KM, state.maxKmPerDay))}
            onChange={(e) => setFields({ maxKmPerDay: Number(e.target.value) })}
            aria-label="Máximo de km por dia"
            className="flex-1 accent-brand-500"
          />
          <Input
            type="number"
            min={MIN_KM}
            max={MAX_KM}
            step={KM_STEP}
            value={state.maxKmPerDay}
            onChange={(e) => setFields({ maxKmPerDay: Number(e.target.value) })}
            aria-label="Máximo de km por dia (número)"
            className="w-24 text-right"
          />
        </div>
        <p className="text-sm font-medium text-brand-200">{formatKm(state.maxKmPerDay)} por dia</p>
      </Field>

      <div className="grid gap-4 md:grid-cols-2">
        <Input
          label="Capacidade mínima"
          type="number"
          min={0}
          placeholder="Qualquer"
          value={state.capacityMin ?? ''}
          onChange={(e) => setFields({ capacityMin: parseOptionalInt(e.target.value) })}
          error={errors.capacityMin}
          hint="Pessoas. Deixe vazio para não filtrar."
        />
        <Input
          label="Capacidade máxima"
          type="number"
          min={0}
          placeholder="Qualquer"
          value={state.capacityMax ?? ''}
          onChange={(e) => setFields({ capacityMax: parseOptionalInt(e.target.value) })}
          error={errors.capacityMax}
        />
      </div>

      <Checkbox
        label="Permitir dias sem show entre as datas"
        checked={state.allowOffDays}
        onChange={(e) => setFields({ allowOffDays: e.target.checked })}
      />

      <Field label="Estados" hint="As sugestões ficam só nesses estados.">
        <div className="flex flex-wrap gap-2">
          {PILOT_STATES.map((uf) => (
            <Chip key={uf} active={state.states.includes(uf)} onClick={() => toggleState(uf)}>
              {uf} · {STATE_NAMES[uf] ?? uf}
            </Chip>
          ))}
        </div>
        {state.states.length === 0 && (
          <p className="text-xs text-amber-300">Sem estados marcados, todas as cidades da região entram nas sugestões.</p>
        )}
      </Field>
    </div>
  )
}
