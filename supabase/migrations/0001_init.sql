-- Tour App — schema inicial
-- Postgres 17 + PostGIS. Aplicar com `supabase db push` ou colar no SQL Editor.

create extension if not exists postgis with schema extensions;
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------
create type public.entity_status as enum ('verified', 'pending', 'rejected');
create type public.user_role as enum ('user', 'admin');
create type public.tour_date_status as enum (
  'ideia', 'contato_feito', 'negociando', 'confirmado', 'realizado', 'cancelado'
);
create type public.deal_type as enum ('cache_fixo', 'bilheteria', 'porta', 'misto');
create type public.tour_member_role as enum ('editor', 'viewer');

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- Perfis
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  role public.user_role not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- ---------------------------------------------------------------------------
-- Cidades
-- ---------------------------------------------------------------------------
create table public.cities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  state char(2) not null,
  slug text not null unique,
  lat double precision not null,
  lng double precision not null,
  location extensions.geography(point, 4326) generated always as
    (extensions.ST_SetSRID(extensions.ST_MakePoint(lng, lat), 4326)::extensions.geography) stored,
  population integer,
  created_at timestamptz not null default now()
);
create index cities_location_idx on public.cities using gist (location);
create index cities_state_idx on public.cities (state);

-- ---------------------------------------------------------------------------
-- Casas de show
-- ---------------------------------------------------------------------------
create table public.venues (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references public.cities (id) on delete restrict,
  name text not null,
  slug text not null unique,
  address text,
  lat double precision not null,
  lng double precision not null,
  location extensions.geography(point, 4326) generated always as
    (extensions.ST_SetSRID(extensions.ST_MakePoint(lng, lat), 4326)::extensions.geography) stored,
  capacity integer,
  genres text[] not null default '{}',
  show_days smallint[] not null default '{}',          -- 0 = domingo … 6 = sábado
  deal_types public.deal_type[] not null default '{}',
  has_pa boolean not null default false,
  has_backline boolean not null default false,
  accepts_touring_bands boolean not null default true,
  contact_name text,
  contact_phone text,
  contact_email text,
  instagram text,
  website text,
  notes text,
  status public.entity_status not null default 'pending',
  submitted_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index venues_city_idx on public.venues (city_id);
create index venues_location_idx on public.venues using gist (location);
create index venues_status_idx on public.venues (status);
create index venues_genres_idx on public.venues using gin (genres);
create trigger venues_updated_at before update on public.venues
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Produtoras
-- ---------------------------------------------------------------------------
create table public.producers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  city_id uuid references public.cities (id) on delete set null,   -- cidade base
  genres text[] not null default '{}',
  contact_name text,
  contact_phone text,
  contact_email text,
  instagram text,
  website text,
  notes text,
  status public.entity_status not null default 'pending',
  submitted_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger producers_updated_at before update on public.producers
  for each row execute function public.set_updated_at();

create table public.producer_cities (
  producer_id uuid not null references public.producers (id) on delete cascade,
  city_id uuid not null references public.cities (id) on delete cascade,
  primary key (producer_id, city_id)
);

create table public.producer_venues (
  producer_id uuid not null references public.producers (id) on delete cascade,
  venue_id uuid not null references public.venues (id) on delete cascade,
  primary key (producer_id, venue_id)
);

-- ---------------------------------------------------------------------------
-- Bandas
-- ---------------------------------------------------------------------------
create table public.bands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  city_id uuid references public.cities (id) on delete set null,   -- cidade base
  genres text[] not null default '{}',
  links jsonb not null default '{}'::jsonb,   -- { spotify, instagram, youtube, bandcamp }
  contact_name text,
  contact_phone text,
  contact_email text,
  opens_for_touring boolean not null default true,
  owner_id uuid references public.profiles (id) on delete set null,  -- perfil que reivindicou
  notes text,
  status public.entity_status not null default 'pending',
  submitted_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index bands_city_idx on public.bands (city_id);
create trigger bands_updated_at before update on public.bands
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Turnês
-- ---------------------------------------------------------------------------
create table public.tours (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  band_id uuid references public.bands (id) on delete set null,
  band_name text not null,
  name text not null,
  start_city_id uuid references public.cities (id) on delete set null,
  end_city_id uuid references public.cities (id) on delete set null,
  max_km_per_day integer not null default 400,
  allow_off_days boolean not null default true,
  genres text[] not null default '{}',
  capacity_min integer,
  capacity_max integer,
  notes text,
  share_token uuid unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tours_owner_idx on public.tours (owner_id);
create trigger tours_updated_at before update on public.tours
  for each row execute function public.set_updated_at();

create table public.tour_members (
  tour_id uuid not null references public.tours (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  role public.tour_member_role not null default 'viewer',
  created_at timestamptz not null default now(),
  primary key (tour_id, profile_id)
);

create table public.tour_dates (
  id uuid primary key default gen_random_uuid(),
  tour_id uuid not null references public.tours (id) on delete cascade,
  date date not null,
  city_id uuid references public.cities (id) on delete set null,
  venue_id uuid references public.venues (id) on delete set null,
  producer_id uuid references public.producers (id) on delete set null,
  status public.tour_date_status not null default 'ideia',
  is_fixed boolean not null default false,
  load_in_time time,
  soundcheck_time time,
  doors_time time,
  set_time time,
  deal_type public.deal_type,
  fee_cents integer,
  cost_cents integer,
  lodging text,
  checklist jsonb not null default '[]'::jsonb,   -- [{ "label": "Contrato", "done": false }]
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tour_dates_tour_idx on public.tour_dates (tour_id, date);
create trigger tour_dates_updated_at before update on public.tour_dates
  for each row execute function public.set_updated_at();

create table public.tour_date_bands (
  tour_date_id uuid not null references public.tour_dates (id) on delete cascade,
  band_id uuid not null references public.bands (id) on delete cascade,
  role text not null default 'abertura',
  primary key (tour_date_id, band_id)
);

-- ---------------------------------------------------------------------------
-- Funções de acesso a turnês
-- ---------------------------------------------------------------------------
create or replace function public.can_view_tour(p_tour_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.tours t where t.id = p_tour_id and t.owner_id = auth.uid()
  ) or exists (
    select 1 from public.tour_members m where m.tour_id = p_tour_id and m.profile_id = auth.uid()
  );
$$;

create or replace function public.can_edit_tour(p_tour_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.tours t where t.id = p_tour_id and t.owner_id = auth.uid()
  ) or exists (
    select 1 from public.tour_members m
    where m.tour_id = p_tour_id and m.profile_id = auth.uid() and m.role = 'editor'
  );
$$;

-- Tourbook público (link compartilhável, sem login). Retorna JSON já montado.
create or replace function public.get_public_tourbook(p_token uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'tour', to_jsonb(t) - 'owner_id' - 'share_token',
    'dates', coalesce((
      select jsonb_agg(
        (to_jsonb(d) - 'fee_cents' - 'cost_cents')
        || jsonb_build_object(
          'city', (select to_jsonb(c) from public.cities c where c.id = d.city_id),
          'venue', (select to_jsonb(v) - 'submitted_by' from public.venues v where v.id = d.venue_id),
          'bands', coalesce((
            select jsonb_agg(jsonb_build_object('id', b.id, 'name', b.name, 'role', tdb.role, 'links', b.links))
            from public.tour_date_bands tdb join public.bands b on b.id = tdb.band_id
            where tdb.tour_date_id = d.id
          ), '[]'::jsonb)
        )
        order by d.date
      )
      from public.tour_dates d where d.tour_id = t.id
    ), '[]'::jsonb),
    'start_city', (select to_jsonb(c) from public.cities c where c.id = t.start_city_id),
    'end_city', (select to_jsonb(c) from public.cities c where c.id = t.end_city_id)
  )
  from public.tours t
  where t.share_token = p_token;
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.cities enable row level security;
alter table public.venues enable row level security;
alter table public.producers enable row level security;
alter table public.producer_cities enable row level security;
alter table public.producer_venues enable row level security;
alter table public.bands enable row level security;
alter table public.tours enable row level security;
alter table public.tour_members enable row level security;
alter table public.tour_dates enable row level security;
alter table public.tour_date_bands enable row level security;

-- profiles: todo usuário logado vê nomes (para membros da turnê); edita só o próprio; role só admin muda.
create policy "profiles_select" on public.profiles for select to authenticated using (true);
create policy "profiles_update_own" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid() and role = (select p.role from public.profiles p where p.id = auth.uid()));

-- cities: leitura para todos (inclusive anônimo, para o tourbook público); escrita só admin.
create policy "cities_select" on public.cities for select using (true);
create policy "cities_admin_all" on public.cities for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- venues / producers / bands: logado vê verificadas + as que ele enviou; admin vê tudo.
-- Usuário logado pode sugerir (insert com status pending e submitted_by = ele).
create policy "venues_select" on public.venues for select to authenticated
  using (status = 'verified' or submitted_by = auth.uid() or public.is_admin());
create policy "venues_insert_pending" on public.venues for insert to authenticated
  with check ((status = 'pending' and submitted_by = auth.uid()) or public.is_admin());
create policy "venues_update_own_pending" on public.venues for update to authenticated
  using ((submitted_by = auth.uid() and status = 'pending') or public.is_admin())
  with check ((submitted_by = auth.uid() and status = 'pending') or public.is_admin());
create policy "venues_delete_admin" on public.venues for delete to authenticated using (public.is_admin());

create policy "producers_select" on public.producers for select to authenticated
  using (status = 'verified' or submitted_by = auth.uid() or public.is_admin());
create policy "producers_insert_pending" on public.producers for insert to authenticated
  with check ((status = 'pending' and submitted_by = auth.uid()) or public.is_admin());
create policy "producers_update" on public.producers for update to authenticated
  using ((submitted_by = auth.uid() and status = 'pending') or public.is_admin())
  with check ((submitted_by = auth.uid() and status = 'pending') or public.is_admin());
create policy "producers_delete_admin" on public.producers for delete to authenticated using (public.is_admin());

create policy "producer_cities_select" on public.producer_cities for select to authenticated using (true);
create policy "producer_cities_write" on public.producer_cities for all to authenticated
  using (public.is_admin() or exists (select 1 from public.producers p where p.id = producer_id and p.submitted_by = auth.uid()))
  with check (public.is_admin() or exists (select 1 from public.producers p where p.id = producer_id and p.submitted_by = auth.uid()));

create policy "producer_venues_select" on public.producer_venues for select to authenticated using (true);
create policy "producer_venues_write" on public.producer_venues for all to authenticated
  using (public.is_admin() or exists (select 1 from public.producers p where p.id = producer_id and p.submitted_by = auth.uid()))
  with check (public.is_admin() or exists (select 1 from public.producers p where p.id = producer_id and p.submitted_by = auth.uid()));

create policy "bands_select" on public.bands for select to authenticated
  using (status = 'verified' or submitted_by = auth.uid() or owner_id = auth.uid() or public.is_admin());
create policy "bands_insert_pending" on public.bands for insert to authenticated
  with check ((status = 'pending' and submitted_by = auth.uid()) or public.is_admin());
create policy "bands_update" on public.bands for update to authenticated
  using (owner_id = auth.uid() or (submitted_by = auth.uid() and status = 'pending') or public.is_admin())
  with check (owner_id = auth.uid() or (submitted_by = auth.uid() and status = 'pending') or public.is_admin());
create policy "bands_delete_admin" on public.bands for delete to authenticated using (public.is_admin());

-- tours
create policy "tours_select" on public.tours for select to authenticated using (public.can_view_tour(id));
create policy "tours_insert" on public.tours for insert to authenticated with check (owner_id = auth.uid());
create policy "tours_update" on public.tours for update to authenticated
  using (public.can_edit_tour(id)) with check (public.can_edit_tour(id));
create policy "tours_delete" on public.tours for delete to authenticated using (owner_id = auth.uid());

create policy "tour_members_select" on public.tour_members for select to authenticated using (public.can_view_tour(tour_id));
create policy "tour_members_write" on public.tour_members for all to authenticated
  using (exists (select 1 from public.tours t where t.id = tour_id and t.owner_id = auth.uid()))
  with check (exists (select 1 from public.tours t where t.id = tour_id and t.owner_id = auth.uid()));

create policy "tour_dates_select" on public.tour_dates for select to authenticated using (public.can_view_tour(tour_id));
create policy "tour_dates_write" on public.tour_dates for all to authenticated
  using (public.can_edit_tour(tour_id)) with check (public.can_edit_tour(tour_id));

create policy "tour_date_bands_select" on public.tour_date_bands for select to authenticated
  using (exists (select 1 from public.tour_dates d where d.id = tour_date_id and public.can_view_tour(d.tour_id)));
create policy "tour_date_bands_write" on public.tour_date_bands for all to authenticated
  using (exists (select 1 from public.tour_dates d where d.id = tour_date_id and public.can_edit_tour(d.tour_id)))
  with check (exists (select 1 from public.tour_dates d where d.id = tour_date_id and public.can_edit_tour(d.tour_id)));

-- RPC público
grant execute on function public.get_public_tourbook(uuid) to anon, authenticated;
