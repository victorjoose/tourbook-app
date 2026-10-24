import { useQuery } from '@tanstack/react-query'
import { boundsOf, fetchTour, type Bounds, type LatLng, type RegionData, type TourDate, type TourWithDates } from '@tour/core'
import { CalendarPlus, CalendarX } from 'lucide-react'
import { Fragment, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import { queryKeys } from '../../app/queryClient'
import { useAuth } from '../../auth/AuthProvider'
import { Button } from '../../components/ui/Button'
import { EmptyState, ErrorState } from '../../components/ui/EmptyState'
import { FullScreenSpinner } from '../../components/ui/Spinner'
import { useRegionData, useRegionIndex } from '../../hooks/useRegionData'
import { client } from '../../lib/firebase'
import { MapView } from '../map/MapView'
import { AddDateForm } from './tour/AddDateForm'
import { DateCard, LegConnector } from './tour/DateCard'
import { DateEditorDialog } from './tour/DateEditorDialog'
import { FillGapsPanel } from './tour/FillGapsPanel'
import { FinanceSummary } from './tour/FinanceSummary'
import { RouteAlerts } from './tour/RouteAlerts'
import { RouteTotals } from './tour/RouteTotals'
import { TourHeader } from './tour/TourHeader'
import { errorMessage } from '../../lib/errorMessage'
import {
  canEditTour,
  isTourOwner,
  legsBetween,
  resolveDates,
  routePoints,
  sameBounds,
  stopMarkers,
  type RegionIndex,
} from './tour/helpers'
const backLinkClass =
  'inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-medium text-white transition-colors hover:bg-brand-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400'

/**
 * Bounds of the route, keeping the same object while the values do not change, so
 * the map only re-fits when a stop actually moves (not on every status change).
 * Uses the "adjust state during render" pattern instead of an effect.
 */
function useStableBounds(points: LatLng[]): Bounds | null {
  const next = useMemo(() => boundsOf(points), [points])
  const [bounds, setBounds] = useState<Bounds | null>(next)
  if (!sameBounds(bounds, next)) {
    setBounds(next)
    return next
  }
  return bounds
}

/** Working dashboard of a tour: timeline of dates on the left, map + totals on the right. */
export default function TourPage() {
  const { id = '' } = useParams()
  const { user } = useAuth()
  const tourQuery = useQuery({
    queryKey: queryKeys.tour(id),
    queryFn: () => fetchTour(client, id),
    enabled: id !== '',
  })
  const region = useRegionData()
  const index = useRegionIndex(region.data)

  if (id === '' || tourQuery.data === null) {
    return (
      <EmptyState
        icon={<CalendarX className="h-8 w-8" aria-hidden />}
        title="Turnê não encontrada"
        description="Ela pode ter sido excluída ou você não tem acesso a ela."
        action={
          <Link to="/turnes" className={backLinkClass}>
            Minhas turnês
          </Link>
        }
      />
    )
  }
  if (tourQuery.isPending || region.isPending) return <FullScreenSpinner label="Carregando turnê…" />
  if (tourQuery.isError) return <ErrorState message={errorMessage(tourQuery.error, 'Não deu para carregar a turnê.')} onRetry={() => void tourQuery.refetch()} />
  if (region.isError) {
    return <ErrorState message={errorMessage(region.error, 'Não deu para carregar cidades e casas.')} onRetry={() => void region.refetch()} />
  }

  return <TourDashboard tour={tourQuery.data} data={region.data} index={index} userId={user?.id} />
}

function TourDashboard({ tour, data, index, userId }: { tour: TourWithDates; data: RegionData; index: RegionIndex; userId: string | undefined }) {
  const canEdit = canEditTour(tour, userId)
  const isOwner = isTourOwner(tour, userId)
  const [fillOpen, setFillOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const addFormRef = useRef<HTMLFormElement>(null)

  const resolved = useMemo(() => resolveDates(tour.dates, index), [tour.dates, index])
  const legs = useMemo(() => legsBetween(resolved), [resolved])
  const stops = useMemo(() => stopMarkers(resolved), [resolved])
  const route = useMemo(() => routePoints(resolved), [resolved])
  const bounds = useStableBounds(route)
  const editingDate: TourDate | null = editingId ? (tour.dates.find((d) => d.id === editingId) ?? null) : null

  function focusAddForm() {
    const form = addFormRef.current
    form?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    form?.querySelector<HTMLInputElement>('input[type="date"]')?.focus()
  }

  const sideCards = (
    <>
      <RouteTotals resolved={resolved} />
      <FinanceSummary dates={tour.dates} />
      <RouteAlerts resolved={resolved} maxKmPerDay={tour.maxKmPerDay} />
    </>
  )

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-6xl px-4 py-4 md:py-6">
        <TourHeader tour={tour} canEdit={canEdit} isOwner={isOwner} fillOpen={fillOpen} onToggleFill={() => setFillOpen((v) => !v)} />

        <div className="mt-4 md:mt-6 md:grid md:grid-cols-[minmax(0,1fr)_minmax(20rem,24rem)] md:gap-6">
          {/* Map (first on mobile, sticky right column on desktop) */}
          <aside className="md:order-2">
            <div className="space-y-4 md:sticky md:top-0">
              <div className="h-64 overflow-hidden rounded-2xl border border-surface-2 md:h-[22rem]">
                <MapView stops={stops} route={route} fitTo={bounds} />
              </div>
              <div className="hidden space-y-4 md:block">{sideCards}</div>
            </div>
          </aside>

          {/* Timeline */}
          <section className="mt-4 space-y-4 md:order-1 md:mt-0" aria-label="Datas da turnê">
            {fillOpen && canEdit && (
              <FillGapsPanel tour={tour} resolved={resolved} data={data} index={index} canEdit={canEdit} onClose={() => setFillOpen(false)} />
            )}

            {resolved.length === 0 ? (
              <EmptyState
                icon={<CalendarPlus className="h-8 w-8" aria-hidden />}
                title="Nenhuma data ainda"
                description={
                  canEdit
                    ? 'Adicione a primeira data da turnê. Depois, "Preencher buracos" sugere cidades para as datas sem destino.'
                    : 'Quem edita a turnê ainda não adicionou datas.'
                }
                action={
                  canEdit ? (
                    <Button onClick={focusAddForm}>
                      <CalendarPlus className="h-4 w-4" aria-hidden />
                      Adicionar data
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <ol className="space-y-0">
                {resolved.map((r, i) => (
                  <Fragment key={r.date.id}>
                    {i > 0 && <LegConnector leg={legs[i - 1] ?? null} />}
                    <DateCard resolved={r} index={i} tourId={tour.id} canEdit={canEdit} onEdit={(d) => setEditingId(d.id)} />
                  </Fragment>
                ))}
              </ol>
            )}

            {canEdit && <AddDateForm ref={addFormRef} tourId={tour.id} dates={tour.dates} cities={data.cities} />}

            <div className="space-y-4 md:hidden">{sideCards}</div>
          </section>
        </div>
      </div>

      {editingDate && (
        <DateEditorDialog
          key={editingDate.id}
          tourId={tour.id}
          date={editingDate}
          data={data}
          index={index}
          open
          onClose={() => setEditingId(null)}
        />
      )}
    </div>
  )
}
