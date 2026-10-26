# Tour App

O Tour App é um app web que ajuda bandas independentes de rock, punk e hardcore a planejar turnês em cima de um mapa: casas de show, produtoras e bandas locais de **Santa Catarina, Paraná e São Paulo** aparecem como pontos no mapa, e um assistente monta a rota da turnê sugerindo cidades por distância, dia da semana, gênero e capacidade, preenchendo os "buracos" entre datas já fixadas. No fim, a banda gera um **tourbook** (PDF e link público) com endereços, contatos, horários e acordos de cada data. A especificação técnica completa do MVP (decisões de produto, modelo do Firestore e regras de segurança, API do pacote `@tour/core`, rotas e convenções) está em [SPEC.md](./SPEC.md).

Repositório: <https://github.com/victorjoose/tourbook-app>

## Stack

| Camada | Tecnologias |
| --- | --- |
| Front-end | Vite 8 · React 19 · TypeScript (strict) · Tailwind CSS v4 · react-router 8 · TanStack Query v5 · zustand v5 · zod 4 |
| Domínio | `@tour/core` (`packages/core`): tipos, schemas zod, acesso ao Firestore, motor de sugestões, datas, geo e modelo do tourbook. Sem DOM, sem React |
| Back-end | Firebase no plano **Spark** (gratuito): **Firebase Auth** (login com Google) + **Cloud Firestore**, protegidos pelas regras de segurança em `firebase/firestore.rules`. **Sem Cloud Functions**: toda a lógica roda no cliente |
| Mapa | MapLibre GL com estilo do [OpenFreeMap](https://openfreemap.org) (gratuito, sem chave de API) |
| Tourbook | `@react-pdf/renderer` + `qrcode` |
| Deploy | Vercel (SPA) |
| Ferramentas | pnpm workspaces · oxlint · vitest · GitHub Actions · Firebase CLI (`firebase-tools`, emuladores) · `firebase-admin` (script de seed) |

## Estrutura do repositório

```
tourbook-app/
  apps/web/                  app web (Vite). Só UI e integração; regras de negócio ficam no core.
    src/app/                 providers, router, AppShell, queryClient (queryKeys)
    src/auth/                AuthProvider (useAuth), RequireAuth/RequireAdmin, LoginPage (Google)
    src/components/ui/       componentes compartilhados (Button, Input, Card, Dialog, Tabs…)
    src/features/            map, tours, tourbook, venues, profile, admin (/admin/importar)
    src/hooks/               useRegionData (cidades + casas + produtoras + bandas)
    src/lib/                 firebase.ts (app, auth, db, client; liga no emulador) e env.ts (VITE_*)
    .env.example             variáveis de ambiente (copie para .env)
    vercel.json              rewrite de todas as rotas para index.html (SPA)
  packages/core/             @tour/core — tipos, schemas zod, acesso ao Firestore (src/queries.ts),
                             motor de sugestões, geração de datas, geo, modelo do tourbook.
    src/seed/                dados de exemplo (entrada `@tour/core/seed`, fora do bundle principal)
  firebase/
    firestore.rules          regras de segurança do Firestore
    firestore.indexes.json   índices compostos (vazio por enquanto)
    emulator.ts, *.test.ts   testes das regras no emulador (@firebase/rules-unit-testing + vitest)
    README.md                emulador, testes das regras, deploy e como virar admin
  firebase.json              Firebase CLI: caminho das regras/índices e portas dos emuladores
  .firebaserc                projeto padrão do Firebase CLI (`tourbook-app`)
  scripts/seed.ts            importa os dados de exemplo com firebase-admin (emulador ou projeto real)
  scripts/tsconfig.json      typecheck do script (`pnpm typecheck:tools`)
  .github/workflows/ci.yml   CI (install, typecheck, lint, test, build)
  SPEC.md                    especificação técnica do MVP
```

## Pré-requisitos

- **Node 22** ou superior (`"engines": { "node": ">=22" }`).
- **pnpm 10** via [corepack](https://nodejs.org/api/corepack.html). O campo `packageManager` do `package.json` fixa a versão exata (`pnpm@10.28.0`):

  ```sh
  corepack enable
  pnpm --version   # deve mostrar 10.28.0
  ```

- **Java 21** ou superior — **só para o emulador** (`pnpm emulators` e `pnpm rules:test`). Não é preciso para rodar o app contra o projeto real nem para o deploy.
- Uma conta Google para o [console do Firebase](https://console.firebase.google.com). O Firebase CLI (`firebase-tools`) já vem como dependência de desenvolvimento do repositório: use `pnpm exec firebase …` ou `npx firebase …`, sem instalar nada global.

## Configuração

### 1. Crie o projeto no Firebase e copie a config web

1. Em <https://console.firebase.google.com>, crie um projeto (o plano **Spark**, gratuito, é o padrão; o Google Analytics é opcional e pode ficar desligado).
2. Na página inicial do projeto, clique em **Adicionar app → Web (`</>`)**, dê um apelido e registre. O console mostra o objeto `firebaseConfig`. Ele também fica em **Configurações do projeto → Geral → Seus apps**.
3. Copie o exemplo de `.env` e preencha com os valores de `firebaseConfig`:

   ```sh
   cp apps/web/.env.example apps/web/.env
   ```

   | Variável | Obrigatória | Vem de `firebaseConfig` |
   | --- | --- | --- |
   | `VITE_FIREBASE_API_KEY` | sim | `apiKey` |
   | `VITE_FIREBASE_AUTH_DOMAIN` | sim | `authDomain` (`<projeto>.firebaseapp.com`) |
   | `VITE_FIREBASE_PROJECT_ID` | sim | `projectId` |
   | `VITE_FIREBASE_APP_ID` | sim | `appId` |
   | `VITE_FIREBASE_STORAGE_BUCKET` | não | `storageBucket` |
   | `VITE_FIREBASE_MESSAGING_SENDER_ID` | não | `messagingSenderId` |
   | `VITE_FIREBASE_USE_EMULATOR` | não | — (`1` para usar o emulador local; deixe vazio para o projeto real) |
   | `VITE_MAP_STYLE_URL` | não | — (estilo do MapLibre; padrão `https://tiles.openfreemap.org/styles/liberty`) |

   `apps/web/src/lib/env.ts` valida as quatro obrigatórias e falha com uma mensagem clara se faltar alguma. O arquivo `.env` está no `.gitignore`; nunca faça commit dele.

### 2. Habilite o login com Google

1. No console, abra **Authentication → Começar** (se for a primeira vez) → aba **Sign-in method** → **Google** → **Ativar**. Escolha o e-mail de suporte do projeto e salve. Não é preciso criar credenciais OAuth à mão: o Firebase cuida disso.
2. Em **Authentication → Settings → Authorized domains**, `localhost` já vem liberado. Quando publicar na Vercel, adicione aqui o domínio de produção (ex.: `tourbook-app.vercel.app`) e os domínios de preview que você usar (veja [Deploy na Vercel](#deploy-na-vercel)).

O app entra com `signInWithPopup`; se o navegador bloquear o popup, ele cai para `signInWithRedirect` (`apps/web/src/auth/AuthProvider.tsx`).

### 3. Crie o Firestore e publique as regras

1. Em **Firestore Database → Criar banco de dados**, escolha o **modo de produção** (começa com tudo bloqueado) e a localização (`southamerica-east1`, São Paulo, deixa a latência menor; a localização não pode ser trocada depois).
2. Publique as regras de `firebase/firestore.rules`. Duas opções:
   - **Console**: aba **Regras**, apague o conteúdo, cole o arquivo inteiro e clique em **Publicar**.
   - **CLI**: faça login uma vez e rode o script, que publica regras **e** índices (`firebase/firestore.indexes.json`) conforme `firebase.json`:

     ```sh
     npx firebase login
     pnpm rules:deploy
     ```

     O `.firebaserc` aponta para o projeto `tourbook-app`. Se o seu projeto tiver outro id, passe `pnpm rules:deploy --project <id-do-projeto>` ou troque o id no `.firebaserc`.

Sem as regras publicadas, o app não lê nem grava nada (o modo de produção nega tudo). As regras também são o que garante a segurança do app, já que não há servidor: leia os comentários no próprio arquivo e o resumo em [SPEC.md](./SPEC.md#banco-de-dados--cloud-firestore-ver-packagescoresrcfirestorets-e-firebasefirestorerules).

### 4. Instale e rode

```sh
pnpm install
pnpm dev
```

O app abre em <http://localhost:5173>.

### 5. Entre uma vez e vire admin

Entre com o Google. No primeiro login o cliente cria o documento `profiles/<seu uid>` com `role = 'user'` (`ensureProfile`). As regras impedem que o usuário mude a própria `role`, então a promoção é feita no console:

1. Descubra o seu uid em **Authentication → Users** (coluna *UID do usuário*). O documento em `profiles` também mostra o seu `displayName`.
2. Em **Firestore Database → Dados → `profiles` → `<seu uid>`**, edite o campo `role` para `admin`.
3. O perfil fica em cache no app por 5 minutos: saia e entre de novo (ou recarregue depois desse tempo). Os itens **Moderação** e **Importar** aparecem no menu e as rotas `/admin/*` passam a abrir.

### 6. Importe os dados de exemplo

Os dados de exemplo (`@tour/core/seed`: cidades **reais** de SC/PR/SP; casas de show, produtoras e bandas **fictícias**, com contatos obviamente falsos) são gravados com ids determinísticos (slugs como `joinville-sc`), então importar de novo só sobrescreve os mesmos documentos e preserva o que os usuários cadastraram.

- **Pelo app** (precisa ser admin): abra **Importar** no menu (ou <http://localhost:5173/admin/importar>) e clique em importar. A tela grava em lotes de 400 com `importSeedData` e mostra a contagem de cada coleção.
- **Pela linha de comando**, com uma conta de serviço: em **Configurações do projeto → Contas de serviço → Gerar nova chave privada**, baixe o JSON (guarde fora do repositório; ele dá acesso total ao projeto) e rode:

  ```sh
  GOOGLE_APPLICATION_CREDENTIALS=./service-account.json pnpm seed
  # outro projeto que não o do .firebaserc:
  FIREBASE_PROJECT_ID=meu-projeto GOOGLE_APPLICATION_CREDENTIALS=./service-account.json pnpm seed
  ```

  O script (`scripts/seed.ts`) grava exatamente os mesmos documentos que a tela `/admin/importar`.

## Emulador local (opcional)

Para desenvolver sem tocar no projeto real, o Firebase CLI sobe o Auth e o Firestore na sua máquina (precisa de **Java 21+**; na primeira vez ele baixa o emulador):

```sh
pnpm emulators --project demo-tourbook
```

- Portas (em `firebase.json`): Auth `127.0.0.1:9099`, Firestore `127.0.0.1:8080`, interface web em <http://localhost:4000>.
- Sem `--project`, o CLI usa o id do `.firebaserc` (`tourbook-app`). Ids que começam com `demo-` nunca falam com um projeto real e dispensam `firebase login`, por isso a recomendação acima.
- Em `apps/web/.env`, defina `VITE_FIREBASE_USE_EMULATOR=1` e use **o mesmo id** em `VITE_FIREBASE_PROJECT_ID` (o emulador separa os dados por projeto). As outras `VITE_FIREBASE_*` continuam obrigatórias, mas com o emulador podem ser qualquer valor. `apps/web/src/lib/firebase.ts` chama `connectAuthEmulator`/`connectFirestoreEmulator` quando a flag está ligada.
- O login com Google no emulador abre uma tela falsa de escolha de conta: não usa a sua conta Google de verdade.
- Os dados ficam em memória e somem quando o emulador para. Para persistir entre execuções (a pasta `.firebase` está no `.gitignore`):

  ```sh
  pnpm emulators --project demo-tourbook --import=./.firebase/emulator-data --export-on-exit
  ```

- Dados de exemplo no emulador: `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 pnpm seed` (usa o projeto `demo-tourbook`; `GCLOUD_PROJECT=<id>` para outro). Para virar admin no emulador, edite `profiles/<uid>.role` na interface em <http://localhost:4000/firestore>.

### Testes das regras de segurança

```sh
pnpm rules:test
```

Roda `firebase emulators:exec --only firestore --project demo-tourbook "vitest run --root firebase"`: sobe um Firestore descartável, executa os testes em `firebase/` (escritos com `@firebase/rules-unit-testing`; a infraestrutura comum está em `firebase/emulator.ts`) e derruba o emulador. Sem `FIRESTORE_EMULATOR_HOST` as suítes são puladas, então elas **não rodam no CI** (precisariam de Java e do download do emulador): rode localmente sempre que mexer em `firebase/firestore.rules`.

## Scripts

Todos rodam a partir da raiz do repositório.

| Comando | O que faz |
| --- | --- |
| `pnpm dev` | Sobe o Vite em `apps/web` (porta 5173) |
| `pnpm build` | `pnpm -r build` — gera `apps/web/dist` (`tsc -b && vite build`); o core não tem build (é consumido como TypeScript) |
| `pnpm typecheck` | `pnpm -r typecheck` — `tsc` em `packages/core` e `apps/web` |
| `pnpm typecheck:tools` | `tsc` em `firebase/` (testes das regras) e `scripts/` (seed), que não são pacotes do workspace |
| `pnpm lint` | `pnpm -r lint` — oxlint em `packages/core` e `apps/web` |
| `pnpm test` | `pnpm -r test` — vitest em `packages/core` (motor de sugestões, datas, geo, tourbook, seed) e `apps/web` |
| `pnpm emulators` | `firebase emulators:start --only auth,firestore` — Auth + Firestore locais (Java 21+) |
| `pnpm rules:test` | Testes das regras do Firestore num emulador descartável (projeto `demo-tourbook`) |
| `pnpm rules:deploy` | `firebase deploy --only firestore:rules,firestore:indexes` — publica regras e índices (precisa de `npx firebase login`) |
| `pnpm seed` | `tsx scripts/seed.ts` — importa os dados de exemplo no emulador ou no projeto real (ver passo 6) |

Para um pacote só: `pnpm --filter web <script>` ou `pnpm --filter @tour/core <script>`. O app também tem `pnpm --filter web preview` para servir o build local. Argumentos extras passam direto para o comando (ex.: `pnpm emulators --project demo-tourbook`).

## Deploy na Vercel

1. Em <https://vercel.com/new>, importe o repositório do GitHub.
2. Em **Root Directory**, selecione `apps/web`. Em **Framework Preset**, escolha **Vite**.
3. A Vercel detecta o workspace do pnpm pelo `pnpm-lock.yaml` e pelo campo `packageManager` da raiz: o `pnpm install` roda na raiz do repositório, então o pacote `@tour/core` (`workspace:*`) fica disponível no build. Se o build reclamar que não encontra `@tour/core`, confira em *Settings → General* que a opção **Include source files outside of the Root Directory** está ligada.
4. Em **Environment Variables**, cadastre para *Production* e *Preview*: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID` (e, se quiser, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID` e `VITE_MAP_STYLE_URL`). **Não** defina `VITE_FIREBASE_USE_EMULATOR` na Vercel.
5. Em *Settings → General → Node.js Version*, use **22.x**.
6. Faça o deploy. Depois, no console do Firebase, adicione o domínio da Vercel em **Authentication → Settings → Authorized domains** (passo 2 da configuração); sem isso o login com Google falha com `auth/unauthorized-domain`. A lista não aceita curingas: para previews, adicione o domínio fixo do branch (`<projeto>-git-<branch>-<time>.vercel.app`) ou um domínio próprio, em vez da URL aleatória de cada deploy.

O arquivo `apps/web/vercel.json` reescreve todas as rotas para `index.html`, para que links diretos como `/turnes/abc123` ou `/t/<token>` funcionem com o roteamento do lado do cliente (react-router).

### A config do Firebase é pública

As variáveis `VITE_FIREBASE_*` vão para o bundle do navegador, e isso é esperado: a config web do Firebase identifica o projeto, não autentica ninguém. A segurança vem das **regras do Firestore** (`firebase/firestore.rules`), da lista de **domínios autorizados** do Auth e, se quiser, de restrições da chave em *Google Cloud → APIs e serviços → Credenciais* (referenciadores HTTP). Mesmo assim o `.env` não vai para o git, e a chave da **conta de serviço** usada pelo `pnpm seed` é secreta de verdade: nunca a coloque no repositório nem na Vercel.

## CI

O workflow em `.github/workflows/ci.yml` roda em todo `push` e `pull_request`, em `ubuntu-latest`, com Node 22 e a versão do pnpm lida do `packageManager`:

1. `pnpm install --frozen-lockfile`
2. `pnpm -r typecheck` e `pnpm typecheck:tools`
3. `pnpm -r lint`
4. `pnpm -r test`
5. `pnpm --filter web build` (com `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID` e `VITE_FIREBASE_APP_ID` de mentira, só para o build passar)

Execuções em andamento para o mesmo branch são canceladas quando chega um push novo. Os testes das regras (`pnpm rules:test`) ficam fora do CI porque dependem de Java e do download do emulador; rode-os localmente.

## Convenções

- Interface em **pt-BR**; identificadores, nomes de arquivo e comentários curtos em **inglês**.
- TypeScript strict, sem `any` e sem non-null assertion em dados vindos do servidor.
- Acesso a dados **só** pelas funções de `@tour/core` (`packages/core/src/queries.ts`), que recebem o `client` de `apps/web/src/lib/firebase.ts` e lançam `DataError` com mensagem em pt-BR; no app, sempre via TanStack Query com as `queryKeys` de `apps/web/src/app/queryClient.ts`, e mutations invalidam as queries.
- Datas são strings ISO `YYYY-MM-DD` manipuladas com os helpers de `packages/core/src/dates.ts` (nunca `new Date('YYYY-MM-DD')`); dinheiro é guardado em centavos e exibido com `formatCurrencyBRL`.
- Tailwind v4 com os tokens de `apps/web/src/index.css`; visual escuro e neutro, mobile-first (`md` = tela dividida).
- Toda tela trata carregando (Spinner), vazio (EmptyState com ação) e erro (ErrorState com "tentar de novo").

## Roadmap

- **App para celular com Expo**, reaproveitando `@tour/core` (o pacote não depende de DOM nem de React, justamente para isso; o SDK do Firebase roda igual no React Native).
- Fora do MVP, conforme o [SPEC.md](./SPEC.md): pagamentos, contratos, chat, ingressos, publicação nas lojas, IA, API de rotas (hoje a distância é estimada por haversine × 1,3) e convite de membros para a turnê (o modelo `memberIds/memberRoles` já existe, mas sem Cloud Functions não dá para achar um usuário pelo e-mail).
