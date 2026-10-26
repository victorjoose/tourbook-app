import { useMutation, useQueryClient } from '@tanstack/react-query'
import { submitVenue, type Venue, type VenueSubmissionValues } from '@tour/core'
import { ArrowLeft, CheckCircle2, Database, Info, Map as MapIcon, Plus, Store } from 'lucide-react'
import { useRef, useState } from 'react'
import { Link } from 'react-router'
import { queryKeys } from '../../app/queryClient'
import { useAuth } from '../../auth/AuthProvider'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState, ErrorState } from '../../components/ui/EmptyState'
import { FullScreenSpinner, Spinner } from '../../components/ui/Spinner'
import { useRegionData } from '../../hooks/useRegionData'
import { client } from '../../lib/firebase'
import { MySubmissions } from './MySubmissions'
import { VenueForm } from './VenueForm'
import { errorMessage } from '../../lib/errorMessage'
type SubmitVars = { userId: string; values: VenueSubmissionValues }

const cardShellClass = 'rounded-2xl border border-surface-2 bg-surface-1'

const linkButtonClass =
  'inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-surface-2 px-4 text-sm font-medium text-ink transition-colors hover:bg-surface-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400'

function SuccessPanel({ venue, onAnother }: { venue: Venue; onAnother: () => void }) {
  return (
    <Card className="space-y-4" role="status">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-900 text-emerald-200">
          <CheckCircle2 className="h-5 w-5" aria-hidden />
        </span>
        <div className="space-y-1">
          <h2 className="font-semibold">Sugestão enviada!</h2>
          <p className="text-sm text-ink-muted">
            <strong className="text-ink">{venue.name}</strong> entrou na fila de moderação. Assim que for aprovada, aparece no mapa
            para todas as bandas. Você acompanha o status na lista abaixo.
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-2 md:flex-row">
        <Button onClick={onAnother}>
          <Plus className="h-4 w-4" aria-hidden />
          Enviar outra
        </Button>
        <Link to="/" className={linkButtonClass}>
          <MapIcon className="h-4 w-4" aria-hidden />
          Voltar ao mapa
        </Link>
      </div>
    </Card>
  )
}

export default function SubmitVenuePage() {
  const { user, isAdmin } = useAuth()
  const queryClient = useQueryClient()
  const region = useRegionData()
  const [formKey, setFormKey] = useState(0)
  const formRef = useRef<HTMLDivElement>(null)

  const submit = useMutation({
    mutationFn: ({ userId, values }: SubmitVars) => submitVenue(client, userId, values),
    onSuccess: (_venue, { userId }) => queryClient.invalidateQueries({ queryKey: queryKeys.mySubmissions(userId) }),
  })

  if (!user) return <FullScreenSpinner label="Carregando…" />
  const userId = user.id

  function startAnother() {
    submit.reset()
    setFormKey((k) => k + 1)
    formRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl px-4 py-6">
        <header className="mb-6 flex items-center gap-3">
          <Link
            to="/"
            aria-label="Voltar ao mapa"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden />
          </Link>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold">Sugerir uma casa</h1>
            <p className="text-sm text-ink-muted">Conhece um lugar que recebe show e não está no mapa? Conta pra gente.</p>
          </div>
        </header>

        <div className="space-y-6">
          <Card className="flex items-start gap-3 border-brand-900/60 bg-brand-600/10">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-brand-300" aria-hidden />
            <div className="space-y-1 text-sm">
              <p className="font-medium">Toda sugestão passa por moderação antes de aparecer no mapa.</p>
              <p className="text-ink-muted">
                Preencha o que souber: nome, cidade e o ponto no mapa são obrigatórios; o resto ajuda as bandas a decidir se a
                casa cabe na turnê. Depois de aprovada, ela aparece para todo mundo com os contatos informados.
              </p>
            </div>
          </Card>

          <div ref={formRef} className="scroll-mt-4">
            {region.isPending && (
              <Card>
                <div className="flex items-center justify-center gap-3 py-10 text-sm text-ink-muted">
                  <Spinner className="h-6 w-6" />
                  Carregando cidades…
                </div>
              </Card>
            )}

            {region.isError && (
              <div className={cardShellClass}>
                <ErrorState
                  message={errorMessage(region.error, 'Não deu para carregar as cidades.')}
                  onRetry={() => void region.refetch()}
                />
              </div>
            )}

            {region.isSuccess && region.data.cities.length === 0 && (
              <div className={cardShellClass}>
                <EmptyState
                  icon={<Database className="h-8 w-8" aria-hidden />}
                  title="Nenhuma cidade cadastrada ainda"
                  description={
                    isAdmin
                      ? 'Importe os dados de exemplo para liberar o formulário.'
                      : 'O formulário depende da lista de cidades. Peça ao administrador para importar os dados.'
                  }
                  action={
                    isAdmin ? (
                      <Link to="/admin/importar" className={linkButtonClass}>
                        <Database className="h-4 w-4" aria-hidden />
                        Importar dados de exemplo
                      </Link>
                    ) : (
                      <Link to="/" className={linkButtonClass}>
                        <MapIcon className="h-4 w-4" aria-hidden />
                        Voltar ao mapa
                      </Link>
                    )
                  }
                />
              </div>
            )}

            {region.isSuccess && region.data.cities.length > 0 && (
              <>
                {submit.isSuccess ? (
                  <SuccessPanel venue={submit.data} onAnother={startAnother} />
                ) : (
                  <Card>
                    <div className="mb-5 flex items-center gap-2">
                      <Store className="h-5 w-5 text-brand-300" aria-hidden />
                      <h2 className="font-semibold">Dados da casa</h2>
                    </div>
                    <VenueForm
                      key={formKey}
                      cities={region.data.cities}
                      submitting={submit.isPending}
                      submitError={submit.isError ? errorMessage(submit.error, 'Não deu para enviar a sugestão.') : null}
                      onSubmit={(values) => submit.mutate({ userId, values })}
                    />
                  </Card>
                )}
              </>
            )}
          </div>

          <MySubmissions
            userId={userId}
            onSuggest={() => {
              if (submit.isSuccess) startAnother()
              else formRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })
            }}
          />
        </div>
      </div>
    </div>
  )
}
