import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchPendingVenues, moderateVenue } from '@tour/core'
import { Database, Inbox, RefreshCw, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { queryKeys } from '../../app/queryClient'
import { Button } from '../../components/ui/Button'
import { EmptyState, ErrorState } from '../../components/ui/EmptyState'
import { FullScreenSpinner } from '../../components/ui/Spinner'
import { useRegionData, useRegionIndex } from '../../hooks/useRegionData'
import { client } from '../../lib/firebase'
import { PendingVenueCard, type ModerationStatus } from './PendingVenueCard'
import { errorMessage } from '../../lib/errorMessage'
type ModerateVars = { venueId: string; status: ModerationStatus }

const importLinkClass =
  'inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-surface-2 px-3 text-sm font-medium text-ink transition-colors hover:bg-surface-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400'

export default function ModerationPage() {
  const queryClient = useQueryClient()
  const pending = useQuery({ queryKey: queryKeys.pendingVenues, queryFn: () => fetchPendingVenues(client) })
  const region = useRegionData()
  const index = useRegionIndex(region.data)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [failure, setFailure] = useState<{ venueId: string; message: string } | null>(null)

  const moderate = useMutation({
    mutationFn: ({ venueId, status }: ModerateVars) => moderateVenue(client, venueId, status),
    onMutate: () => setFailure(null),
    onSuccess: async (_result, { venueId }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.pendingVenues }),
        queryClient.invalidateQueries({ queryKey: queryKeys.region }),
      ])
      setExpandedId((current) => (current === venueId ? null : current))
    },
    onError: (e, { venueId }) => setFailure({ venueId, message: errorMessage(e, 'Não deu para salvar a moderação.') }),
  })

  const busyId = moderate.isPending ? moderate.variables.venueId : null
  const count = pending.data?.length ?? 0

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl px-4 py-6">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600/15 text-brand-300">
              <ShieldCheck className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <h1 className="text-xl font-semibold">Moderação</h1>
              <p className="text-sm text-ink-muted">
                {pending.isSuccess
                  ? count === 0
                    ? 'Nenhuma casa aguardando revisão.'
                    : count === 1
                      ? '1 casa aguardando revisão.'
                      : `${count} casas aguardando revisão.`
                  : 'Casas sugeridas pelos usuários.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void pending.refetch()}
              disabled={pending.isFetching}
              aria-label="Atualizar lista"
            >
              <RefreshCw className={pending.isFetching ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} aria-hidden />
              Atualizar
            </Button>
            <Link to="/admin/importar" className={importLinkClass}>
              <Database className="h-4 w-4" aria-hidden />
              Importar dados de exemplo
            </Link>
          </div>
        </header>

        {pending.isPending && <FullScreenSpinner label="Carregando pendências…" />}

        {pending.isError && (
          <ErrorState
            message={errorMessage(pending.error, 'Não deu para carregar as pendências.')}
            onRetry={() => void pending.refetch()}
          />
        )}

        {pending.isSuccess && pending.data.length === 0 && (
          <EmptyState
            icon={<Inbox className="h-8 w-8" aria-hidden />}
            title="Nada pendente"
            description="Quando alguém sugerir uma casa, ela aparece aqui para você aprovar ou recusar."
            action={
              <Link to="/admin/importar" className={importLinkClass}>
                <Database className="h-4 w-4" aria-hidden />
                Importar dados de exemplo
              </Link>
            }
          />
        )}

        {pending.isSuccess && pending.data.length > 0 && (
          <>
            <p className="mb-3 text-xs text-ink-muted">
              Aprovar coloca a casa no mapa para todas as bandas; recusar a esconde (quem enviou continua vendo o status).
            </p>
            <ul className="space-y-3">
              {pending.data.map((venue) => (
                <li key={venue.id}>
                  <PendingVenueCard
                    venue={venue}
                    city={index.cities.get(venue.cityId)}
                    expanded={expandedId === venue.id}
                    onToggle={() => setExpandedId((current) => (current === venue.id ? null : venue.id))}
                    onModerate={(status) => moderate.mutate({ venueId: venue.id, status })}
                    busy={busyId === venue.id}
                    error={failure?.venueId === venue.id ? failure.message : null}
                  />
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}
