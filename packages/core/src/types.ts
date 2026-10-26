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

export type { BandLinks, ChecklistItem, DealType, EntityStatus, TourDateStatus, TourMemberRole, UserRole }

export type LatLng = { lat: number; lng: number }

export type Bounds = { minLat: number; minLng: number; maxLat: number; maxLng: number }

export type Profile = {
  id: string
  displayName: string | null
  avatarUrl: string | null
  role: UserRole
}

export type City = LatLng & {
  id: string
  name: string
  state: string
  slug: string
  population: number | null
}

export type Venue = LatLng & {
  id: string
  cityId: string
  name: string
  slug: string
  address: string | null
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
}

export type Producer = {
  id: string
  name: string
  slug: string
  cityId: string | null
  /** Cidades atendidas (inclui a base quando cadastrada). */
  cityIds: string[]
  /** Casas com que costuma trabalhar. */
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
}

export type Band = {
  id: string
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
}

export type Tour = {
  id: string
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
  shareToken: string | null
  /** Quem tem acesso (inclui o dono). */
  memberIds: string[]
  /** uid → papel (o dono é sempre editor). */
  memberRoles: Record<string, TourMemberRole>
  createdAt: string
  updatedAt: string
}

/** Turnê com o resumo mantido no documento (lista de turnês). */
export type TourSummary = Tour & { dateCount: number; firstDate: string | null; lastDate: string | null }

export type TourDateBand = TourDateBandRef

export type TourDate = {
  id: string
  tourId: string
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
  bands: TourDateBand[]
  createdAt: string
}

export type TourMember = { tourId: string; profileId: string; role: TourMemberRole; profile?: Profile }

export type TourWithDates = Tour & { dates: TourDate[]; members: TourMember[] }

export type RegionData = {
  cities: City[]
  venues: Venue[]
  producers: Producer[]
  bands: Band[]
}

export type MapFilters = {
  genres: string[]
  capacityMin: number | null
  capacityMax: number | null
  /** 0 = domingo … 6 = sábado; null = qualquer dia */
  showDay: number | null
  acceptsTouringOnly: boolean
}

export const EMPTY_FILTERS: MapFilters = {
  genres: [],
  capacityMin: null,
  capacityMax: null,
  showDay: null,
  acceptsTouringOnly: false,
}
