// Acesso a dados (Cloud Firestore). Todas as funções recebem `Client` e
// devolvem tipos de domínio. Sem Cloud Functions no plano gratuito, então os
// resumos (`dateCount`…) e o tourbook público são mantidos daqui mesmo.
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type CollectionReference,
  type DocumentReference,
  type Firestore,
} from 'firebase/firestore'
import { DEFAULT_CHECKLIST } from './constants'
import {
  COLLECTIONS,
  type BandDoc,
  type CityDoc,
  type Client,
  type EntityStatus,
  type ProducerDoc,
  type ProfileDoc,
  type PublicTourbookDoc,
  type TourDateDoc,
  type TourDateStatus,
  type TourDoc,
  type VenueDoc,
} from './firestore'
import {
  docToBand,
  docToCity,
  docToProducer,
  docToProfile,
  docToTour,
  docToTourDate,
  docToTourSummary,
  docToVenue,
  nowIso,
  slugify,
  type DocData,
} from './mappers'
import type { TourDateFormValues, TourFormValues, VenueSubmissionValues } from './schemas'
import type {
  Band,
  City,
  Producer,
  Profile,
  RegionData,
  Tour,
  TourDate,
  TourMember,
  TourSummary,
  TourWithDates,
  Venue,
} from './types'

export type { Client } from './firestore'

// ---------------------------------------------------------------------------
// Infra
// ---------------------------------------------------------------------------

const MESSAGES: Record<string, string> = {
  'permission-denied': 'Você não tem permissão para isso.',
  unavailable: 'Sem conexão com o servidor. Tente de novo.',
  'not-found': 'Registro não encontrado.',
  unauthenticated: 'Faça login para continuar.',
}

/** Erro legível em pt-BR, mantendo o código do Firestore quando existe. */
export class DataError extends Error {
  readonly code: string | null
  constructor(context: string, cause: unknown) {
    const code = typeof cause === 'object' && cause !== null && 'code' in cause ? String((cause as { code: unknown }).code).replace(/^firestore\//, '') : null
    const detail = (code && MESSAGES[code]) ?? (cause instanceof Error ? cause.message : 'erro desconhecido')
    super(`${context}: ${detail}`)
    this.name = 'DataError'
    this.code = code
  }
}

async function run<T>(context: string, op: () => Promise<T>): Promise<T> {
  try {
    return await op()
  } catch (e) {
    if (e instanceof DataError) throw e
    throw new DataError(context, e)
  }
}

function col(db: Firestore, name: string): CollectionReference<DocData> {
  return collection(db, name) as CollectionReference<DocData>
}

function datesCol(db: Firestore, tourId: string): CollectionReference<DocData> {
  return collection(db, COLLECTIONS.tours, tourId, COLLECTIONS.dates) as CollectionReference<DocData>
}

function ref(db: Firestore, name: string, id: string): DocumentReference<DocData> {
  return doc(db, name, id) as DocumentReference<DocData>
}

function currentUid(client: Client): string {
  const uid = client.auth.currentUser?.uid
  if (!uid) throw new DataError('Sessão', { code: 'unauthenticated' })
  return uid
}

function byName<T extends { name: string }>(a: T, b: T): number {
  return a.name.localeCompare(b.name, 'pt-BR')
}

/** Divide `items` em lotes (o Firestore aceita até 500 operações por batch). */
function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

/** Remove chaves `undefined` (o Firestore rejeita `undefined`). */
function clean<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) if (v !== undefined) out[k] = v
  return out as T
}

// ---------------------------------------------------------------------------
// Perfil
// ---------------------------------------------------------------------------

export async function fetchMyProfile(client: Client, userId: string): Promise<Profile | null> {
  return run('Erro ao carregar perfil', async () => {
    const snap = await getDoc(ref(client.db, COLLECTIONS.profiles, userId))
    return snap.exists() ? docToProfile(snap.id, snap.data()) : null
  })
}

export type AuthUserInfo = { uid: string; displayName: string | null; photoURL: string | null }

/**
 * Garante que `profiles/{uid}` exista após o login (não há trigger no Auth sem
 * Cloud Functions). Não mexe em `role` nem sobrescreve um nome já editado.
 */
export async function ensureProfile(client: Client, user: AuthUserInfo): Promise<Profile> {
  return run('Erro ao preparar perfil', async () => {
    const r = ref(client.db, COLLECTIONS.profiles, user.uid)
    const snap = await getDoc(r)
    const now = nowIso()
    if (!snap.exists()) {
      const data: ProfileDoc = {
        displayName: user.displayName,
        avatarUrl: user.photoURL,
        role: 'user',
        createdAt: now,
        updatedAt: now,
      }
      await setDoc(r, data)
      return docToProfile(user.uid, data)
    }
    const current = docToProfile(snap.id, snap.data())
    const patch: Partial<ProfileDoc> = {}
    if (!current.displayName && user.displayName) patch.displayName = user.displayName
    if (current.avatarUrl !== user.photoURL && user.photoURL) patch.avatarUrl = user.photoURL
    if (Object.keys(patch).length > 0) {
      await updateDoc(r, { ...patch, updatedAt: now })
      return { ...current, ...patch }
    }
    return current
  })
}

export async function updateMyProfile(client: Client, userId: string, input: { displayName: string }): Promise<void> {
  return run('Erro ao salvar perfil', () =>
    updateDoc(ref(client.db, COLLECTIONS.profiles, userId), { displayName: input.displayName, updatedAt: nowIso() }),
  )
}

// ---------------------------------------------------------------------------
// Região (cidades, casas, produtoras, bandas) — a região-piloto é pequena,
// então carregamos tudo de uma vez e filtramos no cliente.
// ---------------------------------------------------------------------------

export async function fetchCities(client: Client): Promise<City[]> {
  return run('Erro ao carregar cidades', async () => {
    const snap = await getDocs(col(client.db, COLLECTIONS.cities))
    return snap.docs.map((d) => docToCity(d.id, d.data())).sort(byName)
  })
}

function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

/** Busca por prefixo (sem acentos). Filtra no cliente: são poucas cidades. */
export async function searchCities(client: Client, term: string, limit = 8): Promise<City[]> {
  const q = normalize(term)
  if (!q) return []
  const cities = await fetchCities(client)
  return cities.filter((c) => normalize(c.name).startsWith(q)).slice(0, limit)
}

async function fetchVerified<T>(client: Client, name: string, map: (id: string, d: DocData) => T, context: string): Promise<T[]> {
  return run(context, async () => {
    const snap = await getDocs(query(col(client.db, name), where('status', '==', 'verified')))
    return snap.docs.map((d) => map(d.id, d.data()))
  })
}

export async function fetchRegionData(client: Client): Promise<RegionData> {
  const [cities, venues, producers, bands] = await Promise.all([
    fetchCities(client),
    fetchVerified(client, COLLECTIONS.venues, docToVenue, 'Erro ao carregar casas'),
    fetchVerified(client, COLLECTIONS.producers, docToProducer, 'Erro ao carregar produtoras'),
    fetchVerified(client, COLLECTIONS.bands, docToBand, 'Erro ao carregar bandas'),
  ])
  return {
    cities,
    venues: venues.sort(byName),
    producers: producers.sort(byName),
    bands: bands.sort(byName),
  }
}

// ---------------------------------------------------------------------------
// Casas: sugestão (usuário) e moderação (admin)
// ---------------------------------------------------------------------------

export async function submitVenue(client: Client, userId: string, input: VenueSubmissionValues): Promise<Venue> {
  return run('Erro ao enviar casa', async () => {
    const now = nowIso()
    const data: VenueDoc = {
      cityId: input.cityId,
      name: input.name,
      slug: `${slugify(input.name)}-${Math.random().toString(36).slice(2, 8)}`,
      address: input.address,
      lat: input.lat,
      lng: input.lng,
      capacity: input.capacity,
      genres: input.genres,
      showDays: input.showDays,
      dealTypes: input.dealTypes as VenueDoc['dealTypes'],
      hasPa: input.hasPa,
      hasBackline: input.hasBackline,
      acceptsTouringBands: input.acceptsTouringBands,
      contactName: input.contactName,
      contactPhone: input.contactPhone,
      contactEmail: input.contactEmail,
      instagram: input.instagram,
      website: input.website,
      notes: input.notes,
      status: 'pending',
      submittedBy: userId,
      createdAt: now,
      updatedAt: now,
    }
    const created = await addDoc(col(client.db, COLLECTIONS.venues), data)
    return docToVenue(created.id, data)
  })
}

export async function fetchMySubmissions(client: Client, userId: string): Promise<Venue[]> {
  return run('Erro ao carregar suas sugestões', async () => {
    const snap = await getDocs(query(col(client.db, COLLECTIONS.venues), where('submittedBy', '==', userId)))
    return snap.docs.map((d) => docToVenue(d.id, d.data())).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  })
}

export async function fetchPendingVenues(client: Client): Promise<Venue[]> {
  return run('Erro ao carregar pendências', async () => {
    const snap = await getDocs(query(col(client.db, COLLECTIONS.venues), where('status', '==', 'pending')))
    return snap.docs.map((d) => docToVenue(d.id, d.data())).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  })
}

export async function moderateVenue(client: Client, venueId: string, status: Exclude<EntityStatus, 'pending'>): Promise<void> {
  return run('Erro ao moderar casa', () => updateDoc(ref(client.db, COLLECTIONS.venues, venueId), { status, updatedAt: nowIso() }))
}

// ---------------------------------------------------------------------------
// Turnês
// ---------------------------------------------------------------------------

export async function fetchMyTours(client: Client): Promise<TourSummary[]> {
  const uid = currentUid(client)
  return run('Erro ao carregar turnês', async () => {
    const snap = await getDocs(query(col(client.db, COLLECTIONS.tours), where('memberIds', 'array-contains', uid)))
    return snap.docs.map((d) => docToTourSummary(d.id, d.data())).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  })
}

async function fetchTourDates(db: Firestore, tourId: string): Promise<TourDate[]> {
  const snap = await getDocs(datesCol(db, tourId))
  return snap.docs
    .map((d) => docToTourDate(tourId, d.id, d.data()))
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt))
}

export async function fetchTour(client: Client, tourId: string): Promise<TourWithDates | null> {
  return run('Erro ao carregar turnê', async () => {
    const tourSnap = await getDoc(ref(client.db, COLLECTIONS.tours, tourId))
    if (!tourSnap.exists()) return null
    const tour = docToTour(tourSnap.id, tourSnap.data())
    const [dates, profiles] = await Promise.all([
      fetchTourDates(client.db, tourId),
      Promise.all(
        tour.memberIds.map(async (uid) => {
          try {
            return await fetchMyProfile(client, uid)
          } catch {
            return null
          }
        }),
      ),
    ])
    const members: TourMember[] = tour.memberIds.map((uid, i) => ({
      tourId,
      profileId: uid,
      role: uid === tour.ownerId ? 'editor' : (tour.memberRoles[uid] ?? 'viewer'),
      profile: profiles[i] ?? undefined,
    }))
    return { ...tour, dates, members }
  })
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

function defaultChecklist(): TourDateDoc['checklist'] {
  return DEFAULT_CHECKLIST.map((label) => ({ label, done: false }))
}

function summaryOf(dates: Array<{ date: string }>): Pick<TourDoc, 'dateCount' | 'firstDate' | 'lastDate'> {
  const sorted = dates.map((d) => d.date).sort()
  return { dateCount: sorted.length, firstDate: sorted[0] ?? null, lastDate: sorted.at(-1) ?? null }
}

export async function createTour(client: Client, ownerId: string, input: CreateTourInput): Promise<Tour> {
  return run('Erro ao criar turnê', async () => {
    const t = input.tour
    const now = nowIso()
    const tourRef = doc(col(client.db, COLLECTIONS.tours))
    const data: TourDoc = {
      ownerId,
      bandId: t.bandId,
      bandName: t.bandName,
      name: t.name,
      startCityId: t.startCityId,
      endCityId: t.endCityId,
      maxKmPerDay: t.maxKmPerDay,
      allowOffDays: t.allowOffDays,
      genres: t.genres,
      capacityMin: t.capacityMin,
      capacityMax: t.capacityMax,
      notes: t.notes,
      shareToken: null,
      memberIds: [ownerId],
      memberRoles: { [ownerId]: 'editor' },
      ...summaryOf(input.dates),
      createdAt: now,
      updatedAt: now,
    }
    const batch = writeBatch(client.db)
    batch.set(tourRef, data)
    for (const d of input.dates) {
      const dateDoc: TourDateDoc = {
        date: d.date,
        cityId: d.cityId,
        venueId: d.venueId,
        producerId: d.producerId,
        status: d.status ?? 'ideia',
        isFixed: d.isFixed,
        loadInTime: null,
        soundcheckTime: null,
        doorsTime: null,
        setTime: null,
        dealType: null,
        feeCents: null,
        costCents: null,
        lodging: null,
        checklist: defaultChecklist(),
        notes: null,
        bands: (d.bandIds ?? []).map((bandId) => ({ bandId, role: 'convidada' })),
        createdAt: now,
        updatedAt: now,
      }
      batch.set(doc(datesCol(client.db, tourRef.id)), dateDoc)
    }
    await batch.commit()
    return docToTour(tourRef.id, data)
  })
}

export async function updateTour(client: Client, tourId: string, patch: Partial<TourFormValues>): Promise<void> {
  await run('Erro ao salvar turnê', () =>
    updateDoc(ref(client.db, COLLECTIONS.tours, tourId), clean({ ...patch, updatedAt: nowIso() })),
  )
  await syncPublicTourbook(client, tourId)
}

/** Apaga a turnê, suas datas e o tourbook público (o Firestore não faz cascata). */
export async function deleteTour(client: Client, tourId: string): Promise<void> {
  return run('Erro ao excluir turnê', async () => {
    const tourRef = ref(client.db, COLLECTIONS.tours, tourId)
    const tourSnap = await getDoc(tourRef)
    if (!tourSnap.exists()) return
    const tour = docToTour(tourSnap.id, tourSnap.data())
    if (tour.shareToken) await deleteDoc(ref(client.db, COLLECTIONS.publicTourbooks, tour.shareToken))
    const dates = await getDocs(datesCol(client.db, tourId))
    for (const part of chunk(dates.docs, 400)) {
      const batch = writeBatch(client.db)
      for (const d of part) batch.delete(d.ref)
      await batch.commit()
    }
    await deleteDoc(tourRef)
  })
}

export type TourDatePatch = Partial<TourDateFormValues> & {
  checklist?: Array<{ label: string; done: boolean }>
  bands?: Array<{ bandId: string; role: string }>
}

export async function addTourDate(client: Client, tourId: string, input: TourDatePatch & { date: string }): Promise<TourDate> {
  const created = await run('Erro ao adicionar data', async () => {
    const now = nowIso()
    const data: TourDateDoc = {
      date: input.date,
      cityId: input.cityId ?? null,
      venueId: input.venueId ?? null,
      producerId: input.producerId ?? null,
      status: (input.status as TourDateStatus | undefined) ?? 'ideia',
      isFixed: input.isFixed ?? false,
      loadInTime: input.loadInTime ?? null,
      soundcheckTime: input.soundcheckTime ?? null,
      doorsTime: input.doorsTime ?? null,
      setTime: input.setTime ?? null,
      dealType: (input.dealType as TourDateDoc['dealType'] | undefined) ?? null,
      feeCents: input.feeCents ?? null,
      costCents: input.costCents ?? null,
      lodging: input.lodging ?? null,
      checklist: input.checklist ?? defaultChecklist(),
      notes: input.notes ?? null,
      bands: input.bands ?? [],
      createdAt: now,
      updatedAt: now,
    }
    const r = await addDoc(datesCol(client.db, tourId), data)
    return docToTourDate(tourId, r.id, data)
  })
  await afterDatesChanged(client, tourId)
  return created
}

export async function updateTourDate(client: Client, tourId: string, dateId: string, patch: TourDatePatch): Promise<void> {
  await run('Erro ao salvar data', () =>
    updateDoc(doc(datesCol(client.db, tourId), dateId), clean({ ...patch, updatedAt: nowIso() })),
  )
  await afterDatesChanged(client, tourId)
}

export async function deleteTourDate(client: Client, tourId: string, dateId: string): Promise<void> {
  await run('Erro ao remover data', () => deleteDoc(doc(datesCol(client.db, tourId), dateId)))
  await afterDatesChanged(client, tourId)
}

export async function setTourDateBands(client: Client, tourId: string, dateId: string, bandIds: string[]): Promise<void> {
  await updateTourDate(client, tourId, dateId, { bands: bandIds.map((bandId) => ({ bandId, role: 'convidada' })) })
}

/** Recalcula `dateCount/firstDate/lastDate` e atualiza o tourbook público, se houver. */
async function afterDatesChanged(client: Client, tourId: string): Promise<void> {
  await recomputeTourSummary(client, tourId)
  await syncPublicTourbook(client, tourId)
}

export async function recomputeTourSummary(client: Client, tourId: string): Promise<void> {
  return run('Erro ao atualizar resumo da turnê', async () => {
    const dates = await fetchTourDates(client.db, tourId)
    await updateDoc(ref(client.db, COLLECTIONS.tours, tourId), { ...summaryOf(dates), updatedAt: nowIso() })
  })
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

// ---------------------------------------------------------------------------
// Tourbook público (link /t/:token)
// ---------------------------------------------------------------------------

/** Tudo que a página pública e o PDF precisam, já sem dono, dinheiro e quem cadastrou. */
export type PublicTourbookPayload = {
  tour: Tour
  dates: TourDate[]
  lookups: { cities: City[]; venues: Venue[]; bands: Band[]; producers: Producer[] }
  generatedAt: string
}

export async function enableShareLink(client: Client, tourId: string): Promise<string> {
  const tourRef = ref(client.db, COLLECTIONS.tours, tourId)
  const existing = await run('Erro ao gerar link', async () => {
    const snap = await getDoc(tourRef)
    return snap.exists() ? docToTour(snap.id, snap.data()).shareToken : null
  })
  const token = existing ?? randomUuid()
  if (!existing) await run('Erro ao gerar link', () => updateDoc(tourRef, { shareToken: token, updatedAt: nowIso() }))
  await syncPublicTourbook(client, tourId)
  return token
}

export async function disableShareLink(client: Client, tourId: string): Promise<void> {
  return run('Erro ao desativar link', async () => {
    const tourRef = ref(client.db, COLLECTIONS.tours, tourId)
    const snap = await getDoc(tourRef)
    if (!snap.exists()) return
    const token = docToTour(snap.id, snap.data()).shareToken
    // Primeiro o documento público (a regra exige que o token ainda bata com a turnê).
    if (token) await deleteDoc(ref(client.db, COLLECTIONS.publicTourbooks, token))
    await updateDoc(tourRef, { shareToken: null, updatedAt: nowIso() })
  })
}

async function fetchMany<T>(client: Client, name: string, ids: Iterable<string | null>, map: (id: string, d: DocData) => T): Promise<T[]> {
  const unique = [...new Set([...ids].filter((id): id is string => !!id))]
  const results: Array<T | null> = await Promise.all(
    unique.map(async (id): Promise<T | null> => {
      try {
        const snap = await getDoc(ref(client.db, name, id))
        return snap.exists() ? map(snap.id, snap.data()) : null
      } catch {
        // Ex.: casa pendente de outro usuário — sem permissão de leitura; segue sem ela.
        return null
      }
    }),
  )
  return results.filter((x): x is T => x !== null)
}

/** Monta o payload público a partir da turnê e das entidades referenciadas. */
export async function buildPublicTourbookPayload(client: Client, tour: TourWithDates): Promise<PublicTourbookPayload> {
  const [cities, venues, bands, producers] = await Promise.all([
    fetchMany(client, COLLECTIONS.cities, [tour.startCityId, tour.endCityId, ...tour.dates.map((d) => d.cityId)], docToCity),
    fetchMany(client, COLLECTIONS.venues, tour.dates.map((d) => d.venueId), docToVenue),
    fetchMany(client, COLLECTIONS.bands, [tour.bandId, ...tour.dates.flatMap((d) => d.bands.map((b) => b.bandId))], docToBand),
    fetchMany(client, COLLECTIONS.producers, tour.dates.map((d) => d.producerId), docToProducer),
  ])
  const publicTour: Tour = { ...tour, ownerId: '', shareToken: null, memberIds: [], memberRoles: {} }
  const { dates: _dates, members: _members, ...tourFields } = publicTour as TourWithDates
  return {
    tour: tourFields,
    dates: tour.dates.map((d) => ({ ...d, feeCents: null, costCents: null })),
    lookups: {
      cities,
      venues: venues.map((v) => ({ ...v, submittedBy: null })),
      bands: bands.map((b) => ({ ...b, submittedBy: null, ownerId: null })),
      producers: producers.map((p) => ({ ...p, submittedBy: null })),
    },
    generatedAt: nowIso(),
  }
}

/** Regrava `publicTourbooks/{token}` se a turnê tiver link ativo. Silencioso quando não tem. */
export async function syncPublicTourbook(client: Client, tourId: string): Promise<void> {
  const tour = await fetchTour(client, tourId)
  if (!tour?.shareToken) return
  await run('Erro ao atualizar tourbook público', async () => {
    const payload = await buildPublicTourbookPayload(client, tour)
    const data: PublicTourbookDoc<PublicTourbookPayload> = { tourId, payload, updatedAt: nowIso() }
    await setDoc(ref(client.db, COLLECTIONS.publicTourbooks, tour.shareToken!), data)
  })
}

/** Tourbook público: null se o link não existe ou foi desativado. */
export async function fetchPublicTourbook(client: Client, token: string): Promise<PublicTourbookPayload | null> {
  return run('Erro ao carregar tourbook', async () => {
    const snap = await getDoc(ref(client.db, COLLECTIONS.publicTourbooks, token))
    if (!snap.exists()) return null
    const payload = (snap.data() as Partial<PublicTourbookDoc<PublicTourbookPayload>>).payload
    return payload && typeof payload === 'object' && 'tour' in payload ? payload : null
  })
}

// ---------------------------------------------------------------------------
// Dados de exemplo (admin): importa cidades/casas/produtoras/bandas em lote.
// ---------------------------------------------------------------------------

type Stamps = 'createdAt' | 'updatedAt'
export type SeedCity = CityDoc & { id: string }
export type SeedVenue = Omit<VenueDoc, Stamps | 'status' | 'submittedBy'> & { id: string }
export type SeedProducer = Omit<ProducerDoc, Stamps | 'status' | 'submittedBy'> & { id: string }
export type SeedBand = Omit<BandDoc, Stamps | 'status' | 'submittedBy' | 'ownerId'> & { id: string }
export type SeedData = { cities: SeedCity[]; venues: SeedVenue[]; producers: SeedProducer[]; bands: SeedBand[] }

export type SeedProgress = { collection: string; done: number; total: number }

/** Grava (ou regrava) os documentos do seed com ids determinísticos. Só admin passa nas regras. */
export async function importSeedData(client: Client, seed: SeedData, onProgress?: (p: SeedProgress) => void): Promise<{ written: number }> {
  return run('Erro ao importar dados de exemplo', async () => {
    const now = nowIso()
    const groups: Array<{ name: string; docs: Array<{ id: string; data: DocData }> }> = [
      { name: COLLECTIONS.cities, docs: seed.cities.map(({ id, ...data }) => ({ id, data })) },
      {
        name: COLLECTIONS.venues,
        docs: seed.venues.map(({ id, ...data }) => ({ id, data: { ...data, status: 'verified', submittedBy: null, createdAt: now, updatedAt: now } })),
      },
      {
        name: COLLECTIONS.producers,
        docs: seed.producers.map(({ id, ...data }) => ({ id, data: { ...data, status: 'verified', submittedBy: null, createdAt: now, updatedAt: now } })),
      },
      {
        name: COLLECTIONS.bands,
        docs: seed.bands.map(({ id, ...data }) => ({
          id,
          data: { ...data, status: 'verified', submittedBy: null, ownerId: null, createdAt: now, updatedAt: now },
        })),
      },
    ]
    let written = 0
    for (const group of groups) {
      let done = 0
      for (const part of chunk(group.docs, 400)) {
        const batch = writeBatch(client.db)
        for (const { id, data } of part) batch.set(ref(client.db, group.name, id), data)
        await batch.commit()
        done += part.length
        written += part.length
        onProgress?.({ collection: group.name, done, total: group.docs.length })
      }
    }
    return { written }
  })
}

export type CollectionCounts = { cities: number; venues: number; producers: number; bands: number }

/** Quantos documentos há em cada coleção do mapa (para a tela de administração). */
export async function fetchCollectionCounts(client: Client): Promise<CollectionCounts> {
  return run('Erro ao contar registros', async () => {
    const [cities, venues, producers, bands] = await Promise.all(
      [COLLECTIONS.cities, COLLECTIONS.venues, COLLECTIONS.producers, COLLECTIONS.bands].map(async (name) => {
        const snap = await getCountFromServer(col(client.db, name))
        return snap.data().count
      }),
    )
    return { cities: cities!, venues: venues!, producers: producers!, bands: bands! }
  })
}
