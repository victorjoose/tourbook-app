import { WEEKDAY_SHORT_PT, formatDatePt, todayIso, type RegionData } from '@tour/core'
import { CalendarPlus, Lock, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { Card, SectionTitle } from '../../../components/ui/Card'
import { Badge, Chip } from '../../../components/ui/Chip'
import { Field, Input } from '../../../components/ui/Input'
import { Tabs } from '../../../components/ui/Tabs'
import { useRegionIndex } from '../../../hooks/useRegionData'
import { MAX_COUNT, MAX_WEEKS, MIN_COUNT, MIN_WEEKS, useTourWizardStore } from '../tourWizardStore'
import { FixedDatesEditor } from './FixedDatesEditor'
import { describeDates, generatedDates, isIsoDate } from './slots'
import { stepIssues } from './validation'
import type { DateMode } from './types'

/** Monday-first order for the chips. */
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0]

const MODE_TABS: Array<{ value: DateMode; label: string }> = [
  { value: 'weeks', label: 'Padrão de semana' },
  { value: 'count', label: 'Quantidade' },
  { value: 'calendar', label: 'Calendário' },
]

const MODE_HELP: Record<DateMode, string> = {
  weeks: 'Escolha os dias da semana e por quantas semanas a turnê roda.',
  count: 'Escolha os dias da semana e quantas datas você quer no total.',
  calendar: 'Adicione cada data à mão.',
}

export function StepDates({ data, showErrors }: { data: RegionData; showErrors: boolean }) {
  const state = useTourWizardStore()
  const { setDateInputs, toggleWeekday, addCalendarDate, removeCalendarDate, removeSlot } = useTourWizardStore()
  const index = useRegionIndex(data)
  const [calendarInput, setCalendarInput] = useState('')

  const generated = generatedDates(state)
  const issues = showErrors ? stepIssues(state, 'dates') : []
  const startDateError = issues.find((m) => m.startsWith('Escolha a data'))
  const weekdaysError = issues.find((m) => m.includes('dia da semana'))

  const weekdayChips = (
    <Field label="Dias da semana" error={weekdaysError}>
      <div className="flex flex-wrap gap-2">
        {WEEKDAY_ORDER.map((d) => (
          <Chip key={d} active={state.weekdays.includes(d)} onClick={() => toggleWeekday(d)}>
            {WEEKDAY_SHORT_PT[d]}
          </Chip>
        ))}
      </div>
    </Field>
  )

  const startDateInput = (
    <Input
      label="Data de início"
      type="date"
      min={todayIso()}
      value={state.startDate}
      onChange={(e) => setDateInputs({ startDate: e.target.value })}
      error={startDateError}
    />
  )

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <Tabs items={MODE_TABS} value={state.dateMode} onChange={(dateMode) => setDateInputs({ dateMode })} />
        <p className="text-sm text-ink-muted">{MODE_HELP[state.dateMode]}</p>

        {state.dateMode === 'weeks' && (
          <div className="grid gap-4 md:grid-cols-2">
            {startDateInput}
            <Input
              label="Semanas"
              type="number"
              min={MIN_WEEKS}
              max={MAX_WEEKS}
              value={state.weeks}
              onChange={(e) => setDateInputs({ weeks: Number(e.target.value) })}
              hint={`De ${MIN_WEEKS} a ${MAX_WEEKS} semanas`}
            />
            <div className="md:col-span-2">{weekdayChips}</div>
          </div>
        )}

        {state.dateMode === 'count' && (
          <div className="grid gap-4 md:grid-cols-2">
            {startDateInput}
            <Input
              label="Quantidade de datas"
              type="number"
              min={MIN_COUNT}
              max={MAX_COUNT}
              value={state.count}
              onChange={(e) => setDateInputs({ count: Number(e.target.value) })}
              hint={`De ${MIN_COUNT} a ${MAX_COUNT} datas`}
            />
            <div className="md:col-span-2">{weekdayChips}</div>
          </div>
        )}

        {state.dateMode === 'calendar' && (
          <div className="space-y-3">
            <div className="flex items-end gap-2">
              <Input
                label="Adicionar data"
                type="date"
                min={todayIso()}
                value={calendarInput}
                onChange={(e) => setCalendarInput(e.target.value)}
                className="max-w-56"
              />
              <Button
                variant="secondary"
                disabled={!isIsoDate(calendarInput)}
                onClick={() => {
                  addCalendarDate(calendarInput)
                  setCalendarInput('')
                }}
              >
                <CalendarPlus className="h-4 w-4" aria-hidden />
                Adicionar
              </Button>
            </div>
            {state.calendarDates.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {state.calendarDates.map((d) => (
                  <Chip key={d} active onClick={() => removeCalendarDate(d)} aria-label={`Remover ${formatDatePt(d)}`}>
                    {formatDatePt(d)}
                    <Trash2 className="h-3 w-3" aria-hidden />
                  </Chip>
                ))}
              </div>
            )}
          </div>
        )}

        <p className="text-sm font-medium text-brand-200" aria-live="polite">
          {describeDates(generated)}
        </p>
      </section>

      <section className="space-y-3">
        <SectionTitle>Já tenho datas fechadas</SectionTitle>
        <p className="text-sm text-ink-muted">
          Shows já combinados entram como datas fixas: o assistente preenche os buracos entre elas.
        </p>
        <FixedDatesEditor data={data} />
      </section>

      <section className="space-y-3">
        <SectionTitle>Datas da turnê ({state.slots.length})</SectionTitle>
        {issues.length > 0 && !startDateError && !weekdaysError && (
          <p className="text-sm text-red-400" role="alert">
            {issues[0]}
          </p>
        )}
        {state.slots.length === 0 ? (
          <Card className="text-sm text-ink-muted">Nenhuma data ainda. Defina um padrão acima ou adicione datas fechadas.</Card>
        ) : (
          <ul className="divide-y divide-surface-2 rounded-2xl border border-surface-2 bg-surface-1">
            {state.slots.map((slot) => {
              const city = slot.cityId ? index.cities.get(slot.cityId) : undefined
              const venue = slot.venueId ? index.venues.get(slot.venueId) : undefined
              return (
                <li key={slot.date} className="flex items-center gap-3 px-3 py-2 text-sm">
                  <span className="w-24 shrink-0 font-medium">{formatDatePt(slot.date)}</span>
                  <span className="min-w-0 flex-1 truncate text-ink-muted">
                    {slot.fixed && city ? (
                      <>
                        {city.name} – {city.state}
                        {venue && <> · {venue.name}</>}
                      </>
                    ) : (
                      'A preencher'
                    )}
                  </span>
                  {slot.fixed && (
                    <Badge className="bg-brand-600/20 text-brand-200">
                      <Lock className="mr-1 h-3 w-3" aria-hidden />
                      Fechada
                    </Badge>
                  )}
                  <button
                    type="button"
                    aria-label={`Remover ${formatDatePt(slot.date)}`}
                    onClick={() => removeSlot(slot.date)}
                    className="rounded-md p-1 text-ink-muted hover:bg-surface-2 hover:text-red-300"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
