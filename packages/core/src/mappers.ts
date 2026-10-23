import type {
  BandLinks,
  BandRow,
  ChecklistItem,
  CityRow,
  Json,
  ProducerRow,
  ProfileRow,
  TourDateBandRow,
  TourDateRow,
  TourRow,
  VenueRow,
} from './database.types'
import type { Band, City, Producer, Profile, Tour, TourDate, Venue } from './types'

export function rowToProfile(row: ProfileRow): Profile {
  return { id: row.id, displayName: row.display_name, avatarUrl: row.avatar_url, role: row.role }
}

export function rowToCity(row: CityRow): City {
  return {
    id: row.id,
    name: row.name,
    state: row.state,
    slug: row.slug,
    lat: row.lat,
    lng: row.lng,
    population: row.population,
  }
}

export function rowToVenue(row: VenueRow): Venue {
  return {
    id: row.id,
    cityId: row.city_id,
    name: row.name,
    slug: row.slug,
    address: row.address,
    lat: row.lat,
    lng: row.lng,
    capacity: row.capacity,
    genres: row.genres ?? [],
    showDays: row.show_days ?? [],
    dealTypes: row.deal_types ?? [],
    hasPa: row.has_pa,
    hasBackline: row.has_backline,
    acceptsTouringBands: row.accepts_touring_bands,
    contactName: row.contact_name,
    contactPhone: row.contact_phone,
    contactEmail: row.contact_email,
    instagram: row.instagram,
    website: row.website,
    notes: row.notes,
    status: row.status,
    submittedBy: row.submitted_by,
  }
}

export function rowToProducer(row: ProducerRow, cityIds: string[] = [], venueIds: string[] = []): Producer {
  const ids = new Set(cityIds)
  if (row.city_id) ids.add(row.city_id)
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    cityId: row.city_id,
    cityIds: [...ids],
    venueIds,
    genres: row.genres ?? [],
    contactName: row.contact_name,
    contactPhone: row.contact_phone,
    contactEmail: row.contact_email,
    instagram: row.instagram,
    website: row.website,
    notes: row.notes,
    status: row.status,
    submittedBy: row.submitted_by,
  }
}

function parseLinks(json: Json): BandLinks {
  if (!json || typeof json !== 'object' || Array.isArray(json)) return {}
  const out: BandLinks = {}
  for (const key of ['spotify', 'instagram', 'youtube', 'bandcamp'] as const) {
    const v = (json as Record<string, Json | undefined>)[key]
    if (typeof v === 'string' && v.length > 0) out[key] = v
  }
  return out
}

export function rowToBand(row: BandRow): Band {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    cityId: row.city_id,
    genres: row.genres ?? [],
    links: parseLinks(row.links),
    contactName: row.contact_name,
    contactPhone: row.contact_phone,
    contactEmail: row.contact_email,
    opensForTouring: row.opens_for_touring,
    ownerId: row.owner_id,
    notes: row.notes,
    status: row.status,
    submittedBy: row.submitted_by,
  }
}

export function rowToTour(row: TourRow): Tour {
  return {
    id: row.id,
    ownerId: row.owner_id,
    bandId: row.band_id,
    bandName: row.band_name,
    name: row.name,
    startCityId: row.start_city_id,
    endCityId: row.end_city_id,
    maxKmPerDay: row.max_km_per_day,
    allowOffDays: row.allow_off_days,
    genres: row.genres ?? [],
    capacityMin: row.capacity_min,
    capacityMax: row.capacity_max,
    notes: row.notes,
    shareToken: row.share_token,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function parseChecklist(json: Json): ChecklistItem[] {
  if (!Array.isArray(json)) return []
  const out: ChecklistItem[] = []
  for (const item of json) {
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      const label = (item as Record<string, Json | undefined>).label
      const done = (item as Record<string, Json | undefined>).done
      if (typeof label === 'string') out.push({ label, done: done === true })
    }
  }
  return out
}

export function rowToTourDate(row: TourDateRow, bands: TourDateBandRow[] = []): TourDate {
  return {
    id: row.id,
    tourId: row.tour_id,
    date: row.date,
    cityId: row.city_id,
    venueId: row.venue_id,
    producerId: row.producer_id,
    status: row.status,
    isFixed: row.is_fixed,
    loadInTime: row.load_in_time,
    soundcheckTime: row.soundcheck_time,
    doorsTime: row.doors_time,
    setTime: row.set_time,
    dealType: row.deal_type,
    feeCents: row.fee_cents,
    costCents: row.cost_cents,
    lodging: row.lodging,
    checklist: parseChecklist(row.checklist),
    notes: row.notes,
    bands: bands.filter((b) => b.tour_date_id === row.id).map((b) => ({ bandId: b.band_id, role: b.role })),
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
