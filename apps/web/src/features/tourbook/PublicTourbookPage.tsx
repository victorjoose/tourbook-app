// /t/:token — public tourbook, no login and no app shell (never uses useAuth or useRegionData).
import { useQuery } from '@tanstack/react-query'
import { buildTourbook, fetchPublicTourbook } from '@tour/core'
import { Download, Link2Off, MapPinned } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { queryKeys } from '../../app/queryClient'
import { Button } from '../../components/ui/Button'
import { EmptyState, ErrorState } from '../../components/ui/EmptyState'
import { FullScreenSpinner } from '../../components/ui/Spinner'
import { client } from '../../lib/firebase'
import { TourbookHtml } from './TourbookHtml'
import { generatedAtLabel } from './tourbookHelpers'
import { useTourbookPdf } from './useTourbookPdf'

const homeLinkClass =
  'inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-medium text-white transition-colors hover:bg-brand-500'

export default function PublicTourbookPage() {
  const { token = '' } = useParams()
  const query = useQuery({
    queryKey: queryKeys.publicTourbook(token),
    queryFn: () => fetchPublicTourbook(client, token),
    enabled: token !== '',
  })
  const payload = query.data ?? null
  // Public version: money is stripped twice (payload has no fees; hideMoney drops the labels too).
  const tourbook = useMemo(() => (payload ? buildTourbook({ ...payload, hideMoney: true }) : null), [payload])
  const { qrByDayId, ready } = useTourbookPdf(tourbook)
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)

  useEffect(() => {
    if (!tourbook) return
    const previous = document.title
    document.title = `${tourbook.title} · Tourbook`
    return () => {
      document.title = previous
    }
  }, [tourbook])

  const invalid = token === '' || (query.isSuccess && payload === null)
  const updatedAt = generatedAtLabel(payload?.generatedAt)

  async function handleDownload() {
    if (!tourbook) return
    setDownloading(true)
    setDownloadError(null)
    try {
      // @react-pdf/renderer is heavy: load it only when someone actually asks for the PDF.
      const { downloadTourbookPdf } = await import('./downloadPdf')
      await downloadTourbookPdf({ tourbook, qrByDayId, hideMoney: true })
    } catch (e) {
      setDownloadError(e instanceof Error ? e.message : 'Não foi possível gerar o PDF.')
    } finally {
      setDownloading(false)
    }
  }

  const downloadButton = tourbook && (
    <Button onClick={() => void handleDownload()} disabled={!ready || downloading} className="shrink-0">
      <Download className="h-4 w-4" aria-hidden />
      {downloading ? 'Gerando PDF…' : 'Baixar PDF'}
    </Button>
  )

  return (
    <div className="flex min-h-full flex-col bg-surface text-ink">
      <header className="sticky top-0 z-10 border-b border-surface-2 bg-surface-1/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-3 px-4 py-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white">
            <MapPinned className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{tourbook ? tourbook.title : 'Tourbook'}</p>
            <p className="truncate text-xs text-ink-muted">{tourbook ? tourbook.bandName : 'Tour App'}</p>
          </div>
          {downloadButton}
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        {downloadError && (
          <p role="alert" className="mb-4 rounded-xl border border-red-900 bg-red-950/40 px-4 py-2 text-sm text-red-300">
            {downloadError}
          </p>
        )}

        {token !== '' && query.isPending && <FullScreenSpinner label="Carregando tourbook…" />}

        {query.isError && (
          <ErrorState
            message={query.error instanceof Error ? query.error.message : 'Não deu para carregar o tourbook.'}
            onRetry={() => void query.refetch()}
          />
        )}

        {invalid && (
          <EmptyState
            icon={<Link2Off className="h-8 w-8" aria-hidden />}
            title="Link inválido ou desativado"
            description="Peça um link novo para quem organiza a turnê."
            action={
              <Link to="/" className={homeLinkClass}>
                Ir para o Tour App
              </Link>
            }
          />
        )}

        {tourbook && (
          <div className="space-y-4">
            <TourbookHtml tourbook={tourbook} hideMoney />
            <Button className="w-full" size="lg" onClick={() => void handleDownload()} disabled={!ready || downloading}>
              <Download className="h-4 w-4" aria-hidden />
              {downloading ? 'Gerando PDF…' : 'Baixar PDF'}
            </Button>
          </div>
        )}
      </main>

      <footer className="border-t border-surface-2 px-4 py-6 text-center text-xs text-ink-muted">
        <p>
          Feito com <span className="font-medium text-ink">Tour App</span>
          {updatedAt && <> · Atualizado em {updatedAt}</>}
        </p>
      </footer>
    </div>
  )
}
