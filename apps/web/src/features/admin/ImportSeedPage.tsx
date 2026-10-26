import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchCollectionCounts, importSeedData, type CollectionCounts, type SeedProgress } from '@tour/core'
import { ArrowLeft, CheckCircle2, Database, DatabaseZap, RefreshCw, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { queryKeys } from '../../app/queryClient'
import { useAuth } from '../../auth/AuthProvider'
import { Button } from '../../components/ui/Button'
import { Card, SectionTitle } from '../../components/ui/Card'
import { Dialog } from '../../components/ui/Dialog'
import { EmptyState, ErrorState } from '../../components/ui/EmptyState'
import { Spinner } from '../../components/ui/Spinner'
import { errorMessage } from '../../lib/errorMessage'
import { client } from '../../lib/firebase'

const countsKey = ['admin', 'counts'] as const

type CollectionKey = keyof CollectionCounts
type ProgressMap = Partial<Record<CollectionKey, SeedProgress>>
type ImportResult = { written: number; totals: CollectionCounts }

const COLLECTION_ORDER: CollectionKey[] = ['cities', 'venues', 'producers', 'bands']
const COLLECTION_LABELS: Record<CollectionKey, string> = {
  cities: 'Cidades',
  venues: 'Casas de show',
  producers: 'Produtoras',
  bands: 'Bandas',
}

function isCollectionKey(name: string): name is CollectionKey {
  return (COLLECTION_ORDER as string[]).includes(name)
}

function formatCount(n: number): string {
  return n.toLocaleString('pt-BR')
}

export default function ImportSeedPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [progress, setProgress] = useState<ProgressMap>({})

  const counts = useQuery({ queryKey: countsKey, queryFn: () => fetchCollectionCounts(client) })

  const importMutation = useMutation({
    mutationFn: async (): Promise<ImportResult> => {
      // Lazy import: the sample data stays out of the main bundle.
      const { SEED_DATA } = await import('@tour/core/seed')
      const totals: CollectionCounts = {
        cities: SEED_DATA.cities.length,
        venues: SEED_DATA.venues.length,
        producers: SEED_DATA.producers.length,
        bands: SEED_DATA.bands.length,
      }
      const initial: ProgressMap = {}
      for (const key of COLLECTION_ORDER) initial[key] = { collection: key, done: 0, total: totals[key] }
      setProgress(initial)

      const { written } = await importSeedData(client, SEED_DATA, (p) => {
        if (isCollectionKey(p.collection)) setProgress((prev) => ({ ...prev, [p.collection]: p }))
      })
      return { written, totals }
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: countsKey }),
        queryClient.invalidateQueries({ queryKey: queryKeys.region }),
        queryClient.invalidateQueries({ queryKey: queryKeys.cities }),
      ])
    },
  })

  const startImport = () => {
    setConfirmOpen(false)
    importMutation.mutate()
  }

  const isEmpty = counts.isSuccess && COLLECTION_ORDER.every((key) => counts.data[key] === 0)
  const showMeters = (importMutation.isPending || importMutation.isError) && Object.keys(progress).length > 0

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl px-4 py-6">
        <header className="mb-6 flex items-center gap-3">
          <Link
            to="/admin/moderacao"
            aria-label="Voltar para a moderação"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden />
          </Link>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold">Dados de exemplo</h1>
            <p className="text-sm text-ink-muted">Administração · importação para o Firestore</p>
          </div>
        </header>

        <div className="space-y-4">
          <Card>
            <SectionTitle className="mb-2">O que esta ação faz</SectionTitle>
            <p className="text-sm">
              Grava no Firestore o conjunto de dados de exemplo do app: <strong>cidades reais</strong> de SC, PR e SP e{' '}
              <strong>casas de show, produtoras e bandas fictícias</strong>, com contatos obviamente falsos.
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-ink-muted">
              <li>Documentos com o mesmo id (slug) são sobrescritos — ajustes feitos à mão nesses registros são desfeitos.</li>
              <li>O que os usuários cadastraram (ids automáticos) não é apagado nem alterado.</li>
              <li>Tudo entra como verificado e aparece no mapa imediatamente.</li>
            </ul>
          </Card>

          <Card>
            <div className="mb-3 flex items-center justify-between gap-3">
              <SectionTitle>No Firestore agora</SectionTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void counts.refetch()}
                disabled={counts.isFetching}
                aria-label="Atualizar contagens"
              >
                <RefreshCw className={counts.isFetching ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} aria-hidden />
                Atualizar
              </Button>
            </div>

            {counts.isPending && (
              <div className="flex items-center justify-center py-8">
                <Spinner className="h-6 w-6" />
              </div>
            )}

            {counts.isError && (
              <ErrorState
                message={errorMessage(counts.error, 'Não deu para contar os registros.')}
                onRetry={() => void counts.refetch()}
              />
            )}

            {counts.isSuccess && isEmpty && (
              <EmptyState
                icon={<Database className="h-8 w-8" aria-hidden />}
                title="Nenhum dado no mapa ainda"
                description="As coleções de cidades, casas, produtoras e bandas estão vazias. Importe os dados de exemplo para começar."
                action={
                  <Button onClick={() => setConfirmOpen(true)} disabled={importMutation.isPending}>
                    <DatabaseZap className="h-4 w-4" aria-hidden />
                    Importar dados de exemplo
                  </Button>
                }
              />
            )}

            {counts.isSuccess && !isEmpty && (
              <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {COLLECTION_ORDER.map((key) => (
                  <div key={key} className="rounded-xl bg-surface-2 p-3">
                    <dt className="text-xs text-ink-muted">{COLLECTION_LABELS[key]}</dt>
                    <dd className="mt-1 text-2xl font-semibold">{formatCount(counts.data[key])}</dd>
                  </div>
                ))}
              </dl>
            )}
          </Card>

          <Card>
            <SectionTitle className="mb-3">Importação</SectionTitle>

            {importMutation.isIdle && (
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <p className="text-sm text-ink-muted">
                  Grava as quatro coleções em lotes. Só administradores passam nas regras de segurança.
                </p>
                <Button onClick={() => setConfirmOpen(true)} className="shrink-0">
                  <DatabaseZap className="h-4 w-4" aria-hidden />
                  Importar dados de exemplo
                </Button>
              </div>
            )}

            {importMutation.isPending && (
              <div className="mb-4 flex items-center gap-3 text-sm">
                <Spinner />
                <span>Importando… não feche esta página.</span>
              </div>
            )}

            {showMeters && (
              <ul className="space-y-3">
                {COLLECTION_ORDER.map((key) => {
                  const p = progress[key]
                  if (!p) return null
                  const percent = p.total === 0 ? 100 : Math.round((p.done / p.total) * 100)
                  return (
                    <li key={key}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span>{COLLECTION_LABELS[key]}</span>
                        <span className="text-ink-muted">
                          {formatCount(p.done)} / {formatCount(p.total)}
                        </span>
                      </div>
                      <div
                        role="progressbar"
                        aria-label={`Progresso de ${COLLECTION_LABELS[key]}`}
                        aria-valuemin={0}
                        aria-valuemax={p.total}
                        aria-valuenow={p.done}
                        className="h-2 overflow-hidden rounded-full bg-brand-900"
                      >
                        <div className="h-full rounded-full bg-brand-500 transition-[width]" style={{ width: `${percent}%` }} />
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}

            {importMutation.isError && (
              <div className="mt-2">
                <ErrorState
                  message={errorMessage(importMutation.error, 'A importação falhou. Confira se você é administrador e tente de novo.')}
                  onRetry={() => importMutation.mutate()}
                />
              </div>
            )}

            {importMutation.isSuccess && (
              <div className="rounded-xl border border-emerald-900 bg-emerald-950/40 p-4" role="status">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">Importação concluída</p>
                    <p className="mt-0.5 text-sm text-ink-muted">
                      {formatCount(importMutation.data.written)} documentos gravados. O mapa já usa os novos dados.
                    </p>
                    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm md:grid-cols-4">
                      {COLLECTION_ORDER.map((key) => (
                        <div key={key} className="flex items-baseline justify-between gap-2 md:flex-col md:items-start md:gap-0">
                          <dt className="text-ink-muted">{COLLECTION_LABELS[key]}</dt>
                          <dd className="font-semibold">{formatCount(importMutation.data.totals[key])}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    to="/"
                    className="inline-flex h-8 items-center justify-center gap-1.5 rounded-xl bg-surface-2 px-3 text-sm font-medium text-ink transition-colors hover:bg-surface-3"
                  >
                    Ver o mapa
                  </Link>
                  <Button variant="ghost" size="sm" onClick={() => importMutation.reset()}>
                    Importar de novo
                  </Button>
                </div>
              </div>
            )}
          </Card>

          <Card>
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-ink-muted" aria-hidden />
              <div className="min-w-0 text-sm">
                <SectionTitle className="mb-1">Como dar acesso de administrador</SectionTitle>
                <p className="text-ink-muted">
                  O papel é definido direto no banco: no console do Firebase, abra <strong className="text-ink">Firestore Database</strong>,
                  coleção <code className="rounded bg-surface-2 px-1">profiles</code>, documento com o uid da pessoa, e troque o campo{' '}
                  <code className="rounded bg-surface-2 px-1">role</code> para <code className="rounded bg-surface-2 px-1">admin</code>. O
                  app relê o perfil no próximo login.
                </p>
                {user && (
                  <p className="mt-2 text-ink-muted">
                    Seu uid: <code className="break-all rounded bg-surface-2 px-1 text-ink">{user.id}</code>
                  </p>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Importar dados de exemplo?">
        <p className="text-sm">
          Isso grava (ou regrava) cidades, casas de show, produtoras e bandas de exemplo no Firestore. Registros com o mesmo id serão
          sobrescritos; cadastros de usuários não são afetados.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={startImport}>
            <DatabaseZap className="h-4 w-4" aria-hidden />
            Confirmar importação
          </Button>
        </div>
      </Dialog>
    </div>
  )
}
