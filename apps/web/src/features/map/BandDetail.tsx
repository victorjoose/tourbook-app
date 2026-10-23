import type { Band, City } from '@tour/core'
import { AtSign, Disc3, Guitar, Locate, Music, Play } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Chip'
import { ContactButtons, ExternalLinkButton } from './ContactButtons'
import { DetailSection, DetailShell } from './DetailShell'
import { GenreBadges } from './GenreBadges'
import { cityLabel, instagramUrl } from './filtering'

export type BandDetailProps = {
  band: Band
  city: City | undefined
  onShowCity: (city: City) => void
}

export function BandDetail({ band, city, onShowCity }: BandDetailProps) {
  const { spotify, instagram, youtube, bandcamp } = band.links
  const hasLinks = Boolean(spotify || instagram || youtube || bandcamp)

  return (
    <DetailShell
      kind="Banda"
      title={band.name}
      icon={Guitar}
      accent="bg-emerald-500/15 text-emerald-300"
      subtitle={city ? cityLabel(city) : 'Cidade não informada'}
      badges={
        band.opensForTouring ? (
          <Badge className="bg-emerald-900 text-emerald-100">Topa abrir show</Badge>
        ) : (
          <Badge className="bg-surface-2 text-ink-muted">Não abre show de banda de fora</Badge>
        )
      }
      actions={
        city ? (
          <Button variant="secondary" onClick={() => onShowCity(city)}>
            <Locate className="h-4 w-4" aria-hidden />
            Ver cidade no mapa
          </Button>
        ) : undefined
      }
    >
      {band.genres.length > 0 && (
        <DetailSection title="Gêneros">
          <GenreBadges genres={band.genres} max={0} />
        </DetailSection>
      )}

      <DetailSection title="Ouvir e seguir">
        {hasLinks ? (
          <div className="flex flex-wrap gap-2">
            {spotify && (
              <ExternalLinkButton href={spotify} icon={Music}>
                Spotify
              </ExternalLinkButton>
            )}
            {instagram && (
              <ExternalLinkButton href={instagramUrl(instagram)} icon={AtSign}>
                Instagram
              </ExternalLinkButton>
            )}
            {youtube && (
              <ExternalLinkButton href={youtube} icon={Play}>
                YouTube
              </ExternalLinkButton>
            )}
            {bandcamp && (
              <ExternalLinkButton href={bandcamp} icon={Disc3}>
                Bandcamp
              </ExternalLinkButton>
            )}
          </div>
        ) : (
          <p className="text-sm text-ink-muted">Nenhum link cadastrado.</p>
        )}
      </DetailSection>

      <DetailSection title="Contato">
        {band.contactName && <p className="text-sm text-ink">{band.contactName}</p>}
        <ContactButtons phone={band.contactPhone} email={band.contactEmail} />
      </DetailSection>

      {band.notes && (
        <DetailSection title="Observações">
          <p className="text-sm whitespace-pre-line text-ink-muted">{band.notes}</p>
        </DetailSection>
      )}
    </DetailShell>
  )
}
