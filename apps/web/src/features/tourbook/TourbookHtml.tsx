// Read-only HTML rendering of a Tourbook (mobile preview and public page).
import { TOUR_DATE_STATUS_COLORS } from '@tour/core'
import type { Tourbook, TourbookContact, TourbookDay } from '@tour/core'
import { AtSign, BedDouble, ExternalLink, Guitar, Mail, MapPin, MessageCircle, Route, StickyNote, Wallet } from 'lucide-react'
import type { ReactNode } from 'react'
import { Card, SectionTitle } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Chip'
import { cn } from '../../lib/cn'
import {
  bandLine,
  cityLabelOf,
  contactName,
  dayCounter,
  dealLabel,
  instagramLabel,
  instagramUrl,
  mailtoUrl,
  nextLegLabel,
  routeLabel,
  safeHttpUrl,
  timeRows,
  totalsItems,
} from './tourbookHelpers'

export type TourbookHtmlProps = {
  tourbook: Tourbook
  /** Team/public version: no fees or costs anywhere. */
  hideMoney: boolean
  className?: string
}

const linkButtonClass =
  'inline-flex h-8 items-center gap-1.5 rounded-lg bg-surface-2 px-2.5 text-xs font-medium text-ink transition-colors hover:bg-surface-3'

const textLinkClass = 'inline-flex items-center gap-1 text-sm text-brand-300 hover:text-brand-200'

function ExternalAnchor({ href, className, children }: { href: string; className: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer noopener" className={className}>
      {children}
    </a>
  )
}

function ContactItem({ contact }: { contact: TourbookContact }) {
  const whatsapp = safeHttpUrl(contact.whatsappUrl)
  const mailto = mailtoUrl(contact.email)
  const ig = contact.instagram
  const igUrl = instagramUrl(ig)
  return (
    <li className="space-y-1.5 py-3 first:pt-0 last:pb-0">
      <div>
        <p className="text-xs text-ink-muted">{contact.label}</p>
        <p className="font-medium">{contactName(contact)}</p>
        {contact.phone && <p className="text-sm text-ink-muted">{contact.phone}</p>}
      </div>
      <div className="flex flex-wrap gap-2">
        {whatsapp && (
          <ExternalAnchor href={whatsapp} className={linkButtonClass}>
            <MessageCircle className="h-3.5 w-3.5" aria-hidden />
            WhatsApp
          </ExternalAnchor>
        )}
        {mailto && (
          <a href={mailto} className={linkButtonClass}>
            <Mail className="h-3.5 w-3.5" aria-hidden />
            E-mail
          </a>
        )}
        {ig &&
          (igUrl ? (
            <ExternalAnchor href={igUrl} className={linkButtonClass}>
              <AtSign className="h-3.5 w-3.5" aria-hidden />
              {instagramLabel(ig)}
            </ExternalAnchor>
          ) : (
            <span className={cn(linkButtonClass, 'cursor-default text-ink-muted')}>
              <AtSign className="h-3.5 w-3.5" aria-hidden />
              {instagramLabel(ig)}
            </span>
          ))}
      </div>
    </li>
  )
}

function DetailRow({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 shrink-0 text-ink-muted">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">{title}</p>
        <div className="text-sm">{children}</div>
      </div>
    </div>
  )
}

function CoverBlock({ tourbook, hideMoney }: { tourbook: Tourbook; hideMoney: boolean }) {
  const route = routeLabel(tourbook)
  return (
    <Card className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-300">Tourbook</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{tourbook.title}</h1>
        <p className="text-ink-muted">{tourbook.bandName}</p>
        <p className="text-sm text-ink-muted">{tourbook.period.label}</p>
      </div>
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {totalsItems(tourbook, hideMoney).map((item) => (
          <div key={item.label} className="rounded-xl bg-surface-2 p-3">
            <dd className="text-lg font-semibold">{item.value}</dd>
            <dt className="text-[11px] uppercase tracking-wide text-ink-muted">{item.label}</dt>
          </div>
        ))}
      </dl>
      {route && (
        <p className="text-sm text-ink-muted">
          <span className="font-medium text-ink">Roteiro:</span> {route}
        </p>
      )}
      {hideMoney && <p className="text-xs text-ink-muted">Valores omitidos nesta versão.</p>}
    </Card>
  )
}

function SummaryTable({ tourbook }: { tourbook: Tourbook }) {
  if (tourbook.summary.length === 0) {
    return (
      <Card>
        <SectionTitle>Resumo</SectionTitle>
        <p className="mt-2 text-sm text-ink-muted">Nenhuma data cadastrada ainda.</p>
      </Card>
    )
  }
  return (
    <Card className="p-0">
      <div className="px-4 pt-4">
        <SectionTitle>Resumo</SectionTitle>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead className="text-left text-[11px] uppercase tracking-wide text-ink-muted">
            <tr>
              <th className="px-4 py-2 font-semibold">Data</th>
              <th className="px-2 py-2 font-semibold">Cidade/UF</th>
              <th className="px-2 py-2 font-semibold">Casa</th>
              <th className="px-2 py-2 font-semibold">Show</th>
              <th className="px-4 py-2 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-2 border-t border-surface-2">
            {tourbook.summary.map((row, i) => (
              <tr key={`${row.date}-${i}`}>
                <td className="whitespace-nowrap px-4 py-2">
                  <span className="font-medium">{row.dateLabel}</span>
                  <span className="text-ink-muted"> {row.weekday}</span>
                </td>
                <td className="px-2 py-2">{row.state ? `${row.city}/${row.state}` : row.city}</td>
                <td className="px-2 py-2 text-ink-muted">{row.venue ?? '—'}</td>
                <td className="whitespace-nowrap px-2 py-2">{row.setTime ?? '—'}</td>
                <td className="px-4 py-2">
                  <Badge className={TOUR_DATE_STATUS_COLORS[row.status]}>{row.statusLabel}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function DayCard({
  day,
  index,
  total,
  hideMoney,
}: {
  day: TourbookDay
  index: number
  total: number
  hideMoney: boolean
}) {
  const times = timeRows(day.times)
  const deal = dealLabel(day.deal, hideMoney)
  const maps = safeHttpUrl(day.mapsUrl)
  const isLast = index === total - 1
  return (
    <Card id={`dia-${day.id}`} className="space-y-4">
      <header className="flex items-start justify-between gap-3 border-b border-surface-2 pb-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-300">
            {dayCounter(index, total)} · {day.weekday}
          </p>
          <h3 className="mt-0.5 text-lg font-semibold leading-tight">{day.dateLabel}</h3>
          <p className="text-ink-muted">{cityLabelOf(day)}</p>
        </div>
        <Badge className={cn('shrink-0', TOUR_DATE_STATUS_COLORS[day.status])}>{day.statusLabel}</Badge>
      </header>

      <DetailRow icon={<MapPin className="h-4 w-4" aria-hidden />} title="Casa">
        {day.venue ? (
          <>
            <p className="font-medium">{day.venue.name}</p>
            {day.address && <p className="text-ink-muted">{day.address}</p>}
            {day.venue.capacity !== null && <p className="text-xs text-ink-muted">Capacidade: {day.venue.capacity} pessoas</p>}
          </>
        ) : (
          <p className="text-ink-muted">Casa a definir</p>
        )}
        {maps && (
          <ExternalAnchor href={maps} className={cn(textLinkClass, 'mt-1')}>
            Abrir no Google Maps
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </ExternalAnchor>
        )}
      </DetailRow>

      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Horários</p>
        {times.length === 0 ? (
          <p className="text-sm text-ink-muted">Sem horários definidos</p>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {times.map((t) => (
              <div key={t.label} className="rounded-xl bg-surface-2 p-2.5">
                <p className="text-base font-semibold">{t.value}</p>
                <p className="text-[11px] uppercase tracking-wide text-ink-muted">{t.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Contatos</p>
        {day.contacts.length === 0 ? (
          <p className="text-sm text-ink-muted">Nenhum contato cadastrado</p>
        ) : (
          <ul className="divide-y divide-surface-2">
            {day.contacts.map((contact, i) => (
              <ContactItem key={`${contact.label}-${i}`} contact={contact} />
            ))}
          </ul>
        )}
      </div>

      {deal && (
        <DetailRow icon={<Wallet className="h-4 w-4" aria-hidden />} title="Acordo / cachê">
          <p>{deal}</p>
        </DetailRow>
      )}

      {day.lodging && (
        <DetailRow icon={<BedDouble className="h-4 w-4" aria-hidden />} title="Hospedagem">
          <p className="whitespace-pre-line">{day.lodging}</p>
        </DetailRow>
      )}

      {day.bands.length > 0 && (
        <DetailRow icon={<Guitar className="h-4 w-4" aria-hidden />} title="Bandas da noite">
          <ul className="list-disc pl-4">
            {day.bands.map((band, i) => (
              <li key={`${band.name}-${i}`}>{bandLine(band)}</li>
            ))}
          </ul>
        </DetailRow>
      )}

      {day.notes && (
        <DetailRow icon={<StickyNote className="h-4 w-4" aria-hidden />} title="Observações">
          <p className="whitespace-pre-line">{day.notes}</p>
        </DetailRow>
      )}

      {(day.nextLeg || isLast) && (
        <footer className="flex items-center gap-2 rounded-xl border-l-2 border-brand-600 bg-surface-2 px-3 py-2 text-sm">
          <Route className="h-4 w-4 shrink-0 text-brand-300" aria-hidden />
          <span className="font-medium">{day.nextLeg ? nextLegLabel(day.nextLeg) : 'Último show da turnê.'}</span>
        </footer>
      )}
    </Card>
  )
}

function ContactsBlock({ tourbook }: { tourbook: Tourbook }) {
  return (
    <Card>
      <SectionTitle>Contatos</SectionTitle>
      {tourbook.contacts.length === 0 ? (
        <p className="mt-2 text-sm text-ink-muted">Nenhum contato cadastrado nas datas da turnê.</p>
      ) : (
        <ul className="mt-2 divide-y divide-surface-2">
          {tourbook.contacts.map((contact, i) => (
            <ContactItem key={`${contact.label}-${i}`} contact={contact} />
          ))}
        </ul>
      )}
    </Card>
  )
}

export function TourbookHtml({ tourbook, hideMoney, className }: TourbookHtmlProps) {
  const total = tourbook.days.length
  return (
    <div className={cn('space-y-6', className)}>
      <CoverBlock tourbook={tourbook} hideMoney={hideMoney} />
      <SummaryTable tourbook={tourbook} />
      {total > 0 && (
        <section className="space-y-3" aria-label="Dia a dia">
          <SectionTitle className="px-1">Dia a dia</SectionTitle>
          {tourbook.days.map((day, index) => (
            <DayCard key={day.id} day={day} index={index} total={total} hideMoney={hideMoney} />
          ))}
        </section>
      )}
      <ContactsBlock tourbook={tourbook} />
    </div>
  )
}
