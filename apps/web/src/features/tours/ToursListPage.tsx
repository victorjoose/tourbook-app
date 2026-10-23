import { useQuery } from '@tanstack/react-query'
import { fetchMyTours, formatPeriodPt } from '@tour/core'
import { formatDistanceToNowStrict } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarRange, ChevronRight, Plus } from 'lucide-react'
import { Link } from 'react-router'
import { queryKeys } from '../../app/queryClient'
import { EmptyState, ErrorState } from '../../components/ui/EmptyState'
import { FullScreenSpinner } from '../../components/ui/Spinner'
import { supabase } from '../../lib/supabase'

const newTourLinkClass =
  'inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-medium text-white transition-colors hover:bg-brand-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400'

function updatedLabel(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `Atualizada ${formatDistanceToNowStrict(d, { addSuffix: true, locale: ptBR })}`
}

export default function ToursListPage() {
  const tours = useQuery({ queryKey: queryKeys.tours, queryFn: () => fetchMyTours(supabase) })

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl px-4 py-6">
        <header className="mb-6 flex items-center justify-between gap-3">
          <h1 className="text-xl font-semibold">Minhas turnês</h1>
          <Link to="/turnes/nova" className={newTourLinkClass}>
            <Plus className="h-4 w-4" aria-hidden />
            Nova turnê
          </Link>
        </header>

        {tours.isPending && <FullScreenSpinner label="Carregando turnês…" />}

        {tours.isError && (
          <ErrorState
            message={tours.error instanceof Error ? tours.error.message : 'Não deu para carregar suas turnês.'}
            onRetry={() => void tours.refetch()}
          />
        )}

        {tours.isSuccess && tours.data.length === 0 && (
          <EmptyState
            icon={<CalendarRange className="h-8 w-8" aria-hidden />}
            title="Nenhuma turnê ainda"
            description="Monte a primeira: o assistente sugere cidades pela distância, dia da semana e cena local."
            action={
              <Link to="/turnes/nova" className={newTourLinkClass}>
                <Plus className="h-4 w-4" aria-hidden />
                Nova turnê
              </Link>
            }
          />
        )}

        {tours.isSuccess && tours.data.length > 0 && (
          <ul className="space-y-3">
            {tours.data.map((tour) => (
              <li key={tour.id}>
                <Link
                  to={`/turnes/${tour.id}`}
                  className="flex items-center gap-4 rounded-2xl border border-surface-2 bg-surface-1 p-4 transition-colors hover:border-surface-3 hover:bg-surface-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{tour.name}</p>
                    <p className="truncate text-sm text-ink-muted">{tour.bandName}</p>
                    <p className="mt-1 text-xs text-ink-muted">
                      {tour.firstDate && tour.lastDate ? formatPeriodPt(tour.firstDate, tour.lastDate) : 'Sem datas'}
                      {' · '}
                      {tour.dateCount === 1 ? '1 data' : `${tour.dateCount} datas`}
                      {' · '}
                      {updatedLabel(tour.updatedAt)}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-ink-muted" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
