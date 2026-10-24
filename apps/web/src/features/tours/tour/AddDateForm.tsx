import { useMutation, useQueryClient } from '@tanstack/react-query'
import { addDaysIso, addTourDate, type City, type TourDate } from '@tour/core'
import { CalendarPlus } from 'lucide-react'
import { useMemo, useState, type FormEvent, type Ref } from 'react'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Spinner } from '../../../components/ui/Spinner'
import { client } from '../../../lib/firebase'
import { SearchSelect } from '../../../components/ui/SearchSelect'
import { errorMessage } from '../../../lib/errorMessage'
import { isIsoDate, suggestNextDate } from './helpers'
import { invalidateTour } from './useTourDateMutations'

export type AddDateFormProps = {
  tourId: string
  dates: readonly TourDate[]
  cities: readonly City[]
  /** The <form>, so the page can scroll to it / focus the date input. */
  ref?: Ref<HTMLFormElement>
}

/** "Adicionar data": a date (defaults to the day after the last one) and an optional city. */
export function AddDateForm({ tourId, dates, cities, ref }: AddDateFormProps) {
  const queryClient = useQueryClient()
  const [date, setDate] = useState(() => suggestNextDate(dates))
  const [cityId, setCityId] = useState<string | null>(null)
  const [touched, setTouched] = useState(false)

  const cityOptions = useMemo(() => cities.map((c) => ({ id: c.id, label: c.name, sublabel: c.state })), [cities])
  const existing = useMemo(() => new Set(dates.map((d) => d.date)), [dates])
  const valid = isIsoDate(date)
  const duplicate = valid && existing.has(date)

  const add = useMutation({
    mutationFn: (input: { date: string; cityId: string | null }) =>
      addTourDate(client, tourId, { date: input.date, cityId: input.cityId }),
    onSuccess: async (_created, input) => {
      await invalidateTour(queryClient, tourId)
      setDate(addDaysIso(input.date, 1))
      setCityId(null)
      setTouched(false)
    },
  })

  function submit(e: FormEvent) {
    e.preventDefault()
    setTouched(true)
    if (!valid) return
    add.mutate({ date, cityId })
  }

  return (
    <form ref={ref} onSubmit={submit} className="rounded-2xl border border-dashed border-surface-3 bg-surface-1/60 p-4" noValidate>
      <h3 className="text-sm font-semibold">Adicionar data</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-[11rem_minmax(0,1fr)_auto] sm:items-end">
        <Input
          type="date"
          label="Dia"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          error={touched && !valid ? 'Informe uma data' : null}
          hint={duplicate ? 'Já existe uma data nesse dia' : undefined}
          required
        />
        <SearchSelect
          label="Cidade (opcional)"
          options={cityOptions}
          value={cityId}
          onChange={setCityId}
          placeholder="Deixe vazio para preencher depois"
          emptyText="Nenhuma cidade encontrada em SC, PR ou SP."
          disabled={add.isPending}
        />
        <Button type="submit" disabled={add.isPending || !valid}>
          {add.isPending ? <Spinner className="h-4 w-4 border-white/40 border-t-white" /> : <CalendarPlus className="h-4 w-4" aria-hidden />}
          Adicionar
        </Button>
      </div>
      {add.isError && (
        <p role="alert" className="mt-2 text-sm text-red-400">
          {errorMessage(add.error)}
        </p>
      )}
    </form>
  )
}
