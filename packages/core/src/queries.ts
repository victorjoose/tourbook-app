import type { SupabaseClient } from '@supabase/supabase-js'
import { DEFAULT_CHECKLIST } from './constants'
import type {
  Database,
  EntityStatus,
  Json,
  ProducerCityRow,
  ProducerVenueRow,
  TourDateBandRow,
  TourDateRow,
  TourDateStatus,
  TourRow,
  VenueRow,
} from './database.types'
import {
  rowToBand,
  rowToCity,
  rowToProducer,
  rowToProfile,
  rowToTour,
  rowToTourDate,
  rowToVenue,
  slugify,
} from './mappers'
import type { TourDateFormValues, TourFormValues, VenueSubmissionValues } from './schemas'
import type { City, Profile, RegionData, Tour, TourDate, TourMember, TourWithDates, Venue } from './types'

export type Client = SupabaseClient<Database>

function fail(context: string, error: { message: string } | null): never {
  throw new Error(`${context}: ${error?.message ?? 'erro desconhecido'}`)
}

// ---------------------------------------------------------------------------
// Perfil
// ---------------------------------------------------------------------------

export async function fetchMyProfile(sb: Client, userId: string): Promise<Profile | null> {
  const { data, error } = await sb.from('profiles').select('*').eq('id', userId).maybeSingle()
  if (error) fail('Erro ao carregar perfil', error)
  return data ? rowToProfile(data) : null
}

export async function updateMyProfile(sb: Client, userId: string, input: { displayName: string }): Promise<void> {
  const { error } = await sb.from('profiles').update({ display_name: input.displayName }).eq('id', userId)
  if (error) fail('Erro ao salvar perfil', error)
}

// ---------------------------------------------------------------------------
// Região (cidades, casas, produtoras, bandas) — a região-piloto é pequena,
// então carregamos tudo de uma vez e filtramos no cliente.
// ---------------------------------------------------------------------------

export async function fetchCities(sb: Client): Promise<City[]> {
  const { data, error } = await sb.from('cities').select('*').order('name')
  if (error) fail('Erro ao carregar cidades', error)
  return (data ?? []).map(rowToCity)
}

export async function searchCities(sb: Client, term: string, limit = 8): Promise<City[]> {
  const q = term.trim()
  if (!q) return []
  const { data, error } = await sb.from('cities').select('*').ilike('name', `${q}%`).order('name').limit(limit)
  if (error) fail('Erro ao buscar cidades', error)
  return (data ?? []).map(rowToCity)
}

export async function fetchRegionData(sb: Client): Promise<RegionData> {
  const [cities, venues, producers, producerCities, producerVenues, bands] = await Promise.all([
    sb.from('cities').select('*').order('name'),
    sb.from('venues').select('*').eq('status', 'verified').order('name'),
    sb.from('producers').select('*').eq('status', 'verified').order('name'),
    sb.from('producer_cities').select('*'),
    sb.from('producer_venues').select('*'),
    sb.from('bands').select('*').eq('status', 'verified').order('name'),
  ])
  if (cities.error) fail('Erro ao carregar cidades', cities.error)
  if (venues.error) fail('Erro ao carregar casas', venues.error)
  if (producers.error) fail('Erro ao carregar produtoras', producers.error)
  if (producerCities.error) fail('Erro ao carregar produtoras', producerCities.error)
  if (producerVenues.error) fail('Erro ao carregar produtoras', producerVenues.error)
  if (bands.error) fail('Erro ao carregar bandas', bands.error)

  const pc = groupBy(producerCities.data ?? [], (r: ProducerCityRow) => r.producer_id)
  const pv = groupBy(producerVenues.data ?? [], (r: ProducerVenueRow) => r.producer_id)

  return {
    cities: (cities.data ?? []).map(rowToCity),
    venues: (venues.data ?? []).map(rowToVenue),
    producers: (producers.data ?? []).map((row) =>
      rowToProducer(
        row,
        (pc.get(row.id) ?? []).map((r) => r.city_id),
        (pv.get(row.id) ?? []).map((r) => r.venue_id),
      ),
    ),
    bands: (bands.data ?? []).map(rowToBand),
  }
}

function groupBy<T>(rows: T[], key: (row: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>()
  for (const row of rows) {
    const k = key(row)
    const list = map.get(k)
    if (list) list.push(row)
    else map.set(k, [row])
  }
  return map
}

// ---------------------------------------------------------------------------
// Casas: sugestão (usuário) e moderação (admin)
// ---------------------------------------------------------------------------

export async function submitVenue(sb: Client, userId: string, input: VenueSubmissionValues): Promise<Venue> {
  const slug = `${slugify(input.name)}-${Math.random().toString(36).slice(2, 8)}`
  const { data, error } = await sb
    .from('venues')
    .insert({
      city_id: input.cityId,
      name: input.name,
      slug,
      address: input.address,
      lat: input.lat,
      lng: input.lng,
      capacity: input.capacity,
      genres: input.genres,
      show_days: input.showDays,
      deal_types: input.dealTypes as VenueRow['deal_types'],
      has_pa: input.hasPa,
      has_backline: input.hasBackline,
      accepts_touring_bands: input.acceptsTouringBands,
      contact_name: input.contactName,
      contact_phone: input.contactPhone,
      contact_email: input.contactEmail,
      instagram: input.instagram,
      website: input.website,
      notes: input.notes,
      status: 'pending',
      submitted_by: userId,
    })
    .select('*')
    .single()
  if (error) fail('Erro ao enviar casa', error)
  return rowToVenue(data)
}

export async function fetchMySubmissions(sb: Client, userId: string): Promise<Venue[]> {
  const { data, error } = await sb
    .from('venues')
    .select('*')
    .eq('submitted_by', userId)
    .order('created_at', { ascending: false })
  if (error) fail('Erro ao carregar suas sugestões', error)
  return (data ?? []).map(rowToVenue)
}

export async function fetchPendingVenues(sb: Client): Promise<Venue[]> {
  const { data, error } = await sb.from('venues').select('*').eq('status', 'pending').order('created_at')
  if (error) fail('Erro ao carregar pendências', error)
  return (data ?? []).map(rowToVenue)
}

export async function moderateVenue(sb: Client, venueId: string, status: Exclude<EntityStatus, 'pending'>): Promise<void> {
  const { error } = await sb.from('venues').update({ status }).eq('id', venueId)
  if (error) fail('Erro ao moderar casa', error)
}

// ---------------------------------------------------------------------------
// Turnês
// ---------------------------------------------------------------------------

export async function fetchMyTours(sb: Client): Promise<Array<Tour & { dateCount: number; firstDate: string | null; lastDate: string | null }>> {
  const { data, error } = await sb
    .from('tours')
    .select('*, tour_dates(date)')
    .order('updated_at', { ascending: false })
  if (error) fail('Erro ao carregar turnês', error)
  return (data ?? []).map((row) => {
    const { tour_dates, ...tour } = row as TourRow & { tour_dates: Array<{ date: string }> }
    const dates = (tour_dates ?? []).map((d) => d.date).sort()
    return {
      ...rowToTour(tour),
      dateCount: dates.length,
      firstDate: dates[0] ?? null,
      lastDate: dates.at(-1) ?? null,
    }
  })
}

export async function fetchTour(sb: Client, tourId: string): Promise<TourWithDates | null> {
  const [tour, dates, members] = await Promise.all([
    sb.from('tours').select('*').eq('id', tourId).maybeSingle(),
    sb.from('tour_dates').select('*').eq('tour_id', tourId).order('date').order('created_at'),
    sb.from('tour_members').select('*, profiles(*)').eq('tour_id', tourId),
  ])
  if (tour.error) fail('Erro ao carregar turnê', tour.error)
  if (!tour.data) return null
  if (dates.error) fail('Erro ao carregar datas', dates.error)
  if (members.error) fail('Erro ao carregar membros', members.error)

  const dateIds = (dates.data ?? []).map((d) => d.id)
  let dateBands: TourDateBandRow[] = []
  if (dateIds.length > 0) {
    const { data, error } = await sb.from('tour_date_bands').select('*').in('tour_date_id', dateIds)
    if (error) fail('Erro ao carregar bandas das datas', error)
    dateBands = data ?? []
  }

  const memberList: TourMember[] = (members.data ?? []).map((m) => {
    const row = m as unknown as { tour_id: string; profile_id: string; role: TourMember['role']; profiles: Parameters<typeof rowToProfile>[0] | null }
    return {
      tourId: row.tour_id,
      profileId: row.profile_id,
      role: row.role,
      profile: row.profiles ? rowToProfile(row.profiles) : undefined,
    }
  })

  return {
    ...rowToTour(tour.data),
    dates: (dates.data ?? []).map((d) => rowToTourDate(d, dateBands)),
    members: memberList,
  }
}

export type CreateTourInput = {
  tour: TourFormValues
  dates: Array<{
    date: string
    cityId: string | null
    venueId: string | null
    producerId: string | null
    isFixed: boolean
    status?: TourDateStatus
    bandIds?: string[]
  }>
}

export async function createTour(sb: Client, ownerId: string, input: CreateTourInput): Promise<Tour> {
  const t = input.tour
  const { data, error } = await sb
    .from('tours')
    .insert({
      owner_id: ownerId,
      band_id: t.bandId,
      band_name: t.bandName,
      name: t.name,
      start_city_id: t.startCityId,
      end_city_id: t.endCityId,
      max_km_per_day: t.maxKmPerDay,
      allow_off_days: t.allowOffDays,
      genres: t.genres,
      capacity_min: t.capacityMin,
      capacity_max: t.capacityMax,
      notes: t.notes,
    })
    .select('*')
    .single()
  if (error) fail('Erro ao criar turnê', error)
  const tour = rowToTour(data)

  if (input.dates.length > 0) {
    const checklist = DEFAULT_CHECKLIST.map((label) => ({ label, done: false })) as unknown as Json
    const { data: inserted, error: dErr } = await sb
      .from('tour_dates')
      .insert(
        input.dates.map((d) => ({
          tour_id: tour.id,
          date: d.date,
          city_id: d.cityId,
          venue_id: d.venueId,
          producer_id: d.producerId,
          is_fixed: d.isFixed,
          status: d.status ?? 'ideia',
          checklist,
        })),
      )
      .select('id, date')
    if (dErr) fail('Erro ao salvar datas', dErr)

    const bandRows: Array<{ tour_date_id: string; band_id: string }> = []
    for (const d of input.dates) {
      if (!d.bandIds?.length) continue
      const match = (inserted ?? []).find((r) => r.date === d.date)
      if (!match) continue
      for (const bandId of d.bandIds) bandRows.push({ tour_date_id: match.id, band_id: bandId })
    }
    if (bandRows.length > 0) {
      const { error: bErr } = await sb.from('tour_date_bands').insert(bandRows)
      if (bErr) fail('Erro ao salvar bandas das datas', bErr)
    }
  }
  return tour
}

export async function updateTour(sb: Client, tourId: string, patch: Partial<TourFormValues>): Promise<void> {
  const update: Database['public']['Tables']['tours']['Update'] = {}
  if (patch.name !== undefined) update.name = patch.name
  if (patch.bandName !== undefined) update.band_name = patch.bandName
  if (patch.bandId !== undefined) update.band_id = patch.bandId
  if (patch.genres !== undefined) update.genres = patch.genres
  if (patch.startCityId !== undefined) update.start_city_id = patch.startCityId
  if (patch.endCityId !== undefined) update.end_city_id = patch.endCityId
  if (patch.maxKmPerDay !== undefined) update.max_km_per_day = patch.maxKmPerDay
  if (patch.allowOffDays !== undefined) update.allow_off_days = patch.allowOffDays
  if (patch.capacityMin !== undefined) update.capacity_min = patch.capacityMin
  if (patch.capacityMax !== undefined) update.capacity_max = patch.capacityMax
  if (patch.notes !== undefined) update.notes = patch.notes
  const { error } = await sb.from('tours').update(update).eq('id', tourId)
  if (error) fail('Erro ao salvar turnê', error)
}

export async function deleteTour(sb: Client, tourId: string): Promise<void> {
  const { error } = await sb.from('tours').delete().eq('id', tourId)
  if (error) fail('Erro ao excluir turnê', error)
}

export type TourDatePatch = Partial<TourDateFormValues> & { checklist?: Array<{ label: string; done: boolean }> }

function toTourDateUpdate(patch: TourDatePatch): Database['public']['Tables']['tour_dates']['Update'] {
  const u: Database['public']['Tables']['tour_dates']['Update'] = {}
  if (patch.date !== undefined) u.date = patch.date
  if (patch.cityId !== undefined) u.city_id = patch.cityId
  if (patch.venueId !== undefined) u.venue_id = patch.venueId
  if (patch.producerId !== undefined) u.producer_id = patch.producerId
  if (patch.status !== undefined) u.status = patch.status as TourDateStatus
  if (patch.isFixed !== undefined) u.is_fixed = patch.isFixed
  if (patch.loadInTime !== undefined) u.load_in_time = patch.loadInTime
  if (patch.soundcheckTime !== undefined) u.soundcheck_time = patch.soundcheckTime
  if (patch.doorsTime !== undefined) u.doors_time = patch.doorsTime
  if (patch.setTime !== undefined) u.set_time = patch.setTime
  if (patch.dealType !== undefined) u.deal_type = patch.dealType as TourDateRow['deal_type']
  if (patch.feeCents !== undefined) u.fee_cents = patch.feeCents
  if (patch.costCents !== undefined) u.cost_cents = patch.costCents
  if (patch.lodging !== undefined) u.lodging = patch.lodging
  if (patch.notes !== undefined) u.notes = patch.notes
  if (patch.checklist !== undefined) u.checklist = patch.checklist as unknown as Json
  return u
}

export async function addTourDate(sb: Client, tourId: string, input: TourDatePatch & { date: string }): Promise<TourDate> {
  const checklist = DEFAULT_CHECKLIST.map((label) => ({ label, done: false })) as unknown as Json
  const { data, error } = await sb
    .from('tour_dates')
    .insert({ tour_id: tourId, checklist, ...toTourDateUpdate(input), date: input.date })
    .select('*')
    .single()
  if (error) fail('Erro ao adicionar data', error)
  return rowToTourDate(data)
}

export async function updateTourDate(sb: Client, tourDateId: string, patch: TourDatePatch): Promise<void> {
  const { error } = await sb.from('tour_dates').update(toTourDateUpdate(patch)).eq('id', tourDateId)
  if (error) fail('Erro ao salvar data', error)
}

export async function deleteTourDate(sb: Client, tourDateId: string): Promise<void> {
  const { error } = await sb.from('tour_dates').delete().eq('id', tourDateId)
  if (error) fail('Erro ao remover data', error)
}

export async function setTourDateBands(sb: Client, tourDateId: string, bandIds: string[]): Promise<void> {
  const del = await sb.from('tour_date_bands').delete().eq('tour_date_id', tourDateId)
  if (del.error) fail('Erro ao salvar bandas da noite', del.error)
  if (bandIds.length === 0) return
  const { error } = await sb
    .from('tour_date_bands')
    .insert(bandIds.map((band_id) => ({ tour_date_id: tourDateId, band_id })))
  if (error) fail('Erro ao salvar bandas da noite', error)
}

/** UUID v4 via Web Crypto (existe no navegador, no Node ≥ 19 e no React Native com polyfill). */
export function randomUuid(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string; getRandomValues?: (a: Uint8Array) => Uint8Array } }).crypto
  if (c?.randomUUID) return c.randomUUID()
  const bytes = new Uint8Array(16)
  if (c?.getRandomValues) c.getRandomValues(bytes)
  else for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256)
  bytes[6] = (bytes[6]! & 0x0f) | 0x40
  bytes[8] = (bytes[8]! & 0x3f) | 0x80
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

export async function enableShareLink(sb: Client, tourId: string): Promise<string> {
  const token = randomUuid()
  const { error } = await sb.from('tours').update({ share_token: token }).eq('id', tourId)
  if (error) fail('Erro ao gerar link', error)
  return token
}

export async function disableShareLink(sb: Client, tourId: string): Promise<void> {
  const { error } = await sb.from('tours').update({ share_token: null }).eq('id', tourId)
  if (error) fail('Erro ao desativar link', error)
}

/** Tourbook público: retorna o JSON montado pela função `get_public_tourbook`, ou null se o link não existe. */
export async function fetchPublicTourbook(sb: Client, token: string): Promise<PublicTourbookPayload | null> {
  const { data, error } = await sb.rpc('get_public_tourbook', { p_token: token })
  if (error) fail('Erro ao carregar tourbook', error)
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null
  return data as unknown as PublicTourbookPayload
}

export type PublicTourbookPayload = {
  tour: Omit<TourRow, 'owner_id' | 'share_token'>
  dates: Array<
    Omit<TourDateRow, 'fee_cents' | 'cost_cents'> & {
      city: Database['public']['Tables']['cities']['Row'] | null
      venue: Omit<VenueRow, 'submitted_by'> | null
      bands: Array<{ id: string; name: string; role: string; links: Json }>
    }
  >
  start_city: Database['public']['Tables']['cities']['Row'] | null
  end_city: Database['public']['Tables']['cities']['Row'] | null
}
