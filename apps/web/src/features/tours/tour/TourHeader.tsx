import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteTour, type TourWithDates } from '@tour/core'
import { ArrowLeft, Ellipsis, FileText, Pencil, Share2, Trash2, Wand2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { queryKeys } from '../../../app/queryClient'
import { Button } from '../../../components/ui/Button'
import { Dialog } from '../../../components/ui/Dialog'
import { Spinner } from '../../../components/ui/Spinner'
import { cn } from '../../../lib/cn'
import { client } from '../../../lib/firebase'
import { EditTourDialog } from './EditTourDialog'
import { ShareDialog } from './ShareDialog'
import { errorMessage } from '../../../lib/errorMessage'
import { plural } from '../../../lib/text'
import { countConfirmed, datesWithoutCity, tourPeriodLabel } from './helpers'
export type TourHeaderProps = {
  tour: TourWithDates
  canEdit: boolean
  isOwner: boolean
  fillOpen: boolean
  onToggleFill: () => void
}

const secondaryLinkClass =
  'inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-surface-2 px-4 text-sm font-medium text-ink transition-colors hover:bg-surface-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400'

/** Overflow menu (edit / delete) closed by outside click or Escape. */
function OverflowMenu({ onEdit, onDelete, canDelete }: { onEdit: () => void; onDelete: () => void; canDelete: boolean }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <Button variant="secondary" aria-label="Mais ações" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)} className="px-3">
        <Ellipsis className="h-4 w-4" aria-hidden />
      </Button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-1 w-48 overflow-hidden rounded-xl border border-surface-3 bg-surface-1 py-1 shadow-xl shadow-black/40"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              onEdit()
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-surface-2"
          >
            <Pencil className="h-4 w-4 text-ink-muted" aria-hidden />
            Editar turnê
          </button>
          {canDelete && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false)
                onDelete()
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-300 hover:bg-red-950/40"
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              Excluir turnê
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/** Name, band, period and counts, plus the page actions (tourbook, share, fill gaps, edit, delete). */
export function TourHeader({ tour, canEdit, isOwner, fillOpen, onToggleFill }: TourHeaderProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [shareOpen, setShareOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const period = tourPeriodLabel(tour.dates)
  const confirmed = countConfirmed(tour.dates)
  const gaps = datesWithoutCity(tour.dates).length

  const remove = useMutation({
    mutationFn: () => deleteTour(client, tour.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.tours })
      void navigate('/turnes', { replace: true })
      queryClient.removeQueries({ queryKey: queryKeys.tour(tour.id) })
    },
  })

  return (
    <header className="space-y-3">
      <Link to="/turnes" className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Turnês
      </Link>

      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold md:text-2xl">{tour.name}</h1>
          <p className="truncate text-sm text-ink-muted">{tour.bandName}</p>
          <p className="mt-1 text-xs text-ink-muted">
            {period ?? 'Sem datas ainda'}
            {' · '}
            {plural(tour.dates.length, 'data', 'datas')}
            {tour.dates.length > 0 && ` · ${plural(confirmed, 'confirmada', 'confirmadas')}`}
            {gaps > 0 && (
              <>
                {' · '}
                <span className="text-amber-300">{plural(gaps, 'sem cidade', 'sem cidade')}</span>
              </>
            )}
            {!canEdit && ' · somente leitura'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link to={`/turnes/${tour.id}/tourbook`} className={secondaryLinkClass}>
            <FileText className="h-4 w-4" aria-hidden />
            Tourbook (PDF)
          </Link>
          <Button variant="secondary" onClick={() => setShareOpen(true)}>
            <Share2 className="h-4 w-4" aria-hidden />
            Compartilhar
          </Button>
          {canEdit && (
            <Button variant={fillOpen ? 'primary' : 'secondary'} onClick={onToggleFill} aria-pressed={fillOpen} className={cn(gaps > 0 && !fillOpen && 'ring-1 ring-brand-500/60')}>
              <Wand2 className="h-4 w-4" aria-hidden />
              Preencher buracos
              {gaps > 0 && <span className="rounded-full bg-black/25 px-1.5 text-[11px]">{gaps}</span>}
            </Button>
          )}
          {canEdit && <OverflowMenu onEdit={() => setEditOpen(true)} onDelete={() => setDeleteOpen(true)} canDelete={isOwner} />}
        </div>
      </div>

      <ShareDialog tour={tour} canEdit={canEdit} open={shareOpen} onClose={() => setShareOpen(false)} />
      {editOpen && <EditTourDialog tour={tour} open onClose={() => setEditOpen(false)} />}

      <Dialog open={deleteOpen} onClose={() => (remove.isPending ? undefined : setDeleteOpen(false))} title="Excluir turnê">
        <div className="space-y-4">
          <p className="text-sm">
            Excluir <span className="font-medium">{tour.name}</span> apaga todas as {plural(tour.dates.length, 'data', 'datas')} e o
            tourbook público. Isso não pode ser desfeito.
          </p>
          {remove.isError && (
            <p role="alert" className="text-sm text-red-400">
              {errorMessage(remove.error)}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDeleteOpen(false)} disabled={remove.isPending}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={() => remove.mutate()} disabled={remove.isPending}>
              {remove.isPending ? <Spinner className="h-4 w-4 border-white/40 border-t-white" /> : <Trash2 className="h-4 w-4" aria-hidden />}
              Excluir turnê
            </Button>
          </div>
        </div>
      </Dialog>
    </header>
  )
}
