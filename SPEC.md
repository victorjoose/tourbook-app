# Tour App — especificação técnica do MVP

Documento de produto (decisões do José): https://claude.ai/artifact/HRcy9jRbhqKiTtiSQA9Fvk

## Decisões fechadas

- Região-piloto: SC, PR e SP. Nicho: rock/punk/hardcore independente.
- Usuário do MVP: **bandas**. Produtoras, casas e bandas locais são dados no mapa (cadastro à mão + sugestões de usuários com moderação).
- Layout: **tela dividida** no desktop (lista à esquerda, mapa à direita); no celular, mapa cheio + gaveta inferior.
- Criador de turnê: passo a passo **e** "preencher buracos" entre datas fixas.
- Contatos visíveis para qualquer usuário logado. Mapa com **MapLibre** (estilo OpenFreeMap, sem chave).
- Stack: Vite + React 19 + TypeScript + Tailwind v4 + react-router 8 + TanStack Query + zustand; Supabase (Auth Google, Postgres + PostGIS, Storage); Vercel. Celular depois com **Expo** reaproveitando `@tour/core`.
- Idioma da interface: **pt-BR**. Código (nomes de variáveis, arquivos, comentários curtos) em inglês.

## Estrutura do repositório

```
tour-app/
  apps/web/            app web (Vite). Só UI e integração; regras de negócio ficam no core.
  packages/core/       @tour/core — tipos, schemas zod, consultas Supabase, motor de sugestões,
                       geração de datas, geo, modelo do tourbook. SEM DOM, SEM React.
  supabase/migrations  SQL versionado (schema, RLS, funções)
  supabase/seed.sql    dados de exemplo (cidades reais, casas/produtoras/bandas FICTÍCIAS)
  .github/workflows    CI (install, typecheck, lint, test, build)
```

Comandos na raiz: `pnpm dev`, `pnpm build`, `pnpm typecheck`, `pnpm lint`, `pnpm test`.

## Banco de dados (ver `supabase/migrations/0001_init.sql`)

Tabelas: `profiles`, `cities`, `venues`, `producers`, `producer_cities`, `producer_venues`, `bands`,
`tours`, `tour_dates`, `tour_date_bands`, `tour_members`.

- `lat`/`lng` são colunas simples (double) e `location` é gerada (PostGIS) para consultas por distância.
- `status` das entidades do mapa: `verified | pending | rejected`. Usuário comum vê `verified` + o que ele mesmo enviou; `profiles.role = 'admin'` vê e modera tudo.
- `tour_dates.status`: `ideia | contato_feito | negociando | confirmado | realizado | cancelado`.
- Turnê é do `owner_id`; `tour_members` dá acesso (`editor | viewer`). `tours.share_token` habilita o tourbook público via RPC `get_public_tourbook(token)`.
- Trigger cria `profiles` ao criar usuário no Auth.

## Pacote `@tour/core` — API pública (todas exportadas de `src/index.ts`)

### `constants.ts`
- `GENRES: readonly string[]` (ex.: `rock`, `punk`, `hardcore`, `metal`, `indie`, `emo`, `post-punk`, `ska`, `stoner`, `grunge`, `alternativo`, `crossover`, `metalcore`, `garage`, `psicodélico`) com `GENRE_LABELS`.
- `TOUR_DATE_STATUSES` + `TOUR_DATE_STATUS_LABELS` (pt-BR) + `TOUR_DATE_STATUS_COLORS` (classes Tailwind).
- `DEAL_TYPES` (`cache_fixo`, `bilheteria`, `porta`, `misto`) + labels.
- `WEEKDAYS_PT` (0 = domingo … 6 = sábado), `WEEKDAY_SHORT_PT`.
- `PILOT_STATES = ['SC','PR','SP']`.
- `DEFAULT_MAX_KM_PER_DAY = 400`, `ROAD_FACTOR = 1.3`, `AVG_SPEED_KMH = 70`.

### `types.ts`
Tipos de domínio (camelCase) + `Row` types do banco (snake_case) em `database.types.ts`.
`City`, `Venue`, `Producer`, `Band`, `Tour`, `TourDate`, `TourDateStatus`, `DealType`, `EntityStatus`,
`LatLng { lat, lng }`, `Bounds { minLat, minLng, maxLat, maxLng }`, `RegionData { cities, venues, producers, bands }`.
Mapeadores `rowToVenue(row)`, etc., ficam em `mappers.ts`.

### `geo.ts`
- `haversineKm(a: LatLng, b: LatLng): number`
- `roadKmEstimate(a, b): number` (= haversine × `ROAD_FACTOR`, arredondado)
- `driveHoursEstimate(km: number): number`
- `formatKm(km)`, `formatHours(h)` (pt-BR: "130 km", "1h50")
- `inBounds(p: LatLng, b: Bounds): boolean`
- `boundsAround(center: LatLng, radiusKm): Bounds`
- `routeTotals(points: LatLng[]): { km: number; hours: number }`

### `dates.ts`
- `generateSlots(opts: { startDate: string /*YYYY-MM-DD*/; weekdays: number[]; weeks: number }): string[]` — datas (ISO) nos dias da semana escolhidos, por N semanas, ordenadas.
- `generateSlotsByCount(opts: { startDate; weekdays; count })`.
- `weekdayOf(iso: string): number`, `formatDatePt(iso, style?: 'short'|'long')`, `addDaysIso(iso, n)`, `diffDays(a, b)`.
- Nunca usar `new Date(iso)` sem hora (fuso): use `parseISO` do date-fns.

### `suggest.ts` — motor de sugestões (regras + pontuação)
```ts
type SuggestConstraints = {
  maxKmPerDay: number;            // corta candidatas acima disso (a partir da cidade anterior)
  genres: string[];               // gêneros da banda
  capacityMin?: number; capacityMax?: number;
  states?: string[];              // limitar a estados
  excludeCityIds?: string[];      // cidades já usadas na turnê
}
type CitySuggestion = {
  city: City; score: number; kmFromPrev: number; hoursFromPrev: number;
  kmToNext?: number;              // quando há próxima data fixa / cidade final
  venues: Venue[]; producers: Producer[]; bands: Band[];   // já filtrados por gênero/dia
  reasons: string[];              // pt-BR, ex.: "A 130 km de Joinville", "3 casas com show na sexta"
}
suggestNextCities(input: {
  prevCity: City | null;          // null = primeira data (sugere a partir do startCity)
  nextFixed?: { city: City; date: string } | null;   // próxima data fixa ou cidade final
  date: string;                   // ISO da vaga a preencher
  constraints: SuggestConstraints;
  data: RegionData;
  limit?: number;                 // default 5
}): CitySuggestion[]
```
Pontuação (ver doc de produto): distância (alto; corta acima de `maxKmPerDay` e acima do que cabe até `nextFixed`),
casa aberta no dia da semana (alto), gênero/capacidade (médio), produtora/banda local (médio),
"vai na direção" de `nextFixed` (médio: km até next menor que o km atual até next), penaliza cidade já usada.
`reasons` sempre explica os pontos principais. Determinístico e puro (sem IO).

- `fillGaps(input: { slots: Array<{ date: string; cityId?: string | null; fixed: boolean }>; constraints; data; startCity: City; endCity?: City | null }): Map<string /*date*/, CitySuggestion[]>` — para cada vaga sem cidade, usa a cidade anterior preenchida e a próxima fixa.
- `routeAlerts(dates: Array<{ date: string; city: City | null }>, maxKmPerDay): Array<{ date: string; message: string; level: 'warn'|'error' }>` — ex.: trecho acima do limite, dois shows no mesmo dia, lacuna > 3 dias.

### `tourbook.ts`
- `buildTourbook(input: { tour: Tour; dates: TourDate[]; lookups: { cities: City[]; venues: Venue[]; bands: Band[]; producers: Producer[] } }): Tourbook`
- `Tourbook = { title; bandName; period: { start; end }; summary: TourbookSummaryRow[]; days: TourbookDay[]; contacts: TourbookContact[]; totals: { km; hours; dates; confirmed; feeCents } }`
- `TourbookDay` tem tudo para uma página: data formatada, cidade/UF, casa + endereço, `mapsUrl` (Google Maps), contatos (nome, telefone, WhatsApp link, e-mail, Instagram), horários, acordo/cachê, hospedagem, bandas da noite, notas, `nextLeg: { km; hours; toCity } | null`.
- `formatCurrencyBRL(cents)`, `whatsappUrl(phone)`.

### `schemas.ts` (zod)
`tourFormSchema`, `tourDateFormSchema`, `venueSubmissionSchema`, `bandSchema`, `producerSchema`. Mensagens em pt-BR.

### `queries.ts`
Funções puras de acesso que recebem `SupabaseClient<Database>`:
`fetchRegionData(sb)`, `fetchCities(sb)`, `searchCities(sb, term)`, `fetchMyTours(sb)`, `fetchTour(sb, id)`,
`createTour(sb, input)`, `updateTour`, `upsertTourDate`, `deleteTourDate`, `setTourDateBands`,
`submitVenue`, `fetchPendingSubmissions`, `moderateVenue`, `enableShareLink`, `fetchPublicTourbook(sb, token)`.

## App web (`apps/web/src`)

```
main.tsx                 providers (QueryClient, Router, Auth)
app/router.tsx           rotas (lazy)
app/AppShell.tsx         topo no desktop / barra inferior no celular: Mapa · Turnês · Perfil
lib/supabase.ts          client (VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY)
lib/env.ts
auth/                    AuthProvider, useAuth, RequireAuth, LoginPage (Google)
components/ui/           Button, Input, Select, Textarea, Chip, Card, Dialog, Spinner, EmptyState, Tabs
hooks/useRegionData.ts   cidades + casas + produtoras + bandas (cache 5 min)
features/map/            MapPage (tela dividida), MapView (maplibre), CitySearch, Filters, ExplorePanel,
                         VenueCard/ProducerCard/BandCard, VenueDetail/ProducerDetail/BandDetail, mapStore (zustand)
features/tours/          ToursListPage, NewTourPage (assistente), TourPage, FillGapsPanel, tourWizardStore
features/tourbook/       TourbookPage (PDFViewer + download), TourbookDocument (@react-pdf), PublicTourbookPage (/t/:token)
features/venues/         SubmitVenuePage, ModerationPage (admin)
features/profile/        ProfilePage
```

Rotas:
- `/login`
- `/` MapPage · `/casas/:id` · `/produtoras/:id` · `/bandas/:id` (detalhe dentro da tela dividida)
- `/turnes` · `/turnes/nova` · `/turnes/:id` · `/turnes/:id/tourbook`
- `/casas/sugerir` · `/admin/moderacao`
- `/perfil`
- `/t/:token` tourbook público (sem login)

Convenções de UI:
- Tailwind v4 com tokens em `index.css` (`--color-brand-*`). Visual escuro-neutro, "cara de app", sem gradientes.
- Mobile-first; breakpoint `md` = tela dividida.
- Textos em pt-BR; datas com `formatDatePt`; dinheiro com `formatCurrencyBRL`.
- Estados: carregando (Spinner), vazio (EmptyState com ação), erro (mensagem + tentar de novo).
- Nada de `any`. Acesso a dados só via `@tour/core/queries` + TanStack Query. Mutations invalidam as queries.
- Contatos: botões WhatsApp (`whatsappUrl`), e-mail (`mailto:`), Instagram.

## Variáveis de ambiente (`apps/web/.env.example`)
```
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_MAP_STYLE_URL=https://tiles.openfreemap.org/styles/liberty
```

## Fora do MVP
Pagamentos, contratos, chat, ingressos, app nas lojas, IA, API de rotas (usa estimativa haversine × 1,3).
