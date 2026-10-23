// Modelo do tourbook (dados prontos para o PDF e para a página pública). Implementação em andamento — ver SPEC.md.
import type { Band, City, Producer, Tour, TourDate, TourDateStatus, Venue } from './types'

export type TourbookContact = {
  label: string
  name: string | null
  phone: string | null
  whatsappUrl: string | null
  email: string | null
  instagram: string | null
}

export type TourbookSummaryRow = {
  date: string
  dateLabel: string
  weekday: string
  city: string
  state: string
  venue: string | null
  setTime: string | null
  status: TourDateStatus
  statusLabel: string
}

export type TourbookDay = {
  id: string
  date: string
  dateLabel: string
  weekday: string
  status: TourDateStatus
  statusLabel: string
  city: City | null
  venue: Venue | null
  address: string | null
  mapsUrl: string | null
  contacts: TourbookContact[]
  times: { loadIn: string | null; soundcheck: string | null; doors: string | null; set: string | null }
  deal: { type: string | null; feeLabel: string | null }
  lodging: string | null
  bands: Array<{ name: string; role: string }>
  notes: string | null
  nextLeg: { km: number; hours: number; toCity: string } | null
}

export type Tourbook = {
  title: string
  bandName: string
  period: { start: string; end: string; label: string }
  summary: TourbookSummaryRow[]
  days: TourbookDay[]
  contacts: TourbookContact[]
  totals: { km: number; hours: number; dates: number; confirmed: number; feeCents: number; costCents: number }
}

export type BuildTourbookInput = {
  tour: Tour
  dates: TourDate[]
  lookups: { cities: City[]; venues: Venue[]; bands: Band[]; producers: Producer[] }
  /** Omitir cachê/custos (versão para a equipe). */
  hideMoney?: boolean
}

export function buildTourbook(_input: BuildTourbookInput): Tourbook {
  throw new Error('not implemented')
}

export function formatCurrencyBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

/** Telefone BR em qualquer formato → link wa.me (assume DDI 55 quando ausente). */
export function whatsappUrl(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  const withCountry = digits.startsWith('55') && digits.length >= 12 ? digits : `55${digits}`
  return `https://wa.me/${withCountry}`
}
