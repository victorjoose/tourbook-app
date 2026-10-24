import { DEAL_TYPE_LABELS, mapsUrl, type City, type Venue } from '@tour/core'
import { Check, ChevronDown, Clock, ExternalLink, MapPin, UserRound, X } from 'lucide-react'
import { useId, useMemo, type ReactNode } from 'react'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Chip'
import { cn } from '../../lib/cn'
import { ContactButtons, ExternalLinkButton } from '../map/ContactButtons'
import { GenreBadges } from '../map/GenreBadges'
import { MapView, type MapStop } from '../map/MapView'
import { capacityLabel, cityLabel, showDaysLabel } from '../map/filtering'
import { formatTimestampPt, gearLabel } from './venueForm'

export type ModerationStatus = 'verified' | 'rejected'

export type PendingVenueCardProps = {
  venue: Venue
  city: City | undefined
  expanded: boolean
  onToggle: () => void
  onModerate: (status: ModerationStatus) => void
  /** True while this venue is being approved/rejected. */
  busy: boolean
  error: string | null
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  )
}

function yesNo(v: boolean): string {
  return v ? 'Sim' : 'Não'
}

/** One pending venue: summary row, expandable details with a mini map, approve/reject. */
export function PendingVenueCard({ venue, city, expanded, onToggle, onModerate, busy, error }: PendingVenueCardProps) {
  const detailsId = useId()
  const stops = useMemo<MapStop[]>(
    () => [{ id: venue.id, lat: venue.lat, lng: venue.lng, label: '', title: venue.name }],
    [venue.id, venue.lat, venue.lng, venue.name],
  )
  const place = city ? cityLabel(city) : venue.cityId
  const sentAt = formatTimestampPt(venue.createdAt)
  const deals = venue.dealTypes.map((d) => DEAL_TYPE_LABELS[d]).join(', ')
  const days = showDaysLabel(venue.showDays)

  return (
    <div className={cn('space-y-4 rounded-2xl border bg-surface-1', expanded ? 'border-surface-3' : 'border-surface-2')}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={detailsId}
        className="flex w-full items-start gap-3 rounded-2xl p-4 text-left transition-colors hover:bg-surface-2/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400"
      >
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="min-w-0 truncate font-medium">{venue.name}</h3>
            <Badge className="bg-amber-900 text-amber-100">Pendente</Badge>
          </div>
          <p className="flex items-center gap-1 text-sm text-ink-muted">
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="truncate">{venue.address ? `${place} · ${venue.address}` : place}</span>
          </p>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
            {sentAt && (
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" aria-hidden />
                {sentAt}
              </span>
            )}
            {venue.submittedBy && (
              <span className="inline-flex items-center gap-1" title={venue.submittedBy}>
                <UserRound className="h-3.5 w-3.5" aria-hidden />
                <span className="font-mono">{venue.submittedBy.slice(0, 8)}…</span>
              </span>
            )}
          </p>
        </div>
        <ChevronDown className={cn('mt-1 h-5 w-5 shrink-0 text-ink-muted transition-transform', expanded && 'rotate-180')} aria-hidden />
      </button>

      {expanded && (
        <div id={detailsId} className="space-y-4 px-4 pb-4">
          <div className="h-48 overflow-hidden rounded-xl border border-surface-2 md:h-56">
            <MapView center={{ lat: venue.lat, lng: venue.lng }} zoom={14} stops={stops} />
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 md:grid-cols-3">
            <Row label="Cidade">{place}</Row>
            <Row label="Endereço">{venue.address ?? 'Não informado'}</Row>
            <Row label="Coordenadas">
              <span className="font-mono text-xs">
                {venue.lat.toFixed(5)}, {venue.lng.toFixed(5)}
              </span>
            </Row>
            <Row label="Capacidade">{capacityLabel(venue.capacity)}</Row>
            <Row label="Dias de show">{days || 'Não informado'}</Row>
            <Row label="Acordo">{deals || 'Não informado'}</Row>
            <Row label="Estrutura">{gearLabel(venue)}</Row>
            <Row label="Aceita bandas de fora">{yesNo(venue.acceptsTouringBands)}</Row>
            <Row label="Contato">{venue.contactName ?? 'Não informado'}</Row>
            <Row label="Telefone">{venue.contactPhone ?? '—'}</Row>
            <Row label="E-mail">{venue.contactEmail ?? '—'}</Row>
            <Row label="Instagram">{venue.instagram ?? '—'}</Row>
            <Row label="Site">
              {venue.website ? (
                <a href={venue.website} target="_blank" rel="noreferrer" className="break-all text-brand-300 underline">
                  {venue.website}
                </a>
              ) : (
                '—'
              )}
            </Row>
            <Row label="Enviada por">
              <span className="font-mono text-xs break-all">{venue.submittedBy ?? '—'}</span>
            </Row>
            <Row label="Enviada em">{sentAt || '—'}</Row>
          </dl>

          <div className="space-y-1">
            <p className="text-xs text-ink-muted">Gêneros</p>
            {venue.genres.length > 0 ? <GenreBadges genres={venue.genres} max={0} /> : <p className="text-sm">Não informado</p>}
          </div>

          {venue.notes && (
            <div className="space-y-1">
              <p className="text-xs text-ink-muted">Observações</p>
              <p className="text-sm whitespace-pre-line">{venue.notes}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <ContactButtons phone={venue.contactPhone} email={venue.contactEmail} instagram={venue.instagram} website={venue.website} />
            <ExternalLinkButton href={mapsUrl(venue)} icon={ExternalLink}>
              Google Maps
            </ExternalLinkButton>
          </div>

          {error && (
            <p className="text-sm text-red-400" role="alert">
              {error}
            </p>
          )}

          <div className="flex flex-col gap-2 border-t border-surface-2 pt-4 md:flex-row md:justify-end">
            <Button variant="danger" disabled={busy} onClick={() => onModerate('rejected')}>
              <X className="h-4 w-4" aria-hidden />
              Recusar
            </Button>
            <Button disabled={busy} onClick={() => onModerate('verified')}>
              <Check className="h-4 w-4" aria-hidden />
              {busy ? 'Salvando…' : 'Aprovar'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
