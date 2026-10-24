import { useQuery } from '@tanstack/react-query'
import { fetchMySubmissions, type Venue } from '@tour/core'
import { Clock, MapPin, Store } from 'lucide-react'
import { useEffect } from 'react'
import { useLocation } from 'react-router'
import { queryKeys } from '../../app/queryClient'
import { Badge } from '../../components/ui/Chip'
import { Card, SectionTitle } from '../../components/ui/Card'
import { EmptyState, ErrorState } from '../../components/ui/EmptyState'
import { Spinner } from '../../components/ui/Spinner'
import { useRegionData, useRegionIndex } from '../../hooks/useRegionData'
import { client } from '../../lib/firebase'
import { capacityLabel, cityLabel, showDaysLabel } from '../map/filtering'
import { errorMessage } from '../../lib/errorMessage'
import {
  MY_SUBMISSIONS_ANCHOR,
  SUBMISSION_STATUS_CLASSES,
  SUBMISSION_STATUS_LABELS,
  formatTimestampPt,
} from './venueForm'
export type MySubmissionsProps = {
  userId: string
  /** Scrolls the form into view (empty-state action). */
  onSuggest?: () => void
}

function SubmissionRow({ venue, cityName }: { venue: Venue; cityName: string }) {
  const sentAt = formatTimestampPt(venue.createdAt)
  const days = showDaysLabel(venue.showDays)
  return (
    <li>
      <Card className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600/15 text-brand-300">
          <Store className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="min-w-0 truncate font-medium">{venue.name}</h3>
            <Badge className={SUBMISSION_STATUS_CLASSES[venue.status]}>{SUBMISSION_STATUS_LABELS[venue.status]}</Badge>
          </div>
          <p className="flex items-center gap-1 text-sm text-ink-muted">
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="truncate">{venue.address ? `${cityName} · ${venue.address}` : cityName}</span>
          </p>
          <p className="text-xs text-ink-muted">
            {[capacityLabel(venue.capacity), days ? `Shows: ${days}` : null].filter(Boolean).join(' · ')}
          </p>
          {sentAt && (
            <p className="flex items-center gap-1 text-xs text-ink-muted">
              <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Enviada em {sentAt}
            </p>
          )}
          {venue.status === 'rejected' && (
            <p className="text-xs text-red-300">Recusada pela moderação. Se achar que foi engano, envie de novo com mais detalhes.</p>
          )}
          {venue.status === 'verified' && <p className="text-xs text-emerald-300">Já está no mapa. Valeu por fortalecer a cena!</p>}
        </div>
      </Card>
    </li>
  )
}

/** The venues this user suggested, newest first, with moderation status. */
export function MySubmissions({ userId, onSuggest }: MySubmissionsProps) {
  const submissions = useQuery({
    queryKey: queryKeys.mySubmissions(userId),
    queryFn: () => fetchMySubmissions(client, userId),
  })
  const region = useRegionData()
  const index = useRegionIndex(region.data)
  const { hash } = useLocation()

  // Deep link from the profile page (/casas/sugerir#minhas-sugestoes).
  const anchored = hash === `#${MY_SUBMISSIONS_ANCHOR}`
  useEffect(() => {
    if (!anchored || !submissions.isSuccess) return
    document.getElementById(MY_SUBMISSIONS_ANCHOR)?.scrollIntoView({ block: 'start' })
  }, [anchored, submissions.isSuccess])

  const cityName = (cityId: string): string => {
    const city = index.cities.get(cityId)
    return city ? cityLabel(city) : cityId
  }

  return (
    <section id={MY_SUBMISSIONS_ANCHOR} className="scroll-mt-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <SectionTitle>Minhas sugestões</SectionTitle>
        {submissions.isSuccess && submissions.data.length > 0 && (
          <span className="text-xs text-ink-muted">{submissions.data.length}</span>
        )}
      </div>

      {submissions.isPending && (
        <div className="flex items-center justify-center py-8">
          <Spinner className="h-6 w-6" />
        </div>
      )}

      {submissions.isError && (
        <ErrorState
          message={errorMessage(submissions.error, 'Não deu para carregar suas sugestões.')}
          onRetry={() => void submissions.refetch()}
        />
      )}

      {submissions.isSuccess && submissions.data.length === 0 && (
        <div className="rounded-2xl border border-surface-2 bg-surface-1">
          <EmptyState
            icon={<Store className="h-8 w-8" aria-hidden />}
            title="Você ainda não sugeriu nenhuma casa"
            description="Conhece um lugar que recebe show e não está no mapa? Preencha o formulário acima."
            action={
              onSuggest && (
                <button type="button" onClick={onSuggest} className="text-sm text-brand-300 underline">
                  Sugerir uma casa
                </button>
              )
            }
          />
        </div>
      )}

      {submissions.isSuccess && submissions.data.length > 0 && (
        <ul className="space-y-3">
          {submissions.data.map((venue) => (
            <SubmissionRow key={venue.id} venue={venue} cityName={cityName(venue.cityId)} />
          ))}
        </ul>
      )}
    </section>
  )
}
