# Tour App

O Tour App é um app web que ajuda bandas independentes de rock, punk e hardcore a planejar turnês em cima de um mapa: casas de show, produtoras e bandas locais de **Santa Catarina, Paraná e São Paulo** aparecem como pontos no mapa, e um assistente monta a rota da turnê sugerindo cidades por distância, dia da semana, gênero e capacidade, preenchendo os "buracos" entre datas já fixadas. No fim, a banda gera um **tourbook** (PDF e link público) com endereços, contatos, horários e acordos de cada data. A especificação técnica completa do MVP (decisões de produto, banco de dados, API do pacote `@tour/core`, rotas e convenções) está em [SPEC.md](./SPEC.md).

Repositório: <https://github.com/victorjoose/tourbook-app>

## Stack

| Camada | Tecnologias |
| --- | --- |
| Front-end | Vite 8 · React 19 · TypeScript (strict) · Tailwind CSS v4 · react-router 8 · TanStack Query v5 · zustand v5 · zod 4 |
| Mapa | MapLibre GL com estilo do [OpenFreeMap](https://openfreemap.org) (gratuito, sem chave de API) |
| Tourbook | `@react-pdf/renderer` + `qrcode` |
| Back-end | Supabase: Auth (Google), Postgres + PostGIS, RLS e RPC (`get_public_tourbook`) |
| Deploy | Vercel (SPA) |
| Ferramentas | pnpm workspaces · oxlint · vitest · GitHub Actions |

## Estrutura do repositório

```
tourbook-app/
  apps/web/              app web (Vite). Só UI e integração; regras de negócio ficam no core.
    src/app/             providers, router, AppShell
    src/auth/            AuthProvider, RequireAuth, LoginPage (Google)
    src/components/ui/   componentes compartilhados (Button, Input, Card, Dialog, Tabs…)
    src/features/        map, tours, tourbook, venues, profile
    src/hooks/           useRegionData (cidades + casas + produtoras + bandas)
    src/lib/             supabase client, env
    vercel.json          rewrite de todas as rotas para index.html (SPA)
  packages/core/         @tour/core — tipos, schemas zod, consultas Supabase, motor de sugestões,
                         geração de datas, geo e modelo do tourbook. Sem DOM, sem React.
  supabase/migrations/   SQL versionado (schema, RLS, funções)
  supabase/seed.sql      dados de exemplo (cidades reais; casas, produtoras e bandas fictícias)
  .github/workflows/     CI (install, typecheck, lint, test, build)
  SPEC.md                especificação técnica do MVP
```

## Pré-requisitos

- **Node 22** ou superior (`"engines": { "node": ">=22" }`).
- **pnpm 10** via [corepack](https://nodejs.org/api/corepack.html). O campo `packageManager` do `package.json` fixa a versão exata (`pnpm@10.28.0`):

  ```sh
  corepack enable
  pnpm --version   # deve mostrar 10.28.0
  ```

- Uma conta no [Supabase](https://supabase.com) e um projeto no [Google Cloud Console](https://console.cloud.google.com) (para o login com Google).

## Configuração

### 1. Crie o projeto no Supabase

Crie um projeto novo em <https://supabase.com/dashboard> (região **South America (São Paulo)** deixa a latência menor para o público-alvo). Anote:

- **Project URL** — `https://<project-ref>.supabase.co`
- **Publishable key** — em *Project Settings → API Keys* (começa com `sb_publishable_...`)

### 2. Aplique o schema e os dados de exemplo

No painel do Supabase, abra **SQL Editor** e execute, nesta ordem:

1. `supabase/migrations/0001_init.sql` — extensões (PostGIS), tipos, tabelas, funções, triggers, RLS e o RPC `get_public_tourbook`.
2. `supabase/seed.sql` — cidades reais de SC/PR/SP e casas, produtoras e bandas **fictícias** para testar o mapa.

Alternativa com a [Supabase CLI](https://supabase.com/docs/guides/local-development):

```sh
supabase init                               # uma vez; cria supabase/config.toml
supabase link --project-ref <project-ref>
supabase db push                            # aplica supabase/migrations/*.sql
psql "<connection string do projeto>" -f supabase/seed.sql
```

### 3. Habilite o login com Google

**No Google Cloud Console**

1. Crie (ou escolha) um projeto e configure a **OAuth consent screen** (tipo *External*; enquanto o app estiver em *Testing*, adicione os e-mails que vão poder entrar em *Test users*).
2. Em **APIs & Services → Credentials → Create credentials → OAuth client ID**, escolha o tipo **Web application**.
3. Em **Authorized redirect URIs**, adicione:

   ```
   https://<project-ref>.supabase.co/auth/v1/callback
   ```

4. Copie o **Client ID** e o **Client secret**.

**No Supabase**

1. Em **Authentication → Providers → Google**, ative o provedor e cole o Client ID e o Client secret.
2. Em **Authentication → URL Configuration**:
   - **Site URL**: a URL de produção (ex.: `https://tourbook-app.vercel.app`).
   - **Redirect URLs**: adicione a URL local e as URLs da Vercel (produção e previews). O app manda o usuário de volta para a página que ele tentou abrir (`redirectTo` = origem + caminho), então use o sufixo `/**` para liberar qualquer caminho:

     ```
     http://localhost:5173/**
     https://tourbook-app.vercel.app/**
     https://tourbook-app-*.vercel.app/**
     ```

     Ajuste os nomes para o domínio real do seu projeto na Vercel.

### 4. Variáveis de ambiente

```sh
cp apps/web/.env.example apps/web/.env
```

Preencha `apps/web/.env`:

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | sim | Project URL do Supabase (`https://<project-ref>.supabase.co`) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | sim | Publishable key (`sb_publishable_...`). Também é aceita a chave legada em `VITE_SUPABASE_ANON_KEY`. |
| `VITE_MAP_STYLE_URL` | não | Estilo do MapLibre. Padrão: `https://tiles.openfreemap.org/styles/liberty` |

O arquivo `.env` está no `.gitignore`; nunca faça commit dele.

### 5. Instale e rode

```sh
pnpm install
pnpm dev
```

O app abre em <http://localhost:5173>. Entre com o Google; o trigger `on_auth_user_created` cria a linha em `public.profiles` automaticamente.

## Scripts

Todos rodam a partir da raiz do repositório.

| Comando | O que faz |
| --- | --- |
| `pnpm dev` | Sobe o Vite em `apps/web` (porta 5173) |
| `pnpm build` | `pnpm -r build` — gera `apps/web/dist` (`tsc -b && vite build`); o core não tem build (é consumido como TypeScript) |
| `pnpm typecheck` | `pnpm -r typecheck` — `tsc` em `packages/core` e `apps/web` |
| `pnpm lint` | `pnpm -r lint` — oxlint em `packages/core` e `apps/web` |
| `pnpm test` | `pnpm -r test` — vitest em `packages/core` (motor de sugestões, datas, geo, tourbook) e `apps/web` |

Para um pacote só: `pnpm --filter web <script>` ou `pnpm --filter @tour/core <script>`. O app também tem `pnpm --filter web preview` para servir o build local.

## Deploy na Vercel

1. Em <https://vercel.com/new>, importe o repositório do GitHub.
2. Em **Root Directory**, selecione `apps/web`. Em **Framework Preset**, escolha **Vite**.
3. A Vercel detecta o workspace do pnpm pelo `pnpm-lock.yaml` e pelo campo `packageManager` da raiz: o `pnpm install` roda na raiz do repositório, então o pacote `@tour/core` (`workspace:*`) fica disponível no build. Se o build reclamar que não encontra `@tour/core`, confira em *Settings → General* que a opção **Include source files outside of the Root Directory** está ligada.
4. Em **Environment Variables**, cadastre `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` e, se quiser outro estilo de mapa, `VITE_MAP_STYLE_URL`, para *Production* e *Preview*.
5. Em *Settings → General → Node.js Version*, use **22.x**.
6. Faça o deploy. Depois, volte ao Supabase e adicione a URL de produção e o padrão das URLs de preview em **Authentication → URL Configuration** (passo 3 acima).

O arquivo `apps/web/vercel.json` reescreve todas as rotas para `index.html`, para que links diretos como `/turnes/123` ou `/t/<token>` funcionem com o roteamento do lado do cliente (react-router).

## Como virar admin

Perfis nascem com `role = 'user'`. Admins veem e moderam casas, produtoras e bandas pendentes em `/admin/moderacao`. A política de RLS impede o próprio usuário de alterar a sua `role` pela API, então promova pelo **SQL Editor** (que roda como `postgres` e ignora a RLS). O usuário precisa ter entrado no app ao menos uma vez para existir em `auth.users`:

```sql
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'voce@exemplo.com');
```

O perfil fica em cache no app por 5 minutos; saia e entre de novo (ou recarregue depois desse tempo) para o menu de moderação aparecer.

## CI

O workflow em `.github/workflows/ci.yml` roda em todo `push` e `pull_request`, em `ubuntu-latest`, com Node 22 e a versão do pnpm lida do `packageManager`:

1. `pnpm install --frozen-lockfile`
2. `pnpm -r typecheck`
3. `pnpm -r lint`
4. `pnpm -r test`
5. `pnpm --filter web build` (com `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` de mentira, só para o build passar)

Execuções em andamento para o mesmo branch são canceladas quando chega um push novo.

## Convenções

- Interface em **pt-BR**; identificadores, nomes de arquivo e comentários curtos em **inglês**.
- TypeScript strict, sem `any` e sem non-null assertion em dados vindos do servidor.
- Acesso a dados **só** pelas funções de `@tour/core` (`packages/core/src/queries.ts`) com TanStack Query; mutations invalidam as queries.
- Datas são strings ISO `YYYY-MM-DD` manipuladas com os helpers de `packages/core/src/dates.ts` (nunca `new Date('YYYY-MM-DD')`); dinheiro é guardado em centavos e exibido com `formatCurrencyBRL`.
- Tailwind v4 com os tokens de `apps/web/src/index.css`; visual escuro e neutro, mobile-first (`md` = tela dividida).

## Roadmap

- **App para celular com Expo**, reaproveitando `@tour/core` (o pacote não depende de DOM nem de React, justamente para isso).
- Fora do MVP, conforme o [SPEC.md](./SPEC.md): pagamentos, contratos, chat, ingressos, publicação nas lojas, IA e API de rotas (hoje a distância é estimada por haversine × 1,3).
