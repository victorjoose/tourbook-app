// Tourbook as a @react-pdf document: cover, summary table, one page per day, contacts.
// Built-in Helvetica only; the only images are the QR codes received through props.
import { Document, Image, Link, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import type { Tourbook, TourbookContact, TourbookDay, TourDateStatus } from '@tour/core'
import type { ReactNode } from 'react'
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
  timeRows,
  totalsItems,
} from './tourbookHelpers'

export type TourbookDocumentProps = {
  tourbook: Tourbook
  /** QR code data URLs by day id (see useTourbookPdf). */
  qrByDayId: Record<string, string>
  /** Team version: no fees or costs anywhere. */
  hideMoney: boolean
}

const BRAND = '#e11d48'
const INK = '#18181b'
const MUTED = '#71717a'
const LINE = '#e4e4e7'
const SOFT = '#fafafa'
const WHITE = '#ffffff'

const STATUS_COLORS: Record<TourDateStatus, { bg: string; fg: string }> = {
  ideia: { bg: '#f4f4f5', fg: '#3f3f46' },
  contato_feito: { bg: '#e0f2fe', fg: '#075985' },
  negociando: { bg: '#fef3c7', fg: '#92400e' },
  confirmado: { bg: '#d1fae5', fg: '#065f46' },
  realizado: { bg: '#a7f3d0', fg: '#064e3b' },
  cancelado: { bg: '#fee2e2', fg: '#991b1b' },
}

const styles = StyleSheet.create({
  // No page-level lineHeight: an inherited one makes the absolutely positioned fixed footer vanish.
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: INK,
    backgroundColor: WHITE,
    paddingTop: 44,
    paddingBottom: 64,
    paddingHorizontal: 44,
  },
  footer: {
    position: 'absolute',
    left: 44,
    right: 44,
    bottom: 26,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: LINE,
    paddingTop: 6,
    fontSize: 8,
    color: MUTED,
  },
  cover: { flex: 1, justifyContent: 'center' },
  eyebrow: {
    fontSize: 9,
    fontWeight: 700,
    color: BRAND,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  title: { fontSize: 30, fontWeight: 700, color: BRAND, lineHeight: 1.1, marginBottom: 10 },
  subtitle: { fontSize: 16, marginBottom: 2 },
  muted: { color: MUTED },
  small: { fontSize: 9 },
  bold: { fontWeight: 700 },
  h2: { fontSize: 18, fontWeight: 700, color: BRAND, marginBottom: 14 },
  sectionTitle: {
    fontSize: 8,
    fontWeight: 700,
    color: MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  section: { marginTop: 14 },
  totalsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 26 },
  totalBox: { width: '31%', borderWidth: 1, borderColor: LINE, borderRadius: 6, padding: 10 },
  totalValue: { fontSize: 18, fontWeight: 700 },
  totalLabel: { fontSize: 7, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 },
  route: { marginTop: 22, fontSize: 9, color: MUTED },
  table: { borderWidth: 1, borderColor: LINE, borderRadius: 6 },
  tr: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: LINE,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  trHead: { backgroundColor: SOFT },
  trLast: { borderBottomWidth: 0 },
  th: { fontSize: 7, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5 },
  td: { fontSize: 9 },
  colDate: { width: '14%' },
  colWeekday: { width: '9%' },
  colCity: { width: '26%' },
  colVenue: { width: '27%' },
  colTime: { width: '9%' },
  colStatus: { width: '15%' },
  dayHeader: { borderBottomWidth: 2, borderBottomColor: BRAND, paddingBottom: 10, marginBottom: 14 },
  dayHeaderTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dayDate: { fontSize: 22, fontWeight: 700, lineHeight: 1.15 },
  dayCity: { fontSize: 14, marginTop: 4 },
  badge: {
    borderRadius: 999,
    paddingVertical: 2,
    paddingHorizontal: 8,
    fontSize: 8,
    fontWeight: 700,
  },
  venueRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  venueBody: { flex: 1 },
  venueName: { fontSize: 13, fontWeight: 700 },
  link: { color: BRAND, textDecoration: 'none' },
  qrBox: { width: 84, alignItems: 'center', textDecoration: 'none' },
  qr: { width: 72, height: 72 },
  qrCaption: { fontSize: 7, color: BRAND, marginTop: 2 },
  timesRow: { flexDirection: 'row', gap: 8 },
  timeBox: { flex: 1, backgroundColor: SOFT, borderRadius: 6, padding: 8 },
  timeValue: { fontSize: 14, fontWeight: 700 },
  timeLabel: { fontSize: 7, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5 },
  contactRow: { flexDirection: 'row', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: LINE },
  contactLabel: { width: '30%', color: MUTED, paddingRight: 8 },
  contactBody: { flex: 1 },
  nextLeg: {
    marginTop: 18,
    backgroundColor: SOFT,
    borderLeftWidth: 3,
    borderLeftColor: BRAND,
    padding: 10,
  },
})

function Footer({ tourbook }: { tourbook: Tourbook }) {
  return (
    <View style={styles.footer} fixed>
      <Text>
        {tourbook.bandName} · {tourbook.title}
      </Text>
      <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} fixed />
    </View>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  )
}

function ContactRow({ contact }: { contact: TourbookContact }) {
  const ig = contact.instagram
  const igUrl = instagramUrl(ig)
  const mailto = mailtoUrl(contact.email)
  return (
    <View style={styles.contactRow} wrap={false}>
      <Text style={[styles.contactLabel, styles.small]}>{contact.label}</Text>
      <View style={styles.contactBody}>
        <Text style={styles.bold}>{contactName(contact)}</Text>
        {contact.phone && (
          <Text style={styles.small}>
            {contact.whatsappUrl ? (
              <Link src={contact.whatsappUrl} style={styles.link}>
                {contact.phone}
              </Link>
            ) : (
              contact.phone
            )}
            {' · WhatsApp'}
          </Text>
        )}
        {contact.email && (
          <Text style={styles.small}>
            {mailto ? (
              <Link src={mailto} style={styles.link}>
                {contact.email}
              </Link>
            ) : (
              contact.email
            )}
          </Text>
        )}
        {ig && (
          <Text style={styles.small}>
            {igUrl ? (
              <Link src={igUrl} style={styles.link}>
                {instagramLabel(ig)}
              </Link>
            ) : (
              instagramLabel(ig)
            )}
          </Text>
        )}
      </View>
    </View>
  )
}

function CoverPage({ tourbook, hideMoney }: { tourbook: Tourbook; hideMoney: boolean }) {
  const route = routeLabel(tourbook)
  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.cover}>
        <Text style={styles.eyebrow}>Tourbook</Text>
        <Text style={styles.title}>{tourbook.title}</Text>
        <Text style={styles.subtitle}>{tourbook.bandName}</Text>
        <Text style={[styles.subtitle, styles.muted]}>{tourbook.period.label}</Text>
        <View style={styles.totalsRow}>
          {totalsItems(tourbook, hideMoney).map((item) => (
            <View key={item.label} style={styles.totalBox}>
              <Text style={styles.totalValue}>{item.value}</Text>
              <Text style={styles.totalLabel}>{item.label}</Text>
            </View>
          ))}
        </View>
        {route && <Text style={styles.route}>Roteiro: {route}</Text>}
        {hideMoney && <Text style={[styles.route, { marginTop: 8 }]}>Valores omitidos nesta versão.</Text>}
      </View>
      <Footer tourbook={tourbook} />
    </Page>
  )
}

function SummaryPage({ tourbook }: { tourbook: Tourbook }) {
  const rows = tourbook.summary
  return (
    <Page size="A4" style={styles.page}>
      <Text style={styles.h2}>Resumo</Text>
      {rows.length === 0 ? (
        <Text style={styles.muted}>Nenhuma data cadastrada.</Text>
      ) : (
        <View style={styles.table}>
          <View style={[styles.tr, styles.trHead]} fixed>
            <Text style={[styles.th, styles.colDate]}>Data</Text>
            <Text style={[styles.th, styles.colWeekday]}>Dia</Text>
            <Text style={[styles.th, styles.colCity]}>Cidade/UF</Text>
            <Text style={[styles.th, styles.colVenue]}>Casa</Text>
            <Text style={[styles.th, styles.colTime]}>Show</Text>
            <Text style={[styles.th, styles.colStatus]}>Status</Text>
          </View>
          {rows.map((row, i) => (
            <View key={`${row.date}-${i}`} style={[styles.tr, i === rows.length - 1 ? styles.trLast : undefined]} wrap={false}>
              <Text style={[styles.td, styles.colDate]}>{row.dateLabel}</Text>
              <Text style={[styles.td, styles.colWeekday]}>{row.weekday}</Text>
              <Text style={[styles.td, styles.colCity]}>{row.state ? `${row.city}/${row.state}` : row.city}</Text>
              <Text style={[styles.td, styles.colVenue]}>{row.venue ?? '—'}</Text>
              <Text style={[styles.td, styles.colTime]}>{row.setTime ?? '—'}</Text>
              <Text style={[styles.td, styles.colStatus]}>{row.statusLabel}</Text>
            </View>
          ))}
        </View>
      )}
      <Footer tourbook={tourbook} />
    </Page>
  )
}

function DayPage({
  tourbook,
  day,
  index,
  qr,
  hideMoney,
}: {
  tourbook: Tourbook
  day: TourbookDay
  index: number
  qr: string | undefined
  hideMoney: boolean
}) {
  const total = tourbook.days.length
  const status = STATUS_COLORS[day.status]
  const times = timeRows(day.times)
  const deal = dealLabel(day.deal, hideMoney)
  const isLast = index === total - 1
  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.dayHeader}>
        <View style={styles.dayHeaderTop}>
          <Text style={styles.eyebrow}>
            {dayCounter(index, total)} · {day.weekday}
          </Text>
          <Text style={[styles.badge, { backgroundColor: status.bg, color: status.fg }]}>{day.statusLabel}</Text>
        </View>
        <Text style={styles.dayDate}>{day.dateLabel}</Text>
        <Text style={styles.dayCity}>{cityLabelOf(day)}</Text>
      </View>

      <View style={styles.venueRow}>
        <View style={styles.venueBody}>
          <Text style={styles.sectionTitle}>Casa</Text>
          {day.venue ? (
            <>
              <Text style={styles.venueName}>{day.venue.name}</Text>
              {day.address && <Text style={styles.muted}>{day.address}</Text>}
              {day.venue.capacity !== null && (
                <Text style={[styles.muted, styles.small]}>Capacidade: {day.venue.capacity} pessoas</Text>
              )}
            </>
          ) : (
            <Text style={styles.muted}>Casa a definir</Text>
          )}
          {day.mapsUrl && (
            <Text style={[styles.small, { marginTop: 4 }]}>
              <Link src={day.mapsUrl} style={styles.link}>
                Abrir no Google Maps
              </Link>
            </Text>
          )}
        </View>
        {qr && day.mapsUrl && (
          <Link src={day.mapsUrl} style={styles.qrBox}>
            <Image src={qr} style={styles.qr} />
            <Text style={styles.qrCaption}>Rota no Maps</Text>
          </Link>
        )}
      </View>

      <Section title="Horários">
        {times.length === 0 ? (
          <Text style={styles.muted}>Sem horários definidos</Text>
        ) : (
          <View style={styles.timesRow}>
            {times.map((t) => (
              <View key={t.label} style={styles.timeBox}>
                <Text style={styles.timeValue}>{t.value}</Text>
                <Text style={styles.timeLabel}>{t.label}</Text>
              </View>
            ))}
          </View>
        )}
      </Section>

      <Section title="Contatos">
        {day.contacts.length === 0 ? (
          <Text style={styles.muted}>Nenhum contato cadastrado</Text>
        ) : (
          day.contacts.map((contact, i) => <ContactRow key={`${contact.label}-${i}`} contact={contact} />)
        )}
      </Section>

      {deal && (
        <Section title="Acordo / cachê">
          <Text>{deal}</Text>
        </Section>
      )}

      {day.lodging && (
        <Section title="Hospedagem">
          <Text>{day.lodging}</Text>
        </Section>
      )}

      {day.bands.length > 0 && (
        <Section title="Bandas da noite">
          {day.bands.map((band, i) => (
            <Text key={`${band.name}-${i}`}>• {bandLine(band)}</Text>
          ))}
        </Section>
      )}

      {day.notes && (
        <Section title="Observações">
          <Text>{day.notes}</Text>
        </Section>
      )}

      {day.nextLeg ? (
        <View style={styles.nextLeg} wrap={false}>
          <Text style={styles.bold}>{nextLegLabel(day.nextLeg)}</Text>
        </View>
      ) : (
        isLast && (
          <View style={styles.nextLeg} wrap={false}>
            <Text style={styles.bold}>Último show da turnê.</Text>
          </View>
        )
      )}

      <Footer tourbook={tourbook} />
    </Page>
  )
}

function ContactsPage({ tourbook }: { tourbook: Tourbook }) {
  return (
    <Page size="A4" style={styles.page}>
      <Text style={styles.h2}>Contatos</Text>
      {tourbook.contacts.length === 0 ? (
        <Text style={styles.muted}>Nenhum contato cadastrado nas datas da turnê.</Text>
      ) : (
        tourbook.contacts.map((contact, i) => <ContactRow key={`${contact.label}-${i}`} contact={contact} />)
      )}
      <Footer tourbook={tourbook} />
    </Page>
  )
}

export function TourbookDocument({ tourbook, qrByDayId, hideMoney }: TourbookDocumentProps) {
  return (
    <Document
      title={`${tourbook.title} — Tourbook`}
      author={tourbook.bandName}
      subject={`Tourbook · ${tourbook.period.label}`}
      creator="Tour App"
      producer="Tour App"
      language="pt-BR"
    >
      <CoverPage tourbook={tourbook} hideMoney={hideMoney} />
      <SummaryPage tourbook={tourbook} />
      {tourbook.days.map((day, index) => (
        <DayPage key={day.id} tourbook={tourbook} day={day} index={index} qr={qrByDayId[day.id]} hideMoney={hideMoney} />
      ))}
      <ContactsPage tourbook={tourbook} />
    </Document>
  )
}
