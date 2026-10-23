// Conversão documento Firestore → tipos de domínio. Tolerante a campos
// ausentes (documentos antigos ou criados à mão no console) para a tela não
// quebrar por causa de um campo faltando.
import type {
  BandLinks,
  ChecklistItem,
  DealType,
  EntityStatus,
  TourDateBandRef,
  TourDateStatus,
  TourMemberRole,
  UserRole,
} from './firestore'
import type { Band, City, Producer, Profile, Tour, TourDate, TourSummary, Venue } from './types'

/** Dados crus de um documento (o que `snapshot.data()` devolve). */
export type DocData = Record<string, unknown>

type TimestampLike = { toDate: () => Date }

function isTimestamp(v: unknown): v is TimestampLike {
  return typeof v === 'object' && v !== null && typeof (v as TimestampLike).toDate === 'function'
}

export function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback
}

export function strOrNull(v: unknown): string | null {
  return typeof v === 'string' && v !== '' ? v : null
}

export function num(v: unknown, fallback = 0): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback
}

export function numOrNull(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

export function bool(v: unknown, fallback = false): boolean {
  return typeof v === 'boolean' ? v : fallback
}

export function strArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
}

export function numArray(v: unknown): number[] {
  return Array.isArray(v) ? v.filter((x): x is number => typeof x === 'number') : []
}

/** ISO string a partir de string, Timestamp ou Date; '' quando ausente. */
export function iso(v: unknown): string {
  if (typeof v === 'string') return v
  if (v instanceof Date) return v.toISOString()
  if (isTimestamp(v)) return v.toDate().toISOString()
  return ''
}

export function nowIso(): string {
  return new Date().toISOString()
}

const ENTITY_STATUSES: readonly EntityStatus[] = ['verified', 'pending', 'rejected']
const USER_ROLES: readonly UserRole[] = ['user', 'admin']
const DATE_STATUSES: readonly TourDateStatus[] = ['ideia', 'contato_feito', 'negociando', 'confirmado', 'realizado', 'cancelado']
const DEAL_TYPES_ALL: readonly DealType[] = ['cache_fixo', 'bilheteria', 'porta', 'misto']
const MEMBER_ROLES: readonly TourMemberRole[] = ['editor', 'viewer']

function oneOf<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  return typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : fallback
}

function dealTypes(v: unknown): DealType[] {
  return strArray(v).filter((x): x is DealType => (DEAL_TYPES_ALL as readonly string[]).includes(x))
}

export function parseLinks(v: unknown): BandLinks {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return {}
  const out: BandLinks = {}
  for (const key of ['spotify', 'instagram', 'youtube', 'bandcamp'] as const) {
    const val = (v as Record<string, unknown>)[key]
    if (typeof val === 'string' && val.length > 0) out[key] = val
  }
  return out
}

export function parseChecklist(v: unknown): ChecklistItem[] {
  if (!Array.isArray(v)) return []
  const out: ChecklistItem[] = []
  for (const item of v) {
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      const label = (item as Record<string, unknown>).label
      const done = (item as Record<string, unknown>).done
      if (typeof label === 'string') out.push({ label, done: done === true })
    }
  }
  return out
}

export function parseDateBands(v: unknown): TourDateBandRef[] {
  if (!Array.isArray(v)) return []
  const out: TourDateBandRef[] = []
  for (const item of v) {
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      const bandId = (item as Record<string, unknown>).bandId
      const role = (item as Record<string, unknown>).role
      if (typeof bandId === 'string') out.push({ bandId, role: typeof role === 'string' ? role : 'convidada' })
    }
  }
  return out
}

function parseMembers(v: unknown): Record<string, TourMemberRole> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return {}
  const out: Record<string, TourMemberRole> = {}
  for (const [uid, role] of Object.entries(v as Record<string, unknown>)) {
    out[uid] = oneOf(role, MEMBER_ROLES, 'viewer')
  }
  return out
}

export function docToProfile(id: string, d: DocData): Profile {
  return { id, displayName: strOrNull(d.displayName), avatarUrl: strOrNull(d.avatarUrl), role: oneOf(d.role, USER_ROLES, 'user') }
}

export function docToCity(id: string, d: DocData): City {
  return {
    id,
    name: str(d.name),
    state: str(d.state),
    slug: str(d.slug, id),
    lat: num(d.lat),
    lng: num(d.lng),
    population: numOrNull(d.population),
  }
}

export function docToVenue(id: string, d: DocData): Venue {
  return {
    id,
    cityId: str(d.cityId),
    name: str(d.name),
    slug: str(d.slug, id),
    address: strOrNull(d.address),
    lat: num(d.lat),
    lng: num(d.lng),
    capacity: numOrNull(d.capacity),
    genres: strArray(d.genres),
    showDays: numArray(d.showDays),
    dealTypes: dealTypes(d.dealTypes),
    hasPa: bool(d.hasPa),
    hasBackline: bool(d.hasBackline),
    acceptsTouringBands: bool(d.acceptsTouringBands, true),
    contactName: strOrNull(d.contactName),
    contactPhone: strOrNull(d.contactPhone),
    contactEmail: strOrNull(d.contactEmail),
    instagram: strOrNull(d.instagram),
    website: strOrNull(d.website),
    notes: strOrNull(d.notes),
    status: oneOf(d.status, ENTITY_STATUSES, 'pending'),
    submittedBy: strOrNull(d.submittedBy),
    createdAt: iso(d.createdAt),
  }
}

export function docToProducer(id: string, d: DocData): Producer {
  const cityId = strOrNull(d.cityId)
  const ids = new Set(strArray(d.cityIds))
  if (cityId) ids.add(cityId)
  return {
    id,
    name: str(d.name),
    slug: str(d.slug, id),
    cityId,
    cityIds: [...ids],
    venueIds: strArray(d.venueIds),
    genres: strArray(d.genres),
    contactName: strOrNull(d.contactName),
    contactPhone: strOrNull(d.contactPhone),
    contactEmail: strOrNull(d.contactEmail),
    instagram: strOrNull(d.instagram),
    website: strOrNull(d.website),
    notes: strOrNull(d.notes),
    status: oneOf(d.status, ENTITY_STATUSES, 'pending'),
    submittedBy: strOrNull(d.submittedBy),
  }
}

export function docToBand(id: string, d: DocData): Band {
  return {
    id,
    name: str(d.name),
    slug: str(d.slug, id),
    cityId: strOrNull(d.cityId),
    genres: strArray(d.genres),
    links: parseLinks(d.links),
    contactName: strOrNull(d.contactName),
    contactPhone: strOrNull(d.contactPhone),
    contactEmail: strOrNull(d.contactEmail),
    opensForTouring: bool(d.opensForTouring, true),
    ownerId: strOrNull(d.ownerId),
    notes: strOrNull(d.notes),
    status: oneOf(d.status, ENTITY_STATUSES, 'pending'),
    submittedBy: strOrNull(d.submittedBy),
  }
}

export function docToTour(id: string, d: DocData): Tour {
  const ownerId = str(d.ownerId)
  const memberIds = strArray(d.memberIds)
  if (ownerId && !memberIds.includes(ownerId)) memberIds.unshift(ownerId)
  return {
    id,
    ownerId,
    bandId: strOrNull(d.bandId),
    bandName: str(d.bandName),
    name: str(d.name),
    startCityId: strOrNull(d.startCityId),
    endCityId: strOrNull(d.endCityId),
    maxKmPerDay: num(d.maxKmPerDay, 400),
    allowOffDays: bool(d.allowOffDays, true),
    genres: strArray(d.genres),
    capacityMin: numOrNull(d.capacityMin),
    capacityMax: numOrNull(d.capacityMax),
    notes: strOrNull(d.notes),
    shareToken: strOrNull(d.shareToken),
    memberIds,
    memberRoles: parseMembers(d.memberRoles),
    createdAt: iso(d.createdAt),
    updatedAt: iso(d.updatedAt),
  }
}

export function docToTourSummary(id: string, d: DocData): TourSummary {
  return {
    ...docToTour(id, d),
    dateCount: num(d.dateCount),
    firstDate: strOrNull(d.firstDate),
    lastDate: strOrNull(d.lastDate),
  }
}

export function docToTourDate(tourId: string, id: string, d: DocData): TourDate {
  return {
    id,
    tourId,
    date: str(d.date),
    cityId: strOrNull(d.cityId),
    venueId: strOrNull(d.venueId),
    producerId: strOrNull(d.producerId),
    status: oneOf(d.status, DATE_STATUSES, 'ideia'),
    isFixed: bool(d.isFixed),
    loadInTime: strOrNull(d.loadInTime),
    soundcheckTime: strOrNull(d.soundcheckTime),
    doorsTime: strOrNull(d.doorsTime),
    setTime: strOrNull(d.setTime),
    dealType: typeof d.dealType === 'string' && (DEAL_TYPES_ALL as readonly string[]).includes(d.dealType) ? (d.dealType as DealType) : null,
    feeCents: numOrNull(d.feeCents),
    costCents: numOrNull(d.costCents),
    lodging: strOrNull(d.lodging),
    checklist: parseChecklist(d.checklist),
    notes: strOrNull(d.notes),
    bands: parseDateBands(d.bands),
    createdAt: iso(d.createdAt),
  }
}

/** Gera um slug URL-safe a partir de um nome (sem acentos, minúsculas, hífens). */
export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
