import type { City, Producer, Venue } from '@tour/core'
import { Locate, MapPin, Mic } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Chip'
import { ContactButtons } from './ContactButtons'
import { DetailSection, DetailShell } from './DetailShell'
import { GenreBadges } from './GenreBadges'
import { VenueCard } from './VenueCard'
import { cityLabel, type CityIndex } from './filtering'

export type ProducerDetailProps = {
  producer: Producer
  cities: CityIndex
  /** Venues the producer works with, sorted by name. */
  venues: Venue[]
  onShowCities: (cities: City[]) => void
}

export function ProducerDetail({ producer, cities, venues, onShowCities }: ProducerDetailProps) {
  const base = producer.cityId ? cities.get(producer.cityId) : undefined
  const served = producer.cityIds
    .map((id) => cities.get(id))
    .filter((c): c is City => c !== undefined)
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))

  return (
    <DetailShell
      kind="Produtora"
      title={producer.name}
      icon={Mic}
      accent="bg-sky-500/15 text-sky-300"
      subtitle={base ? `Base em ${cityLabel(base)}` : 'Cidade-base não informada'}
      actions={
        served.length > 0 ? (
          <Button variant="secondary" onClick={() => onShowCities(served)}>
            <Locate className="h-4 w-4" aria-hidden />
            Ver cidades no mapa
          </Button>
        ) : undefined
      }
    >
      <DetailSection title={`Cidades atendidas (${served.length})`}>
        {served.length === 0 ? (
          <p className="text-sm text-ink-muted">Nenhuma cidade cadastrada.</p>
        ) : (
          <ul className="flex flex-wrap gap-1.5">
            {served.map((c) => (
              <li key={c.id}>
                <Badge className="gap-1 bg-surface-2 text-ink">
                  <MapPin className="h-3 w-3 text-ink-muted" aria-hidden />
                  {cityLabel(c)}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </DetailSection>

      {producer.genres.length > 0 && (
        <DetailSection title="Gêneros">
          <GenreBadges genres={producer.genres} max={0} />
        </DetailSection>
      )}

      <DetailSection title="Contato">
        {producer.contactName && <p className="text-sm text-ink">{producer.contactName}</p>}
        <ContactButtons
          phone={producer.contactPhone}
          email={producer.contactEmail}
          instagram={producer.instagram}
          website={producer.website}
        />
      </DetailSection>

      {producer.notes && (
        <DetailSection title="Observações">
          <p className="text-sm whitespace-pre-line text-ink-muted">{producer.notes}</p>
        </DetailSection>
      )}

      <DetailSection title={`Casas com que trabalha (${venues.length})`}>
        {venues.length === 0 ? (
          <p className="text-sm text-ink-muted">Nenhuma casa cadastrada para essa produtora.</p>
        ) : (
          <ul className="space-y-2">
            {venues.map((v) => (
              <li key={v.id}>
                <VenueCard venue={v} city={cities.get(v.cityId)} />
              </li>
            ))}
          </ul>
        )}
      </DetailSection>
    </DetailShell>
  )
}
