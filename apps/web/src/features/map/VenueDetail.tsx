import { DEAL_TYPE_LABELS, mapsUrl, type Band, type City, type Producer, type Venue } from '@tour/core'
import { CalendarDays, CalendarPlus, ExternalLink, Locate, MapPin, Speaker, Store, Ticket, Users } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Chip'
import { AddToTourDialog } from './AddToTourDialog'
import { BandCard } from './BandCard'
import { ContactButtons, ExternalLinkButton } from './ContactButtons'
import { DetailSection, DetailShell, InfoItem } from './DetailShell'
import { GenreBadges } from './GenreBadges'
import { ProducerCard } from './ProducerCard'
import { capacityLabel, cityLabel, showDaysLabel, type CityIndex } from './filtering'

export type VenueDetailProps = {
  venue: Venue
  city: City | undefined
  /** Producers that work with this venue (producer.venueIds). */
  producers: Producer[]
  /** Bands based in the same city. */
  localBands: Band[]
  cities: CityIndex
  onShowOnMap: (venue: Venue) => void
}

export function VenueDetail({ venue, city, producers, localBands, cities, onShowOnMap }: VenueDetailProps) {
  const [addOpen, setAddOpen] = useState(false)
  const days = showDaysLabel(venue.showDays)
  const deals = venue.dealTypes.map((d) => DEAL_TYPE_LABELS[d]).join(', ')
  const gear = [venue.hasPa ? 'PA' : null, venue.hasBackline ? 'Backline' : null].filter((x): x is string => x !== null)

  return (
    <DetailShell
      kind="Casa de show"
      title={venue.name}
      icon={Store}
      accent="bg-brand-600/15 text-brand-300"
      subtitle={
        <div className="space-y-0.5">
          {city && <p>{cityLabel(city)}</p>}
          {venue.address && (
            <p className="inline-flex items-start gap-1">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              <span>{venue.address}</span>
            </p>
          )}
        </div>
      }
      badges={
        <>
          {venue.acceptsTouringBands ? (
            <Badge className="bg-emerald-900 text-emerald-100">Aceita banda de fora</Badge>
          ) : (
            <Badge className="bg-surface-2 text-ink-muted">Só bandas locais</Badge>
          )}
          {venue.status === 'pending' && <Badge className="bg-amber-900 text-amber-100">Aguardando aprovação</Badge>}
        </>
      }
      actions={
        <>
          <Button onClick={() => setAddOpen(true)}>
            <CalendarPlus className="h-4 w-4" aria-hidden />
            Adicionar a uma turnê
          </Button>
          <Button variant="secondary" onClick={() => onShowOnMap(venue)}>
            <Locate className="h-4 w-4" aria-hidden />
            Ver no mapa
          </Button>
        </>
      }
    >
      <DetailSection title="Informações">
        <div className="grid grid-cols-2 gap-2">
          <InfoItem icon={Users} label="Capacidade" value={capacityLabel(venue.capacity)} />
          <InfoItem icon={CalendarDays} label="Dias de show" value={days || 'Não informado'} />
          <InfoItem icon={Ticket} label="Acordo" value={deals || 'Não informado'} />
          <InfoItem icon={Speaker} label="Estrutura" value={gear.length > 0 ? gear.join(' + ') : 'Não informado'} />
        </div>
        {venue.genres.length > 0 && <GenreBadges genres={venue.genres} max={0} className="pt-1" />}
      </DetailSection>

      <DetailSection title="Contato">
        {venue.contactName && <p className="text-sm text-ink">{venue.contactName}</p>}
        <ContactButtons
          phone={venue.contactPhone}
          email={venue.contactEmail}
          instagram={venue.instagram}
          website={venue.website}
        />
        <ExternalLinkButton href={mapsUrl(venue)} icon={ExternalLink} className="bg-transparent text-brand-300 hover:bg-surface-2">
          Abrir no Google Maps
        </ExternalLinkButton>
      </DetailSection>

      {venue.notes && (
        <DetailSection title="Observações">
          <p className="text-sm whitespace-pre-line text-ink-muted">{venue.notes}</p>
        </DetailSection>
      )}

      <DetailSection title={`Produtoras que trabalham com a casa (${producers.length})`}>
        {producers.length === 0 ? (
          <p className="text-sm text-ink-muted">Nenhuma produtora cadastrada para essa casa.</p>
        ) : (
          <ul className="space-y-2">
            {producers.map((p) => (
              <li key={p.id}>
                <ProducerCard producer={p} cities={cities} />
              </li>
            ))}
          </ul>
        )}
      </DetailSection>

      <DetailSection title={`Bandas locais${city ? ` em ${city.name}` : ''} (${localBands.length})`}>
        {localBands.length === 0 ? (
          <p className="text-sm text-ink-muted">Nenhuma banda local cadastrada nessa cidade.</p>
        ) : (
          <ul className="space-y-2">
            {localBands.map((b) => (
              <li key={b.id}>
                <BandCard band={b} city={city} />
              </li>
            ))}
          </ul>
        )}
      </DetailSection>

      {addOpen && <AddToTourDialog venue={venue} open onClose={() => setAddOpen(false)} />}
    </DetailShell>
  )
}
