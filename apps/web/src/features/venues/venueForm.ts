// Pure helpers for the venue submission flow: controlled form state, the
// bridge to the zod schema input, pt-BR error mapping and display labels.
// No React, no IO (unit-tested in venueForm.test.ts).
import {
  DEAL_TYPES,
  DEAL_TYPE_LABELS,
  GENRES,
  GENRE_LABELS,
  WEEKDAY_SHORT_PT,
  venueSubmissionSchema,
  type DealType,
  type EntityStatus,
  type Genre,
  type LatLng,
  type VenueSubmissionValues,
} from '@tour/core'
import { format, isValid } from 'date-fns'
import type { z } from 'zod'

/** What `venueSubmissionSchema.safeParse` accepts (before defaults and transforms). */
export type VenueSubmissionInput = z.input<typeof venueSubmissionSchema>

/** Controlled form state: numeric fields stay as text until validation. */
export type VenueFormState = {
  name: string
  cityId: string
  lat: string
  lng: string
  address: string
  capacity: string
  genres: Genre[]
  showDays: number[]
  dealTypes: DealType[]
  hasPa: boolean
  hasBackline: boolean
  acceptsTouringBands: boolean
  contactName: string
  contactPhone: string
  contactEmail: string
  instagram: string
  website: string
  notes: string
}

export type VenueFormField = keyof VenueFormState

/** One message per field; `form` holds errors not tied to a field. */
export type VenueFormErrors = Partial<Record<VenueFormField | 'form', string>>

export const EMPTY_VENUE_FORM: VenueFormState = {
  name: '',
  cityId: '',
  lat: '',
  lng: '',
  address: '',
  capacity: '',
  genres: [],
  showDays: [],
  dealTypes: [],
  hasPa: false,
  hasBackline: false,
  acceptsTouringBands: true,
  contactName: '',
  contactPhone: '',
  contactEmail: '',
  instagram: '',
  website: '',
  notes: '',
}

/** Labels in form order (the order decides which error gets focus first). */
const FIELD_LABELS: Record<VenueFormField, string> = {
  name: 'Nome',
  cityId: 'Cidade',
  lat: 'Latitude',
  lng: 'Longitude',
  address: 'Endereço',
  capacity: 'Capacidade',
  genres: 'Gêneros',
  showDays: 'Dias de show',
  dealTypes: 'Tipos de acordo',
  hasPa: 'PA',
  hasBackline: 'Backline',
  acceptsTouringBands: 'Aceita bandas de fora',
  contactName: 'Nome do contato',
  contactPhone: 'Telefone',
  contactEmail: 'E-mail',
  instagram: 'Instagram',
  website: 'Site',
  notes: 'Observações',
}

export const VENUE_FORM_FIELDS: readonly VenueFormField[] = Object.keys(FIELD_LABELS).filter(isVenueFormField)

export function isVenueFormField(key: string): key is VenueFormField {
  return Object.hasOwn(FIELD_LABELS, key)
}

export const LOCATION_ERROR = 'Marque o ponto no mapa ou informe latitude e longitude válidas'

/** Anchor of the "my submissions" list on /casas/sugerir (linked from the profile). */
export const MY_SUBMISSIONS_ANCHOR = 'minhas-sugestoes'

// ---------------------------------------------------------------------------
// Options for chips
// ---------------------------------------------------------------------------

export const GENRE_OPTIONS: ReadonlyArray<{ value: Genre; label: string }> = GENRES.map((g) => ({ value: g, label: GENRE_LABELS[g] }))

export const DEAL_TYPE_OPTIONS: ReadonlyArray<{ value: DealType; label: string }> = DEAL_TYPES.map((d) => ({
  value: d,
  label: DEAL_TYPE_LABELS[d],
}))

/** Dom … Sáb (0 = domingo, same convention as venue.showDays). */
export const SHOW_DAY_OPTIONS: ReadonlyArray<{ value: number; label: string }> = WEEKDAY_SHORT_PT.map((label, day) => ({
  value: day,
  label,
}))

// ---------------------------------------------------------------------------
// Parsing text inputs
// ---------------------------------------------------------------------------

/** "-26,30" or "-26.30" → -26.3; anything else → null. */
export function parseDecimal(text: string): number | null {
  const normalized = text.trim().replace(',', '.')
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return null
  return Number(normalized)
}

/**
 * Capacity as typed by people: "300", "1.200" and "1 200" → integer;
 * "" → null (not informed); anything else → NaN so the schema flags it.
 */
export function parseCapacity(text: string): number | null {
  const trimmed = text.trim()
  if (trimmed === '') return null
  const digits = trimmed.replace(/[.\s]/g, '')
  if (!/^\d+$/.test(digits)) return Number.NaN
  return Number(digits)
}

/** Adds https:// when the site was typed without scheme; keeps '' as is. */
export function normalizeWebsite(text: string): string {
  const raw = text.trim()
  if (raw === '' || /^https?:\/\//i.test(raw)) return raw
  return `https://${raw}`
}

/** Coordinate for a text input: up to 6 decimals, no trailing zeros. */
export function formatCoordinate(n: number): string {
  return String(Number(n.toFixed(6)))
}

function inRange(n: number, min: number, max: number): boolean {
  return Number.isFinite(n) && n >= min && n <= max
}

/** The marker to draw when both text coordinates are valid. */
export function markerFromText(lat: string, lng: string): LatLng | null {
  const la = parseDecimal(lat)
  const ln = parseDecimal(lng)
  if (la === null || ln === null) return null
  if (!inRange(la, -90, 90) || !inRange(ln, -180, 180)) return null
  return { lat: la, lng: ln }
}

export function toggleInList<T>(list: readonly T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item]
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export function toSubmissionInput(state: VenueFormState): VenueSubmissionInput {
  return {
    name: state.name,
    cityId: state.cityId,
    address: state.address,
    lat: parseDecimal(state.lat) ?? Number.NaN,
    lng: parseDecimal(state.lng) ?? Number.NaN,
    capacity: parseCapacity(state.capacity),
    genres: state.genres,
    showDays: state.showDays,
    dealTypes: state.dealTypes,
    hasPa: state.hasPa,
    hasBackline: state.hasBackline,
    acceptsTouringBands: state.acceptsTouringBands,
    contactName: state.contactName,
    contactPhone: state.contactPhone,
    contactEmail: state.contactEmail,
    instagram: state.instagram,
    website: normalizeWebsite(state.website),
    notes: state.notes,
  }
}

/** The parts of a zod issue the pt-BR error map looks at. */
export type IssueLike = {
  readonly code?: string
  readonly path?: ReadonlyArray<PropertyKey>
  readonly origin?: unknown
  readonly minimum?: unknown
  readonly maximum?: unknown
}

function fieldOf(path: ReadonlyArray<PropertyKey> | undefined): VenueFormField | null {
  const head = path?.[0]
  return typeof head === 'string' && isVenueFormField(head) ? head : null
}

/**
 * pt-BR message for issues the schema does not label itself (zod defaults are
 * in English). Schema-level messages win over this map, so the ones written
 * in `venueSubmissionSchema` ('Informe o nome da casa', 'E-mail inválido'…)
 * come through untouched.
 */
export function ptIssueMessage(issue: IssueLike): string {
  const field = fieldOf(issue.path)
  if (field === 'lat' || field === 'lng') return LOCATION_ERROR
  if (field === 'capacity') {
    if (issue.code === 'too_small') return 'Capacidade mínima: 1 pessoa'
    if (issue.code === 'too_big') return 'Capacidade máxima: 100.000 pessoas'
    return 'Capacidade inválida: use um número inteiro'
  }
  const label = field ? FIELD_LABELS[field] : 'Campo'
  switch (issue.code) {
    case 'too_big':
      return issue.origin === 'string' && typeof issue.maximum === 'number'
        ? `${label}: máximo de ${issue.maximum} caracteres`
        : `${label}: valor acima do permitido`
    case 'too_small':
      return issue.origin === 'string' ? `${label}: preencha este campo` : `${label}: valor abaixo do permitido`
    case 'invalid_format':
      return `${label}: formato inválido`
    default:
      return `${label}: valor inválido`
  }
}

/** First message per field; issues without a known field go to `form`. */
export function mapIssuesToErrors(issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; message: string }>): VenueFormErrors {
  const errors: VenueFormErrors = {}
  for (const issue of issues) {
    const key = fieldOf(issue.path) ?? 'form'
    if (!errors[key]) errors[key] = issue.message
  }
  return errors
}

export type VenueFormValidation = { ok: true; values: VenueSubmissionValues } | { ok: false; errors: VenueFormErrors }

export function validateVenueForm(state: VenueFormState): VenueFormValidation {
  const result = venueSubmissionSchema.safeParse(toSubmissionInput(state), { error: ptIssueMessage })
  if (result.success) return { ok: true, values: result.data }
  return { ok: false, errors: mapIssuesToErrors(result.error.issues) }
}

/** The field to scroll to after a failed submit (lng errors land on the lat/map block). */
export function firstErrorField(errors: VenueFormErrors): VenueFormField | null {
  const field = VENUE_FORM_FIELDS.find((f) => errors[f] !== undefined) ?? null
  return field === 'lng' ? 'lat' : field
}

export function errorCount(errors: VenueFormErrors): number {
  return Object.values(errors).filter((m) => m !== undefined).length
}

// ---------------------------------------------------------------------------
// Display
// ---------------------------------------------------------------------------

export const SUBMISSION_STATUS_LABELS: Record<EntityStatus, string> = {
  pending: 'Pendente',
  verified: 'Aprovada',
  rejected: 'Recusada',
}

/** Tailwind classes for the status badge. */
export const SUBMISSION_STATUS_CLASSES: Record<EntityStatus, string> = {
  pending: 'bg-amber-900 text-amber-100',
  verified: 'bg-emerald-900 text-emerald-100',
  rejected: 'bg-red-900 text-red-100',
}

/** Full ISO timestamp (createdAt) → "23/10/2026"; '' when unreadable. */
export function formatTimestampPt(iso: string): string {
  const d = new Date(iso)
  return isValid(d) ? format(d, 'dd/MM/yyyy') : ''
}

/** "PA + Backline", "PA", or "Não informado". */
export function gearLabel(venue: { hasPa: boolean; hasBackline: boolean }): string {
  const parts = [venue.hasPa ? 'PA' : null, venue.hasBackline ? 'Backline' : null].filter((x): x is string => x !== null)
  return parts.length > 0 ? parts.join(' + ') : 'Não informado'
}

/** Up to two initials for an avatar fallback ("José Victor" → "JV"). */
export function initialsOf(name: string | null | undefined, fallback = '?'): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return fallback
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : ''
  return `${first}${last}`.toUpperCase() || fallback
}

