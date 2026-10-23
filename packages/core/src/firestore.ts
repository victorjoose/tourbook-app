// Modelo do Cloud Firestore (documentos como são gravados) e o "cliente" que
// as queries recebem. Nada de React/DOM aqui: este arquivo roda no web, no Node
// (scripts) e no React Native.
import type { Auth } from 'firebase/auth'
import type { Firestore } from 'firebase/firestore'

/** O que toda função de `queries.ts` recebe. */
export type Client = { db: Firestore; auth: Auth }

export type EntityStatus = 'verified' | 'pending' | 'rejected'
export type UserRole = 'user' | 'admin'
export type TourDateStatus = 'ideia' | 'contato_feito' | 'negociando' | 'confirmado' | 'realizado' | 'cancelado'
export type DealType = 'cache_fixo' | 'bilheteria' | 'porta' | 'misto'
export type TourMemberRole = 'editor' | 'viewer'

export type BandLinks = { spotify?: string; instagram?: string; youtube?: string; bandcamp?: string }
export type ChecklistItem = { label: string; done: boolean }
export type TourDateBandRef = { bandId: string; role: string }

/** Nomes das coleções (as regras em `firebase/firestore.rules` usam os mesmos). */
export const COLLECTIONS = {
  profiles: 'profiles',
  cities: 'cities',
  venues: 'venues',
  producers: 'producers',
  bands: 'bands',
  tours: 'tours',
  /** Subcoleção de `tours/{tourId}`. */
  dates: 'dates',
  publicTourbooks: 'publicTourbooks',
} as const

// Datas/horas são gravadas como ISO 8601 (string) para terem o mesmo tipo em
// qualquer plataforma; os mappers também aceitam `Timestamp` por tolerância.

export type ProfileDoc = {
  displayName: string | null
  avatarUrl: string | null
  role: UserRole
  createdAt: string
  updatedAt: string
}

export type CityDoc = {
  name: string
  state: string
  slug: string
  lat: number
  lng: number
  population: number | null
}

export type VenueDoc = {
  cityId: string
  name: string
  slug: string
  address: string | null
  lat: number
  lng: number
  capacity: number | null
  genres: string[]
  /** 0 = domingo … 6 = sábado */
  showDays: number[]
  dealTypes: DealType[]
  hasPa: boolean
  hasBackline: boolean
  acceptsTouringBands: boolean
  contactName: string | null
  contactPhone: string | null
  contactEmail: string | null
  instagram: string | null
  website: string | null
  notes: string | null
  status: EntityStatus
  submittedBy: string | null
  createdAt: string
  updatedAt: string
}

export type ProducerDoc = {
  name: string
  slug: string
  cityId: string | null
  /** Cidades atendidas (inclui `cityId` quando existe). Substitui a tabela producer_cities. */
  cityIds: string[]
  /** Casas com que costuma trabalhar. Substitui producer_venues. */
  venueIds: string[]
  genres: string[]
  contactName: string | null
  contactPhone: string | null
  contactEmail: string | null
  instagram: string | null
  website: string | null
  notes: string | null
  status: EntityStatus
  submittedBy: string | null
  createdAt: string
  updatedAt: string
}

export type BandDoc = {
  name: string
  slug: string
  cityId: string | null
  genres: string[]
  links: BandLinks
  contactName: string | null
  contactPhone: string | null
  contactEmail: string | null
  opensForTouring: boolean
  ownerId: string | null
  notes: string | null
  status: EntityStatus
  submittedBy: string | null
  createdAt: string
  updatedAt: string
}

export type TourDoc = {
  ownerId: string
  bandId: string | null
  bandName: string
  name: string
  startCityId: string | null
  endCityId: string | null
  maxKmPerDay: number
  allowOffDays: boolean
  genres: string[]
  capacityMin: number | null
  capacityMax: number | null
  notes: string | null
  /** Token do tourbook público (`publicTourbooks/{shareToken}`), ou null quando desativado. */
  shareToken: string | null
  /** Todos com acesso (inclui o dono). As regras usam `array-contains`. */
  memberIds: string[]
  /** uid → papel. O dono entra como 'editor'. */
  memberRoles: Record<string, TourMemberRole>
  // Resumo mantido pelo cliente após cada mutação em `dates` (recomputeTourSummary).
  dateCount: number
  firstDate: string | null
  lastDate: string | null
  createdAt: string
  updatedAt: string
}

export type TourDateDoc = {
  /** ISO YYYY-MM-DD */
  date: string
  cityId: string | null
  venueId: string | null
  producerId: string | null
  status: TourDateStatus
  isFixed: boolean
  loadInTime: string | null
  soundcheckTime: string | null
  doorsTime: string | null
  setTime: string | null
  dealType: DealType | null
  feeCents: number | null
  costCents: number | null
  lodging: string | null
  checklist: ChecklistItem[]
  notes: string | null
  /** Substitui a tabela tour_date_bands. */
  bands: TourDateBandRef[]
  createdAt: string
  updatedAt: string
}

/** `publicTourbooks/{token}` — cópia desnormalizada e sanitizada, legível sem login. */
export type PublicTourbookDoc<TPayload = unknown> = {
  tourId: string
  payload: TPayload
  updatedAt: string
}
