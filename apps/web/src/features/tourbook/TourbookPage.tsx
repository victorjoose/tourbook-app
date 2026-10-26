// /turnes/:id/tourbook — PDF preview (desktop) or HTML preview (mobile) + download.
import { PDFViewer } from '@react-pdf/renderer'
import { useQuery } from '@tanstack/react-query'
import { fetchTour } from '@tour/core'
import { ArrowLeft, CalendarRange, Download, FileText } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { queryKeys } from '../../app/queryClient'
import { Button } from '../../components/ui/Button'
import { EmptyState, ErrorState } from '../../components/ui/EmptyState'
import { Checkbox } from '../../components/ui/Input'
import { FullScreenSpinner } from '../../components/ui/Spinner'
import { useRegionData } from '../../hooks/useRegionData'
import { errorMessage } from '../../lib/errorMessage'
import { client } from '../../lib/firebase'
import { downloadTourbookPdf } from './downloadPdf'
import { TourbookDocument } from './TourbookDocument'
import { TourbookHtml } from './TourbookHtml'
import { buildTourbookFromTour } from './tourbookHelpers'
import { useIsDesktop } from '../../hooks/useIsDesktop'
import { useTourbookPdf } from './useTourbookPdf'

const linkClass =
  'inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-medium text-white transition-colors hover:bg-brand-500'

export default function TourbookPage() {
  const { id = '' } = useParams()
  const tourQuery = useQuery({
    queryKey: queryKeys.tour(id),
    queryFn: () => fetchTour(client, id),
    enabled: id !== '',
  })
  const region = useRegionData()
  const isDesktop = useIsDesktop()
  const [hideMoney, setHideMoney] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)

  const tour = tourQuery.data ?? null
  const tourbook = useMemo(
    () => (tour && region.data ? buildTourbookFromTour(tour, region.data, hideMoney) : null),
    [tour, region.data, hideMoney],
  )
  const { qrByDayId, ready } = useTourbookPdf(tourbook)

  // PDFViewer re-renders the whole PDF whenever its child element changes identity.
  const pdfDocument = useMemo(
    () => (tourbook ? <TourbookDocument tourbook={tourbook} qrByDayId={qrByDayId} hideMoney={hideMoney} /> : null),
    [tourbook, qrByDayId, hideMoney],
  )

  const backTo = `/turnes/${id}`
  const hasDates = (tour?.dates.length ?? 0) > 0
  const canDownload = tourbook !== null && hasDates && ready && !downloading

  async function handleDownload() {
    if (!tourbook) return
    setDownloading(true)
    setDownloadError(null)
    try {
      await downloadTourbookPdf({ tourbook, qrByDayId, hideMoney })
    } catch (e) {
      setDownloadError(errorMessage(e, 'Não foi possível gerar o PDF.'))
    } finally {
      setDownloading(false)
    }
  }

  function retry() {
    if (tourQuery.isError) void tourQuery.refetch()
    if (region.isError) void region.refetch()
  }

  function renderBody() {
    if (id === '' || (tourQuery.isSuccess && tour === null)) {
      return (
        <EmptyState
          icon={<FileText className="h-8 w-8" aria-hidden />}
          title="Turnê não encontrada"
          description="Ela pode ter sido apagada ou você não tem acesso a ela."
          action={
            <Link to="/turnes" className={linkClass}>
              Minhas turnês
            </Link>
          }
        />
      )
    }
    if (tourQuery.isError || region.isError) {
      return (
        <ErrorState
          message={errorMessage(tourQuery.error ?? region.error, 'Não deu para montar o tourbook.')}
          onRetry={retry}
        />
      )
    }
    if (!tour || !tourbook || !pdfDocument) return <FullScreenSpinner label="Montando o tourbook…" />
    if (!hasDates) {
      return (
        <EmptyState
          icon={<CalendarRange className="h-8 w-8" aria-hidden />}
          title="Sem datas ainda"
          description="Adicione datas à turnê para gerar o tourbook."
          action={
            <Link to={backTo} className={linkClass}>
              Voltar para a turnê
            </Link>
          }
        />
      )
    }
    if (!ready) return <FullScreenSpinner label="Gerando QR codes…" />
    if (isDesktop) {
      return (
        <PDFViewer className="h-full w-full border-0 bg-surface-1" showToolbar>
          {pdfDocument}
        </PDFViewer>
      )
    }
    return (
      <div className="h-full overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-6">
          <TourbookHtml tourbook={tourbook} hideMoney={hideMoney} />
          <Button className="w-full" size="lg" onClick={() => void handleDownload()} disabled={!canDownload}>
            <Download className="h-4 w-4" aria-hidden />
            {downloading ? 'Gerando PDF…' : 'Baixar PDF'}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-surface-2 bg-surface-1 px-4 py-3">
        <Link
          to={backTo}
          aria-label="Voltar para a turnê"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-semibold">Tourbook</h1>
          {tour && (
            <p className="truncate text-xs text-ink-muted">
              {tour.name} · {tour.bandName}
            </p>
          )}
        </div>
        <Checkbox
          label="Esconder valores (versão para a equipe)"
          checked={hideMoney}
          onChange={(e) => setHideMoney(e.target.checked)}
          className="order-last w-full md:order-none md:w-auto"
        />
        <Button onClick={() => void handleDownload()} disabled={!canDownload} className="shrink-0">
          <Download className="h-4 w-4" aria-hidden />
          {downloading ? 'Gerando PDF…' : 'Baixar PDF'}
        </Button>
      </header>

      {downloadError && (
        <p role="alert" className="border-b border-surface-2 bg-surface-1 px-4 py-2 text-sm text-red-400">
          {downloadError}
        </p>
      )}

      <div className="min-h-0 flex-1">{renderBody()}</div>
    </div>
  )
}
