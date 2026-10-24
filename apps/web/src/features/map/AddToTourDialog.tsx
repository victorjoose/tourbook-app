import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  TOUR_DATE_STATUS_COLORS,
  TOUR_DATE_STATUS_LABELS,
  addTourDate,
  fetchMyTours,
  fetchTour,
  formatDatePt,
  formatPeriodPt,
  updateTourDate,
  type TourDate,
  type Venue,
} from '@tour/core'
import { CalendarPlus, CircleCheck } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { queryKeys } from '../../app/queryClient'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Chip'
import { Dialog } from '../../components/ui/Dialog'
import { EmptyState, ErrorState } from '../../components/ui/EmptyState'
import { Input } from '../../components/ui/Input'
import { Spinner } from '../../components/ui/Spinner'
import { useRegionData, useRegionIndex } from '../../hooks/useRegionData'
import { cn } from '../../lib/cn'
import { errorMessage } from '../../lib/errorMessage'
import { client } from '../../lib/firebase'
import { plural } from '../../lib/text'
export type AddToTourDialogProps = {
  venue: Venue
  open: boolean
  onClose: () => void
}

const NEW_DATE = 'new'
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const NO_DATES: TourDate[] = []

type SaveInput = { tourId: string; dateId: string | null; date: string; clearProducer: boolean }

/** Pick one of my tours, then an existing date (or a new one) to put this venue in. */
export function AddToTourDialog({ venue, open, onClose }: AddToTourDialogProps) {
  const queryClient = useQueryClient()
  const region = useRegionData()
  const index = useRegionIndex(region.data)

  const [tourId, setTourId] = useState<string | null>(null)
  /** null = untouched (use the default choice); otherwise a tour_date id or NEW_DATE. */
  const [dateChoice, setDateChoice] = useState<string | null>(null)
  const [newDate, setNewDate] = useState('')
  const [saved, setSaved] = useState<{ tourId: string; label: string } | null>(null)

  const toursQuery = useQuery({
    queryKey: queryKeys.tours,
    queryFn: () => fetchMyTours(client),
    enabled: open,
  })

  const tourQuery = useQuery({
    queryKey: queryKeys.tour(tourId ?? ''),
    queryFn: () => fetchTour(client, tourId ?? ''),
    enabled: open && tourId !== null,
  })

  const dates: TourDate[] = tourQuery.data?.dates ?? NO_DATES
  // Default to the first date still without a venue (a gap), otherwise a new date.
  const defaultChoice = dates.find((d) => d.venueId === null)?.id ?? NEW_DATE
  const choice = dateChoice ?? defaultChoice
  const existingDates = useMemo(() => new Set(dates.map((d) => d.date)), [dates])
  const newDateDuplicate = choice === NEW_DATE && ISO_DATE.test(newDate) && existingDates.has(newDate)
  const newDateInvalid = choice === NEW_DATE && (!ISO_DATE.test(newDate) || newDateDuplicate)
  const canSave = tourId !== null && tourQuery.isSuccess && !newDateInvalid

  const mutation = useMutation({
    mutationFn: async (input: SaveInput) => {
      if (input.dateId) {
        await updateTourDate(client, input.tourId, input.dateId, {
          venueId: venue.id,
          cityId: venue.cityId,
          // A produtora da data continua só se também atende a cidade da casa escolhida.
          ...(input.clearProducer ? { producerId: null } : {}),
        })
      } else {
        await addTourDate(client, input.tourId, {
          date: input.date,
          cityId: venue.cityId,
          venueId: venue.id,
          status: 'ideia',
        })
      }
      return input
    },
    onSuccess: async (input) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.tours }),
        queryClient.invalidateQueries({ queryKey: queryKeys.tour(input.tourId) }),
      ])
      setSaved({ tourId: input.tourId, label: formatDatePt(input.date, 'short') })
    },
  })

  function handleSave() {
    if (!tourId || !canSave) return
    const existing = choice === NEW_DATE ? null : dates.find((d) => d.id === choice)
    if (choice !== NEW_DATE && !existing) return
    const producer = existing?.producerId ? index.producers.get(existing.producerId) : undefined
    const clearProducer = !!existing?.producerId && !(producer?.cityIds.includes(venue.cityId) ?? false)
    mutation.mutate({ tourId, dateId: existing?.id ?? null, date: existing?.date ?? newDate, clearProducer })
  }

  const selectedTour = toursQuery.data?.find((t) => t.id === tourId)

  let body: ReactNode
  if (saved) {
    body = (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <CircleCheck className="h-10 w-10 text-emerald-400" aria-hidden />
        <p className="font-medium">Casa adicionada à turnê</p>
        <p className="max-w-xs text-sm text-ink-muted">
          {venue.name} entrou em <span className="text-ink">{selectedTour?.name ?? 'sua turnê'}</span> na data {saved.label}.
        </p>
        <div className="flex flex-wrap justify-center gap-2 pt-2">
          <Link
            to={`/turnes/${saved.tourId}`}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400"
          >
            Abrir turnê
          </Link>
          <Button variant="secondary" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    )
  } else if (toursQuery.isPending) {
    body = (
      <div className="flex justify-center py-10">
        <Spinner className="h-7 w-7" />
      </div>
    )
  } else if (toursQuery.isError) {
    body = <ErrorState message={errorMessage(toursQuery.error)} onRetry={() => void toursQuery.refetch()} />
  } else if (toursQuery.data.length === 0) {
    body = (
      <EmptyState
        icon={<CalendarPlus className="h-8 w-8" aria-hidden />}
        title="Você ainda não tem turnês"
        description="Crie uma turnê para começar a encaixar casas nas datas."
        action={
          <Link
            to="/turnes/nova"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-500"
          >
            Criar turnê
          </Link>
        }
      />
    )
  } else {
    body = (
      <div className="space-y-5">
        <fieldset className="space-y-2">
          <legend className="pb-1 text-sm font-medium">Turnê</legend>
          {toursQuery.data.map((tour) => {
            const period =
              tour.firstDate && tour.lastDate ? formatPeriodPt(tour.firstDate, tour.lastDate) : 'Sem datas ainda'
            const active = tour.id === tourId
            return (
              <label
                key={tour.id}
                className={cn(
                  'flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors',
                  active ? 'border-brand-500 bg-brand-600/10' : 'border-surface-2 bg-surface-1 hover:border-surface-3',
                )}
              >
                <input
                  type="radio"
                  name="tour"
                  value={tour.id}
                  checked={active}
                  onChange={() => {
                    setTourId(tour.id)
                    setDateChoice(null)
                    mutation.reset()
                  }}
                  className="mt-1 h-4 w-4 accent-brand-500"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{tour.name}</span>
                  <span className="block text-xs text-ink-muted">
                    {tour.bandName} · {period} · {plural(tour.dateCount, 'data', 'datas')}
                  </span>
                </span>
              </label>
            )
          })}
        </fieldset>

        {tourId !== null && (
          <fieldset className="space-y-2">
            <legend className="pb-1 text-sm font-medium">Data</legend>
            {tourQuery.isPending ? (
              <div className="flex justify-center py-4">
                <Spinner />
              </div>
            ) : tourQuery.isError ? (
              <ErrorState message={errorMessage(tourQuery.error)} onRetry={() => void tourQuery.refetch()} />
            ) : (
              <>
                {dates.map((d) => {
                  const active = choice === d.id
                  const currentVenue = d.venueId ? index.venues.get(d.venueId) : undefined
                  const currentCity = d.cityId ? index.cities.get(d.cityId) : undefined
                  const place = currentVenue?.name ?? currentCity?.name ?? 'Sem cidade'
                  const replaces = currentVenue !== undefined && currentVenue.id !== venue.id
                  return (
                    <label
                      key={d.id}
                      className={cn(
                        'flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors',
                        active ? 'border-brand-500 bg-brand-600/10' : 'border-surface-2 bg-surface-1 hover:border-surface-3',
                      )}
                    >
                      <input
                        type="radio"
                        name="tour-date"
                        value={d.id}
                        checked={active}
                        onChange={() => setDateChoice(d.id)}
                        className="h-4 w-4 accent-brand-500"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium capitalize">{formatDatePt(d.date, 'short')}</span>
                        <span className="block truncate text-xs text-ink-muted">
                          {place}
                          {replaces && <span className="text-amber-300"> · vai substituir a casa atual</span>}
                        </span>
                      </span>
                      <Badge className={TOUR_DATE_STATUS_COLORS[d.status]}>{TOUR_DATE_STATUS_LABELS[d.status]}</Badge>
                    </label>
                  )
                })}

                <label
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors',
                    choice === NEW_DATE ? 'border-brand-500 bg-brand-600/10' : 'border-surface-2 bg-surface-1 hover:border-surface-3',
                  )}
                >
                  <input
                    type="radio"
                    name="tour-date"
                    value={NEW_DATE}
                    checked={choice === NEW_DATE}
                    onChange={() => setDateChoice(NEW_DATE)}
                    className="h-4 w-4 accent-brand-500"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">Nova data</span>
                    <span className="block text-xs text-ink-muted">Cria uma data com status "Ideia" nessa casa.</span>
                  </span>
                </label>

                {choice === NEW_DATE && (
                  <Input
                    type="date"
                    label="Dia do show"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    onFocus={() => setDateChoice(NEW_DATE)}
                    error={newDateDuplicate ? 'Essa data já está na turnê — selecione ela na lista acima.' : null}
                    required
                  />
                )}
              </>
            )}
          </fieldset>
        )}

        {mutation.isError && (
          <p role="alert" className="text-sm text-red-400">
            {errorMessage(mutation.error)}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!canSave || mutation.isPending}>
            {mutation.isPending ? <Spinner className="h-4 w-4 border-white/40 border-t-white" /> : <CalendarPlus className="h-4 w-4" aria-hidden />}
            Adicionar
          </Button>
        </div>
      </div>
    )
  }

  return (
    <Dialog open={open} onClose={onClose} title={`Adicionar ${venue.name} a uma turnê`} className="w-[min(92vw,34rem)]">
      {body}
    </Dialog>
  )
}
