// Tipos do banco, espelhando supabase/migrations/0001_init.sql.
// Quando o schema mudar, atualize aqui (ou regenere com `supabase gen types typescript`).

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type EntityStatus = 'verified' | 'pending' | 'rejected'
export type UserRole = 'user' | 'admin'
export type TourDateStatus = 'ideia' | 'contato_feito' | 'negociando' | 'confirmado' | 'realizado' | 'cancelado'
export type DealType = 'cache_fixo' | 'bilheteria' | 'porta' | 'misto'
export type TourMemberRole = 'editor' | 'viewer'

export type ProfileRow = {
  id: string
  display_name: string | null
  avatar_url: string | null
  role: UserRole
  created_at: string
  updated_at: string
}

export type CityRow = {
  id: string
  name: string
  state: string
  slug: string
  lat: number
  lng: number
  population: number | null
  created_at: string
}

export type VenueRow = {
  id: string
  city_id: string
  name: string
  slug: string
  address: string | null
  lat: number
  lng: number
  capacity: number | null
  genres: string[]
  show_days: number[]
  deal_types: DealType[]
  has_pa: boolean
  has_backline: boolean
  accepts_touring_bands: boolean
  contact_name: string | null
  contact_phone: string | null
  contact_email: string | null
  instagram: string | null
  website: string | null
  notes: string | null
  status: EntityStatus
  submitted_by: string | null
  created_at: string
  updated_at: string
}

export type ProducerRow = {
  id: string
  name: string
  slug: string
  city_id: string | null
  genres: string[]
  contact_name: string | null
  contact_phone: string | null
  contact_email: string | null
  instagram: string | null
  website: string | null
  notes: string | null
  status: EntityStatus
  submitted_by: string | null
  created_at: string
  updated_at: string
}

export type ProducerCityRow = { producer_id: string; city_id: string }
export type ProducerVenueRow = { producer_id: string; venue_id: string }

export type BandLinks = {
  spotify?: string
  instagram?: string
  youtube?: string
  bandcamp?: string
}

export type BandRow = {
  id: string
  name: string
  slug: string
  city_id: string | null
  genres: string[]
  links: Json
  contact_name: string | null
  contact_phone: string | null
  contact_email: string | null
  opens_for_touring: boolean
  owner_id: string | null
  notes: string | null
  status: EntityStatus
  submitted_by: string | null
  created_at: string
  updated_at: string
}

export type TourRow = {
  id: string
  owner_id: string
  band_id: string | null
  band_name: string
  name: string
  start_city_id: string | null
  end_city_id: string | null
  max_km_per_day: number
  allow_off_days: boolean
  genres: string[]
  capacity_min: number | null
  capacity_max: number | null
  notes: string | null
  share_token: string | null
  created_at: string
  updated_at: string
}

export type TourMemberRow = {
  tour_id: string
  profile_id: string
  role: TourMemberRole
  created_at: string
}

export type ChecklistItem = { label: string; done: boolean }

export type TourDateRow = {
  id: string
  tour_id: string
  date: string
  city_id: string | null
  venue_id: string | null
  producer_id: string | null
  status: TourDateStatus
  is_fixed: boolean
  load_in_time: string | null
  soundcheck_time: string | null
  doors_time: string | null
  set_time: string | null
  deal_type: DealType | null
  fee_cents: number | null
  cost_cents: number | null
  lodging: string | null
  checklist: Json
  notes: string | null
  created_at: string
  updated_at: string
}

export type TourDateBandRow = { tour_date_id: string; band_id: string; role: string }

type Relationship = {
  foreignKeyName: string
  columns: string[]
  isOneToOne: boolean
  referencedRelation: string
  referencedColumns: string[]
}

type Generated<Row, Required extends keyof Row = never, Rels extends Relationship[] = []> = {
  Row: Row
  Insert: Partial<Row> & Pick<Row, Required>
  Update: Partial<Row>
  Relationships: Rels
}

type Fk<Name extends string, Col extends string, Ref extends string, OneToOne extends boolean = false> = {
  foreignKeyName: Name
  columns: [Col]
  isOneToOne: OneToOne
  referencedRelation: Ref
  referencedColumns: ['id']
}

export type Database = {
  public: {
    Tables: {
      profiles: Generated<ProfileRow, 'id'>
      cities: Generated<CityRow, 'name' | 'state' | 'slug' | 'lat' | 'lng'>
      venues: Generated<
        VenueRow,
        'city_id' | 'name' | 'slug' | 'lat' | 'lng',
        [Fk<'venues_city_id_fkey', 'city_id', 'cities'>, Fk<'venues_submitted_by_fkey', 'submitted_by', 'profiles'>]
      >
      producers: Generated<
        ProducerRow,
        'name' | 'slug',
        [Fk<'producers_city_id_fkey', 'city_id', 'cities'>, Fk<'producers_submitted_by_fkey', 'submitted_by', 'profiles'>]
      >
      producer_cities: Generated<
        ProducerCityRow,
        'producer_id' | 'city_id',
        [
          Fk<'producer_cities_producer_id_fkey', 'producer_id', 'producers'>,
          Fk<'producer_cities_city_id_fkey', 'city_id', 'cities'>,
        ]
      >
      producer_venues: Generated<
        ProducerVenueRow,
        'producer_id' | 'venue_id',
        [
          Fk<'producer_venues_producer_id_fkey', 'producer_id', 'producers'>,
          Fk<'producer_venues_venue_id_fkey', 'venue_id', 'venues'>,
        ]
      >
      bands: Generated<
        BandRow,
        'name' | 'slug',
        [
          Fk<'bands_city_id_fkey', 'city_id', 'cities'>,
          Fk<'bands_owner_id_fkey', 'owner_id', 'profiles'>,
          Fk<'bands_submitted_by_fkey', 'submitted_by', 'profiles'>,
        ]
      >
      tours: Generated<
        TourRow,
        'owner_id' | 'band_name' | 'name',
        [
          Fk<'tours_owner_id_fkey', 'owner_id', 'profiles'>,
          Fk<'tours_band_id_fkey', 'band_id', 'bands'>,
          Fk<'tours_start_city_id_fkey', 'start_city_id', 'cities'>,
          Fk<'tours_end_city_id_fkey', 'end_city_id', 'cities'>,
        ]
      >
      tour_members: Generated<
        TourMemberRow,
        'tour_id' | 'profile_id',
        [Fk<'tour_members_tour_id_fkey', 'tour_id', 'tours'>, Fk<'tour_members_profile_id_fkey', 'profile_id', 'profiles'>]
      >
      tour_dates: Generated<
        TourDateRow,
        'tour_id' | 'date',
        [
          Fk<'tour_dates_tour_id_fkey', 'tour_id', 'tours'>,
          Fk<'tour_dates_city_id_fkey', 'city_id', 'cities'>,
          Fk<'tour_dates_venue_id_fkey', 'venue_id', 'venues'>,
          Fk<'tour_dates_producer_id_fkey', 'producer_id', 'producers'>,
        ]
      >
      tour_date_bands: Generated<
        TourDateBandRow,
        'tour_date_id' | 'band_id',
        [
          Fk<'tour_date_bands_tour_date_id_fkey', 'tour_date_id', 'tour_dates'>,
          Fk<'tour_date_bands_band_id_fkey', 'band_id', 'bands'>,
        ]
      >
    }
    Views: Record<never, never>
    Functions: {
      is_admin: { Args: Record<never, never>; Returns: boolean }
      can_view_tour: { Args: { p_tour_id: string }; Returns: boolean }
      can_edit_tour: { Args: { p_tour_id: string }; Returns: boolean }
      get_public_tourbook: { Args: { p_token: string }; Returns: Json }
    }
    Enums: {
      entity_status: EntityStatus
      user_role: UserRole
      tour_date_status: TourDateStatus
      deal_type: DealType
      tour_member_role: TourMemberRole
    }
    CompositeTypes: Record<never, never>
  }
}
