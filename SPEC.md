# Tour App — especificação técnica do MVP

Documento de produto (decisões do José): https://claude.ai/artifact/HRcy9jRbhqKiTtiSQA9Fvk

## Decisões fechadas

- Região-piloto: SC, PR e SP. Nicho: rock/punk/hardcore independente.
- Usuário do MVP: **bandas**. Produtoras, casas e bandas locais são dados no mapa (cadastro à mão + sugestões de usuários com moderação).
- Layout: **tela dividida** no desktop (lista à esquerda, mapa à direita); no celular, mapa cheio + gaveta inferior.
- Criador de turnê: passo a passo **e** "preencher buracos" entre datas fixas.
- Contatos visíveis para qualquer usuário logado. Mapa com **MapLibre** (estilo OpenFreeMap, sem chave).
- Stack: Vite + React 19 + TypeScript + Tailwind v4 + react-router 8 + TanStack Query + zustand; **Firebase** (Firebase Auth com Google + Cloud Firestore, plano Spark, sem Cloud Functions); Vercel. Celular depois com **Expo** reaproveitando `@tour/core`.
- Backend decidido em 2026-10-23: Firebase (projeto `tourbook-app`). A conta Supabase da Storm/Scumbags NÃO é usada aqui.
- Idioma da interface: **pt-BR**. Código (nomes de variáveis, arquivos, comentários curtos) em inglês.

## Estrutura do repositório

```
tour-app/
  apps/web/            app web (Vite). Só UI e integração; regras de negócio ficam no core.
  packages/core/       @tour/core — tipos, schemas zod, acesso ao Firestore (queries.ts), motor de sugestões,
                       geração de datas, geo, modelo do tourbook, dados de exemplo (src/seed). SEM DOM, SEM React.
  firebase/            firestore.rules (segurança), firestore.indexes.json, testes das regras (emulador), README
  firebase.json        config do Firebase CLI + emuladores (auth 9099, firestore 8080, UI 4000)
  scripts/seed.ts      importa os dados de exemplo com firebase-admin (emulador ou projeto real)
  .github/workflows    CI (install, typecheck, lint, test, build)
```

Comandos na raiz: `pnpm dev`, `pnpm build`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm emulators` (Auth + Firestore locais), `pnpm rules:test` (testes das regras no emulador), `pnpm rules:deploy`, `pnpm seed`.

## Banco de dados — Cloud Firestore (ver `packages/core/src/firestore.ts` e `firebase/firestore.rules`)

Sem Cloud Functions (exigem plano pago): toda a lógica roda no cliente e as **regras de segurança** garantem o acesso. Ids: slugs determinísticos no seed (`joinville-sc`, `porao-77`), ids automáticos do Firestore no que o usuário cria. Datas/horas gravadas como string ISO.

Coleções (documentos em camelCase, mesmos nomes dos tipos de domínio):
- `profiles/{uid}`: `displayName, avatarUrl, role ('user'|'admin'), createdAt, updatedAt`. Criado pelo cliente no 1º login (`ensureProfile`). Regras: leitura para logados; o próprio usuário cria/edita sem mudar `role`; admin edita tudo. **Virar admin**: editar `profiles/{uid}.role = 'admin'` no console do Firebase.
- `cities/{id}`: `name, state, slug, lat, lng, population`. Leitura para logados; escrita só admin.
- `venues/{id}`: `cityId, name, slug, address, lat, lng, capacity, genres[], showDays[] (0=dom…6=sáb), dealTypes[], hasPa, hasBackline, acceptsTouringBands, contactName, contactPhone, contactEmail, instagram, website, notes, status ('verified'|'pending'|'rejected'), submittedBy, createdAt, updatedAt`.
  Regras: lê `verified`, ou o que o próprio usuário enviou, ou admin tudo; cria só com `status='pending'` e `submittedBy=uid`; quem enviou edita enquanto pendente (sem se aprovar); admin modera/apaga.
- `producers/{id}`: como venues + `cityIds[]` (cidades atendidas) e `venueIds[]` (sem tabelas de junção).
- `bands/{id}`: como venues + `links {spotify?, instagram?, youtube?, bandcamp?}`, `opensForTouring`, `ownerId` (banda "reivindicada" pode editar a própria ficha).
- `tours/{id}`: `ownerId, bandId, bandName, name, startCityId, endCityId, maxKmPerDay, allowOffDays, genres[], capacityMin, capacityMax, notes, shareToken|null, memberIds[] (inclui o dono), memberRoles {uid: 'editor'|'viewer'}, dateCount, firstDate, lastDate, createdAt, updatedAt`.
  Regras: lê quem está em `memberIds` (query `array-contains`); cria com `ownerId=uid`, `memberIds=[uid]`, `memberRoles[uid]='editor'`, `shareToken=null`; dono edita tudo, editor edita sem mexer em dono/membros; só o dono apaga. Resumo `dateCount/firstDate/lastDate` recalculado pelo cliente após cada mutação em datas (`recomputeTourSummary`).
- `tours/{id}/dates/{dateId}`: `date (YYYY-MM-DD), cityId, venueId, producerId, status, isFixed, loadInTime, soundcheckTime, doorsTime, setTime, dealType, feeCents, costCents, lodging, checklist [{label, done}], notes, bands [{bandId, role}], createdAt, updatedAt`. Regras via `get()` da turnê pai (membro lê, editor escreve).
- `publicTourbooks/{token}`: `{ tourId, payload: PublicTourbookPayload, updatedAt }` — cópia desnormalizada e sanitizada (sem dono, sem dinheiro, sem `submittedBy`) regravada pelo cliente (`syncPublicTourbook`) ao ativar o link e após cada mutação. Leitura pública (página `/t/:token` sem login); escrita só por editor da turnê e só enquanto `token == tour.shareToken`. Ao desativar o link, apaga-se o documento público antes de zerar o token.
- `tour_dates.status`: `ideia | contato_feito | negociando | confirmado | realizado | cancelado`.
- Apagar turnê: o cliente apaga tourbook público → datas (em lotes) → turnê (o Firestore não faz cascata).

Emulador local: `pnpm emulators` + `VITE_FIREBASE_USE_EMULATOR=1` no `.env`. Testes das regras em `firebase/firestore.rules.test.ts` (`@firebase/rules-unit-testing`, `pnpm rules:test`).

## Pacote `@tour/core` — API pública (todas exportadas de `src/index.ts`)

### `constants.ts`
- `GENRES: readonly string[]` (ex.: `rock`, `punk`, `hardcore`, `metal`, `indie`, `emo`, `post-punk`, `ska`, `stoner`, `grunge`, `alternativo`, `crossover`, `metalcore`, `garage`, `psicodélico`) com `GENRE_LABELS`.
- `TOUR_DATE_STATUSES` + `TOUR_DATE_STATUS_LABELS` (pt-BR) + `TOUR_DATE_STATUS_COLORS` (classes Tailwind).
- `DEAL_TYPES` (`cache_fixo`, `bilheteria`, `porta`, `misto`) + labels.
- `WEEKDAYS_PT` (0 = domingo … 6 = sábado), `WEEKDAY_SHORT_PT`.
- `PILOT_STATES = ['SC','PR','SP']`.
- `DEFAULT_MAX_KM_PER_DAY = 400`, `ROAD_FACTOR = 1.3`, `AVG_SPEED_KMH = 70`.

### `types.ts` / `firestore.ts` / `mappers.ts`
`types.ts`: tipos de domínio (camelCase): `City`, `Venue`, `Producer`, `Band`, `Tour` (com `memberIds`, `memberRoles`), `TourSummary` (+ `dateCount/firstDate/lastDate`), `TourDate`, `TourMember`, `TourWithDates`, `TourDateStatus`, `DealType`, `EntityStatus`, `LatLng { lat, lng }`, `Bounds { minLat, minLng, maxLat, maxLng }`, `RegionData { cities, venues, producers, bands }`, `MapFilters`.
`firestore.ts`: `Client = { db: Firestore; auth: Auth }`, `COLLECTIONS`, tipos dos documentos (`VenueDoc`, `TourDoc`, `TourDateDoc`, `PublicTourbookDoc`…).
`mappers.ts`: `docToVenue(id, data)`, `docToTour`, `docToTourDate(tourId, id, data)`, etc. (tolerantes a campos ausentes), `parseChecklist`, `slugify`, `nowIso`.

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
Funções de acesso ao Firestore; todas recebem `client: Client` (`{ db, auth }`, em `apps/web/src/lib/firebase.ts`) e lançam `DataError` (mensagem pt-BR, `code` do Firestore):
- Perfil: `fetchMyProfile(client, uid)`, `ensureProfile(client, { uid, displayName, photoURL })`, `updateMyProfile(client, uid, { displayName })`.
- Região: `fetchRegionData(client)` (cidades + casas/produtoras/bandas `verified`, ordenadas por nome), `fetchCities(client)`, `searchCities(client, term, limit?)`.
- Casas: `submitVenue(client, uid, values)`, `fetchMySubmissions(client, uid)`, `fetchPendingVenues(client)`, `moderateVenue(client, venueId, 'verified'|'rejected')`.
- Turnês: `fetchMyTours(client): TourSummary[]`, `fetchTour(client, tourId): TourWithDates | null`, `createTour(client, ownerId, { tour, dates })`, `updateTour(client, tourId, patch)`, `deleteTour(client, tourId)`.
- Datas (subcoleção, por isso levam `tourId`): `addTourDate(client, tourId, { date, ... })`, `updateTourDate(client, tourId, dateId, patch)` (patch aceita `checklist` e `bands`), `deleteTourDate(client, tourId, dateId)`, `setTourDateBands(client, tourId, dateId, bandIds)`, `recomputeTourSummary(client, tourId)`. Toda mutação em datas já recalcula o resumo e sincroniza o tourbook público.
- Link público: `enableShareLink(client, tourId): token`, `disableShareLink(client, tourId)`, `syncPublicTourbook(client, tourId)`, `fetchPublicTourbook(client, token): PublicTourbookPayload | null` com `PublicTourbookPayload = { tour: Tour; dates: TourDate[]; lookups: { cities; venues; bands; producers }; generatedAt }` — passa direto para `buildTourbook({ ...payload, hideMoney: true })`.
- Admin: `importSeedData(client, seed: SeedData, onProgress?)` (lotes de 400, ids determinísticos), `fetchCollectionCounts(client)`. Dados de exemplo tipados em `@tour/core/seed` (`SEED_DATA`).
- `randomUuid()`.

## App web (`apps/web/src`)

```
main.tsx                 providers (QueryClient, Router, Auth)
app/router.tsx           rotas (lazy em app/pages.tsx)
app/AppShell.tsx         topo no desktop / barra inferior no celular: Mapa · Turnês · Perfil (+ Moderação para admin)
lib/firebase.ts          initializeApp + auth + db + googleProvider + `client: Client` (conecta no emulador se VITE_FIREBASE_USE_EMULATOR=1)
lib/env.ts               VITE_FIREBASE_* e VITE_MAP_STYLE_URL
auth/                    AuthProvider (useAuth: user {id,email,displayName,avatarUrl} | null | undefined, profile, isAdmin, loading, signInWithGoogle, signOut), RequireAuth/RequireAdmin, LoginPage (Google via popup; redirect quando bloqueado)
components/ui/           Button, Input, Select, Textarea, Checkbox, Field, Chip, Badge, Card, SectionTitle, Dialog, Spinner, EmptyState, ErrorState, Tabs
hooks/useRegionData.ts   cidades + casas + produtoras + bandas (cache 5 min) + useRegionIndex (Maps por id)
features/map/            MapPage (tela dividida), MapView (maplibre), CitySearch, FiltersBar, ExplorePanel,
                         VenueCard/ProducerCard/BandCard, VenueDetail/ProducerDetail/BandDetail, AddToTourDialog, mapStore (zustand)
features/tours/          ToursListPage, NewTourPage (assistente em wizard/), TourPage + tour/ (DateCard, DateEditorDialog, FillGapsPanel, ShareDialog, FinanceSummary…)
features/tourbook/       TourbookPage (PDFViewer + download), TourbookDocument (@react-pdf), TourbookHtml, PublicTourbookPage (/t/:token)
features/venues/         SubmitVenuePage (+ VenueForm, LocationPicker, MySubmissions), ModerationPage (admin)
features/profile/        ProfilePage
features/admin/          ImportSeedPage (/admin/importar: importa SEED_DATA com importSeedData; mostra contagens)
```

Rotas:
- `/login`
- `/` MapPage · `/casas/:id` · `/produtoras/:id` · `/bandas/:id` (detalhe dentro da tela dividida)
- `/turnes` · `/turnes/nova` · `/turnes/:id` · `/turnes/:id/tourbook`
- `/casas/sugerir` · `/admin/moderacao` · `/admin/importar`
- `/perfil`
- `/t/:token` tourbook público (sem login)

Convenções de UI:
- Tailwind v4 com tokens em `index.css` (`--color-brand-*`). Visual escuro-neutro, "cara de app", sem gradientes.
- Mobile-first; breakpoint `md` = tela dividida.
- Textos em pt-BR; datas com `formatDatePt`; dinheiro com `formatCurrencyBRL`.
- Estados: carregando (Spinner), vazio (EmptyState com ação), erro (mensagem + tentar de novo).
- Nada de `any`. Acesso a dados só via `@tour/core` (queries) + TanStack Query com `queryKeys` de `app/queryClient.ts`. Mutations invalidam as queries.
- Contatos: botões WhatsApp (`whatsappUrl`), e-mail (`mailto:`), Instagram.
- Permissão de edição na turnê: `user.id === tour.ownerId || tour.memberRoles[user.id] === 'editor'`.

## Variáveis de ambiente (`apps/web/.env.example`)
```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=<projeto>.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=<projeto>
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_STORAGE_BUCKET=        (opcional)
VITE_FIREBASE_MESSAGING_SENDER_ID=   (opcional)
VITE_FIREBASE_USE_EMULATOR=          (1 para usar o emulador local)
VITE_MAP_STYLE_URL=https://tiles.openfreemap.org/styles/liberty
```
A config web do Firebase é pública por natureza (a segurança vem das regras); ainda assim, o `.env` não vai para o git. Na Vercel, defina as mesmas variáveis e adicione o domínio da Vercel em Authentication → Settings → Authorized domains no console do Firebase.

## Fora do MVP
Pagamentos, contratos, chat, ingressos, app nas lojas, IA, API de rotas (usa estimativa haversine × 1,3), convite de membros para a turnê (o modelo `memberIds/memberRoles` já existe; sem Cloud Functions não há como achar um usuário pelo e-mail, então fica para depois).
