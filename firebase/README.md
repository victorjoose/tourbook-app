# Firebase — regras do Firestore, índices e testes no emulador

Tudo que diz respeito ao banco (Cloud Firestore, plano Spark, **sem Cloud Functions**) mora aqui.
O modelo de dados e de acesso está em `SPEC.md › Banco de dados`; os tipos dos documentos em
`packages/core/src/firestore.ts`; o acesso a dados do app em `packages/core/src/queries.ts`.

| Arquivo | O que é |
| --- | --- |
| `firestore.rules` | Regras de segurança. Como não há backend, **são elas que garantem o acesso**. |
| `firestore.indexes.json` | Índices compostos. Está vazio de propósito: todas as consultas do app usam um único campo (`status ==`, `submittedBy ==`, `memberIds array-contains`), que o Firestore indexa sozinho. |
| `firestore.rules.test.ts` | Testes das regras, caso a caso (quem pode ler/criar/editar/apagar o quê). |
| `queries.emulator.test.ts` | As funções **reais** do `@tour/core` (`createTour`, `enableShareLink`, `importSeedData`…) rodando contra o emulador com as regras ativas. Prova que cada fluxo do cliente é permitido — e que os indevidos são negados. |
| `emulator.ts` | Infra compartilhada pelos dois testes (conexão, seed com regras desligadas, fixtures). |
| `vitest.config.ts`, `tsconfig.json` | Config do vitest e do TypeScript só para esta pasta. |

## Pré-requisitos

- Node 22+, pnpm (deps já estão na raiz: `firebase-tools`, `@firebase/rules-unit-testing`, `vitest`).
- **Java 21** — o emulador do Firestore é um `.jar`.
- Na primeira execução o CLI baixa o jar para `~/.cache/firebase/emulators`. Sem rede na hora do teste,
  baixe antes com `./node_modules/.bin/firebase setup:emulators:firestore`.

## Emulador local (desenvolvimento do app)

```bash
pnpm emulators          # Auth :9099 + Firestore :8080 + UI http://localhost:4000
```

No `apps/web/.env`, ponha `VITE_FIREBASE_USE_EMULATOR=1` e o app passa a falar com o emulador
(`apps/web/src/lib/firebase.ts`). Os dados ficam em memória e somem quando o emulador para.
Para popular: tela `/admin/importar` (precisa de um perfil admin, veja abaixo) ou `pnpm seed`.

## Testes das regras

```bash
pnpm rules:test
```

O comando sobe **só** o Firestore no projeto fictício `demo-tourbook` (projetos `demo-*` nunca tocam
a nuvem), roda `vitest run --root firebase` e derruba o emulador no fim. Os testes:

- carregam `firestore.rules` no emulador (`initializeTestEnvironment`), limpam o banco antes de cada
  caso (`clearFirestore`) e usam `withSecurityRulesDisabled` só para montar fixtures;
- simulam usuários com `authenticatedContext(uid)` / `unauthenticatedContext()` e verificam com
  `assertSucceeds` / `assertFails`;
- em `queries.emulator.test.ts`, montam um `Client` (`{ db, auth }`) a partir desses contextos e
  chamam as funções de `@tour/core` sem nenhum mock.

Se `FIRESTORE_EMULATOR_HOST` não estiver definida (emulador fora do ar), as duas suítes são
**puladas** em vez de falhar — assim dá para rodar o vitest desta pasta numa máquina sem Java.
(`pnpm -r test` não inclui esta pasta: ela não é um pacote do workspace; só `pnpm rules:test` a roda.)

Para iterar com o emulador já de pé, em dois terminais:

```bash
pnpm emulators
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 ./node_modules/.bin/vitest run --root firebase
```

Typecheck desta pasta (não entra no `pnpm -r typecheck`, que só cobre os pacotes do workspace; o CI roda este comando):

```bash
pnpm typecheck:tools
```

### O que os testes cobrem

| Coleção | Permitido | Negado |
| --- | --- | --- |
| `profiles/{uid}` | logado lê qualquer perfil; o próprio usuário cria com `role: 'user'` e edita nome/avatar; admin edita tudo (inclusive `role`) | criar como admin; mudar a própria `role`; criar/editar perfil de outro; leitura sem login |
| `cities` | logado lê/lista; admin escreve | escrita por usuário comum; leitura sem login |
| `venues` / `producers` / `bands` | logado lista `where status == 'verified'`; quem enviou lê/edita a própria sugestão enquanto `pending` e lista `where submittedBy == uid`; admin lê tudo, lista `where status == 'pending'`, modera, apaga e **cria direto** (importação do seed); banda reivindicada (`ownerId`) edita a própria ficha | criar já `verified` ou em nome de outro uid; ler/editar sugestão alheia; aprovar a própria sugestão; listar a coleção inteira sem ser admin; apagar sem ser admin; dono da banda mudar `status`/`ownerId` |
| `tours` | criar com `ownerId = uid`, `memberIds = [uid]`, `memberRoles[uid] = 'editor'`, `shareToken = null`; membro lê e lista `where memberIds array-contains uid`; editor edita (nome, resumo, `shareToken`); dono gerencia membros e apaga; `get` de id inexistente devolve "não existe" para quem está logado (`fetchTour → null`) | criar com outros membros/outro dono/token; não membro ler; viewer editar; editor mexer em `ownerId`/`memberIds`/`memberRoles` ou apagar; listar a coleção sem filtro |
| `tours/{id}/dates` | membro lê e lista; dono/editor cria, edita e apaga (inclusive no mesmo batch que cria a turnê — `createTour`) | viewer escrever; não membro ler; escrever datas de turnê inexistente |
| `publicTourbooks/{token}` | **`get` sem login** (página `/t/:token`); editor da turnê cria/regrava o doc cujo id é `tour.shareToken` com `tourId`; editor apaga enquanto o token ainda bate; apagar token já inexistente é no-op permitido para logados | `list` (ninguém enumera tokens); id ≠ `shareToken`; turnê sem link; `tourId` inválido/ausente; viewer, não membro ou anônimo escrever/apagar; apagar depois que o token mudou |

Fluxos de `queries.ts` exercitados de ponta a ponta: `ensureProfile` (idempotente), `createTour` →
`fetchMyTours`/`fetchTour`, `addTourDate`/`updateTourDate`/`deleteTourDate`/`setTourDateBands`
(resumo `dateCount/firstDate/lastDate` sempre correto), `enableShareLink` → `fetchPublicTourbook`
sem login com payload **sanitizado** (sem dono, membros, cachê ou custos), `disableShareLink`,
`deleteTour` (apaga datas e cópia pública), `submitVenue` → `fetchPendingVenues`/`moderateVenue`
→ `fetchRegionData`, `importSeedData` (admin ok, usuário negado) e `fetchCollectionCounts`.

### Detalhes das regras que valem a pena saber

- **Regras não são filtros.** Uma consulta só passa se a regra puder ser provada para todo documento
  que ela pode devolver. Por isso o app sempre consulta com `where('status', '==', 'verified')`,
  `where('submittedBy', '==', uid)` ou `where('memberIds', 'array-contains', uid)` — listar a coleção
  inteira é negado (exceto admin em casas/produtoras/bandas).
- `createTour` grava a turnê e as datas **num único batch**. Dentro de um batch, `get()`/`exists()`
  enxergam o estado *anterior*, então a regra das datas usa `getAfter()`/`existsAfter()` na turnê pai.
  É seguro: a escrita da própria turnê no mesmo batch é validada pela regra dela.
- `publicTourbooks` permite só `get`. O token é a chave; se `list` fosse público, qualquer um
  enumeraria todos os links compartilhados.
- `fetchCollectionCounts` (contagem sem filtro) só passa para admin — é usado apenas em `/admin/importar`.

## Deploy das regras e índices (projeto real)

Só depois de `pnpm rules:test` verde. O projeto padrão está em `.firebaserc` (`tourbook-app`).

```bash
npx firebase login             # abre o navegador; uma vez por máquina
npx firebase use tourbook-app  # confirma o projeto ativo (opcional)
pnpm rules:deploy              # = firebase deploy --only firestore:rules,firestore:indexes
```

As regras entram em vigor em cerca de um minuto. Nunca rode o deploy em CI ou por scripts
automáticos: é uma ação manual, com login, de quem administra o projeto.

## Como tornar um usuário admin

Não há tela para isso (de propósito): é feito no console do Firebase.

1. A pessoa precisa ter entrado no app pelo menos uma vez — o perfil `profiles/{uid}` é criado no
   primeiro login (`ensureProfile`), sempre com `role: 'user'`.
2. No console: **Authentication → Users**, copie o **UID** do usuário.
3. **Firestore Database → Dados → coleção `profiles`**, abra o documento com esse UID.
4. Edite o campo `role` de `user` para `admin` e salve.
5. A pessoa recarrega o app: `useAuth().isAdmin` passa a ser `true` e aparecem as telas
   `/admin/moderacao` e `/admin/importar`.

Para revogar, volte `role` para `user`. As regras impedem que alguém altere a própria `role`
pelo app; só outro admin (ou o console) consegue.

No emulador, o mesmo caminho vale pela UI em `http://localhost:4000/firestore`.

## Índices compostos

Se algum dia uma consulta combinar `where` com `orderBy` em outro campo (ou vários `where`), o
Firestore devolve um erro com um link para criar o índice. Em vez de clicar, adicione a definição em
`firestore.indexes.json` e rode `pnpm rules:deploy`, para o índice ficar versionado junto com as regras.
