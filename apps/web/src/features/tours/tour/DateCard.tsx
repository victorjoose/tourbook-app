import {
  DEAL_TYPE_LABELS,
  TOUR_DATE_STATUSES,
  TOUR_DATE_STATUS_COLORS,
  TOUR_DATE_STATUS_LABELS,
  formatCurrencyBRL,
  formatDatePt,
  weekdayLabel,
  type TourDate,
  type TourDateStatus,
} from '@tour/core'
import { BedDouble, Briefcase, ChevronDown, Clock, ListChecks, Music, Pencil, Pin, Route, Wallet } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '../../../components/ui/Button'
import { Badge } from '../../../components/ui/Chip'
import { Spinner } from '../../../components/ui/Spinner'
import { cn } from '../../../lib/cn'
import { capitalize } from '../../../lib/text'
import { errorMessage } from '../../../lib/errorMessage'
import {
  STATUS_MARKER_COLORS,
  asTourDateStatus,
  checklistLabel,
  checklistProgress,
  cityLabel,
  joinNamesPt,
  legLabel,
  timesSummary,
  type Leg,
  type ResolvedTourDate,
} from './helpers'
import { useUpdateTourDate } from './useTourDateMutations'

export type DateCardProps = {
  resolved: ResolvedTourDate
  /** Position in the timeline (0-based); shown as the stop number. */
  index: number
  tourId: string
  canEdit: boolean
  onEdit: (date: TourDate) => void
}

function DetailRow({ icon, children, title }: { icon: ReactNode; children: ReactNode; title?: string }) {
  return (
    <p className="flex items-start gap-1.5 text-xs text-ink-muted" title={title}>
      <span className="mt-0.5 shrink-0" aria-hidden>
        {icon}
      </span>
      <span className="min-w-0 break-words">{children}</span>
    </p>
  )
}

/** Status as a coloured <select> (editors) or a static badge (viewers). */
function StatusControl({
  status,
  canEdit,
  pending,
  onChange,
}: {
  status: TourDateStatus
  canEdit: boolean
  pending: boolean
  onChange: (next: TourDateStatus) => void
}) {
  if (!canEdit) return <Badge className={TOUR_DATE_STATUS_COLORS[status]}>{TOUR_DATE_STATUS_LABELS[status]}</Badge>
  return (
    <div className="relative shrink-0">
      <select
        aria-label="Status da data"
        value={status}
        disabled={pending}
        onChange={(e) => {
          const next = asTourDateStatus(e.target.value)
          if (next && next !== status) onChange(next)
        }}
        className={cn(
          'h-7 cursor-pointer appearance-none rounded-full pr-7 pl-2.5 text-[11px] font-medium focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400 disabled:cursor-wait disabled:opacity-70',
          TOUR_DATE_STATUS_COLORS[status],
        )}
      >
        {TOUR_DATE_STATUSES.map((s) => (
          <option key={s} value={s} className="bg-surface-1 text-ink">
            {TOUR_DATE_STATUS_LABELS[s]}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2">
        {pending ? <Spinner className="h-3 w-3 border-white/40 border-t-white" /> : <ChevronDown className="h-3 w-3" aria-hidden />}
      </span>
    </div>
  )
}

/** One date of the timeline. Changing the status saves immediately (optimistic). */
export function DateCard({ resolved, index, tourId, canEdit, onEdit }: DateCardProps) {
  const { date, city, venue, producer, bands } = resolved
  const statusMutation = useUpdateTourDate(tourId)
  const times = timesSummary(date)
  const progress = checklistProgress(date.checklist)
  const feeLabel = date.feeCents !== null ? formatCurrencyBRL(date.feeCents) : null
  const dealLabel = date.dealType ? DEAL_TYPE_LABELS[date.dealType] : null
  const place = city ? cityLabel(city) : 'Sem cidade'

  return (
    <li>
      <article
        aria-label={`Data ${index + 1}: ${capitalize(formatDatePt(date.date, 'short'))}`}
        className={cn(
          'rounded-2xl border border-surface-2 bg-surface-1 p-4 transition-colors',
          date.status === 'cancelado' && 'opacity-70',
        )}
      >
        <div className="flex items-start gap-3">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-white/80 text-sm font-bold text-white shadow"
            style={{ background: STATUS_MARKER_COLORS[date.status] }}
            aria-hidden
          >
            {index + 1}
          </span>

          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h3 className="font-semibold">{capitalize(formatDatePt(date.date, 'short'))}</h3>
              <span className="text-xs text-ink-muted">{weekdayLabel(date.date, 'long')}</span>
              {date.isFixed && (
                <span className="inline-flex items-center gap-1 text-xs text-brand-300" title="Data fixa">
                  <Pin className="h-3 w-3" aria-hidden />
                  Fixa
                </span>
              )}
            </div>
            <p className="text-sm">
              <span className={cn(!city && 'text-ink-muted')}>{place}</span>
              <span className="text-ink-muted"> · </span>
              <span className={cn(!venue && 'text-ink-muted')}>{venue?.name ?? 'Sem casa'}</span>
            </p>
          </div>

          <StatusControl
            status={date.status}
            canEdit={canEdit}
            pending={statusMutation.isPending}
            onChange={(next) => statusMutation.mutate({ dateId: date.id, patch: { status: next } })}
          />
        </div>

        {(times || feeLabel || dealLabel || date.lodging || bands.length > 0 || producer) && (
          <div className="mt-3 space-y-1.5 pl-11">
            {times && <DetailRow icon={<Clock className="h-3.5 w-3.5" />}>{times}</DetailRow>}
            {(feeLabel || dealLabel) && (
              <DetailRow icon={<Wallet className="h-3.5 w-3.5" />}>
                {feeLabel ? <span className="text-ink">{feeLabel}</span> : 'Sem cachê definido'}
                {dealLabel && <> · {dealLabel}</>}
                {date.costCents !== null && <> · custos {formatCurrencyBRL(date.costCents)}</>}
              </DetailRow>
            )}
            {date.lodging && <DetailRow icon={<BedDouble className="h-3.5 w-3.5" />}>{date.lodging}</DetailRow>}
            {producer && <DetailRow icon={<Briefcase className="h-3.5 w-3.5" />}>Produtora {producer.name}</DetailRow>}
            {bands.length > 0 && (
              <DetailRow icon={<Music className="h-3.5 w-3.5" />}>Com {joinNamesPt(bands.map((b) => b.name))}</DetailRow>
            )}
          </div>
        )}

        {statusMutation.isError && (
          <p role="alert" className="mt-2 pl-11 text-xs text-red-400">
            {errorMessage(statusMutation.error, 'Não foi possível mudar o status.')}
          </p>
        )}

        <div className="mt-3 flex items-center justify-between gap-3 pl-11">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 text-xs',
              progress.total > 0 && progress.done === progress.total ? 'text-emerald-300' : 'text-ink-muted',
            )}
            title="Checklist"
          >
            <ListChecks className="h-3.5 w-3.5" aria-hidden />
            Checklist {checklistLabel(date.checklist)}
          </span>
          {canEdit && (
            <Button size="sm" variant="secondary" onClick={() => onEdit(date)}>
              <Pencil className="h-3.5 w-3.5" aria-hidden />
              Editar
            </Button>
          )}
        </div>
      </article>
    </li>
  )
}

/** Leg (km / hours) between two consecutive dates, drawn between the cards. */
export function LegConnector({ leg }: { leg: Leg | null }) {
  return (
    <li className="flex items-center gap-3 py-1 pl-7.5" aria-hidden={leg === null}>
      <span className="h-6 border-l-2 border-dashed border-surface-3" aria-hidden />
      {leg ? (
        <span className="inline-flex items-center gap-1.5 text-xs text-ink-muted">
          <Route className="h-3.5 w-3.5" aria-hidden />
          {legLabel(leg)}
        </span>
      ) : (
        <span className="text-xs text-ink-muted/70">Trecho a definir</span>
      )}
    </li>
  )
}
