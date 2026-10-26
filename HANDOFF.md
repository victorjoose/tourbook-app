# Handoff — Tour App (estado em 2026-10-26)

Documento de passagem de bastão para quem continuar (pessoa ou Claude). Leia junto com `SPEC.md` (especificação técnica), `README.md` (setup) e `firebase/README.md` (regras, emulador, admin).

## Onde está o código
- Repo: https://github.com/victorjoose/tourbook-app — branch `feat/mvp`, PR rascunho #1 (CI verde no último commit).
- Monorepo pnpm: `apps/web` (Vite + React 19 + TS + Tailwind v4), `packages/core` (`@tour/core`, sem DOM — tipos, queries Firestore, motor de sugestões, geo, datas, tourbook, seed em `@tour/core/seed`), `firebase/` (regras + 103 testes no emulador), `scripts/seed.ts`.
- Documento de produto (decisões do José): https://claude.ai/artifact/HRcy9jRbhqKiTtiSQA9Fvk

## Decisões fechadas
- Backend **Firebase** (projeto `tourbook-app`, plano Spark, Firestore em southamerica-east1, Auth Google). Sem Cloud Functions: resumos e tourbook público são mantidos pelo cliente; segurança vem das regras.
- **Não usar** o conector/conta Supabase (é dos sites Storm e Scumbags).
- Região-piloto SC/PR/SP; nicho rock/punk/hardcore; só bandas no MVP; mapa em tela dividida; wizard + "preencher buracos"; mobile depois com Expo reaproveitando `@tour/core`; hospedagem Vercel.

## O que está pronto (tudo em `feat/mvp`)
- Modelo Firestore + camada de acesso (`packages/core/src/{firestore,queries,mappers}.ts`), login Google com criação de perfil, regras de segurança testadas.
- Mapa (busca, filtros, listas, detalhes, adicionar a uma turnê), criador de turnê (wizard), página da turnê (datas, status, editor, preencher buracos, finanças, alertas, link público), tourbook PDF + página pública `/t/:token`, sugestão de casas + moderação, perfil, `/admin/importar` (dados de exemplo: 92 cidades reais, 45 casas/12 produtoras/20 bandas fictícias).
- `pnpm -r typecheck`, `pnpm -r lint`, `pnpm -r test` (187 testes), `pnpm typecheck:tools`, build web e `pnpm rules:test` (emulador, Java 21) todos verdes em 2026-10-24.

## O que falta para o José testar de verdade (ordem sugerida)
1. **Publicar as regras** no projeto Firebase. Em 2026-10-26 o Claude colou `firebase/firestore.rules` no editor do console (Firestore → Regras) numa aba do Chrome do José; o editor mostra "unpublished changes" e falta só clicar **Publish** — o Claude não tem permissão para publicar mudanças em produção. Se a aba foi fechada ou recarregada o rascunho se perde: colar de novo o arquivo inteiro, ou `npx firebase login` + `pnpm rules:deploy`. Sem isso o banco em modo produção nega tudo. Conferido: Authentication → Settings → Authorized domains já tem `localhost` (padrão), `tourbook-app.firebaseapp.com` e `tourbook-app.web.app`.
2. Criar `apps/web/.env` com a config web do app "Tour App Web" (console → Configurações do projeto → Seus apps). Chaves em `apps/web/.env.example`. A config já está preenchida no ambiente do Claude desta sessão, mas **não** está versionada nem em memória (é pública por natureza, mas evitamos espalhar).
3. `pnpm install && pnpm dev` → entrar com Google → no console, `profiles/<uid>.role = 'admin'` → abrir `/admin/importar` e importar os dados de exemplo.
4. Criar uma turnê, gerar o link público, baixar o PDF. Reportar bugs.
5. Deploy na Vercel (Root Directory `apps/web`, env `VITE_FIREBASE_*` + `VITE_MAP_STYLE_URL`) e adicionar o domínio da Vercel em Authentication → Settings → Authorized domains.
6. Marcar o PR #1 como pronto e fazer merge em `main` quando o José aprovar.

## Revisão adversarial (concluída em 2026-10-24)
Quatro revisores (segurança, correção, UX, qualidade) levantaram 29 achados; 26 foram confirmados por verificação independente. Os principais já foram corrigidos e estão em `feat/mvp`:
- **Segurança (alto):** uma turnê com `shareToken` copiado podia sobrescrever/apagar o tourbook público de outra. Regra de `publicTourbooks` agora amarra update/delete ao `tourId` já gravado (testes no emulador cobrem). Perfis não são mais listáveis por usuário comum (`get` sim, `list` só admin).
- **Mapa:** a linha da rota não aparecia no primeiro carregamento (TourPage e revisão do wizard).
- **Sugestões:** quando a cidade anterior era o próprio destino (volta para casa), tudo ganhava "Afasta de X"; agora não há sinal de direção nesse caso.
- **Login:** erros do Firebase Auth em pt-BR (domínio não autorizado, sem conexão etc.), erro do redirect aparece na tela, falha ao carregar perfil mostra erro com "tentar de novo" nas rotas de admin.
- **Mapa vazio:** sem dados, a tela inicial explica e leva o admin para `/admin/importar`; no celular a gaveta abre sozinha em erro/banco vazio.
- Links de casa/produtora na página da turnê; produtora é limpa ao mover uma data para casa de outra cidade; "Atualizado em" do tourbook público usa o dia local; dias da semana do formulário de casa começam na segunda; limites de km/dia unificados (50–1500); só links http(s) viram href (moderação e bandas).

Ficaram para depois (achados médios/baixos de UX e qualidade, não bloqueiam o teste):
- Editar gêneros/capacidade/cidade de partida e chegada depois de criar a turnê (hoje só nome, banda e km/dia).
- Unificar rótulos de horários ('Portas' vs 'Porta', 'Passagem' vs 'Passagem de som') entre página da turnê e tourbook.
- Deduplicar helpers entre core e web (`plural`, `capitalize`, `cityLabel`, `byName`…), três comboboxes parecidos (`SearchSelect`, `CitySelect`, wizard), `SuggestionRow` duplicando `SuggestionCard`, props/chave de cache mortas no mapa.
- `queries.ts`: cada mutação em data relê a turnê inteira mesmo sem link público (otimizar `afterDatesChanged`); enums zod como `[string, ...string[]]` perdem o tipo literal; `fetchPublicTourbook` confia no payload sem validar.
- Botões de contato (WhatsApp/e-mail) direto no cartão da data.

## Pendências conhecidas (levantadas pelos agentes; nenhuma bloqueia o teste)
- Convite de membros para a turnê não tem UI (modelo `memberIds/memberRoles` existe; sem Cloud Functions não dá para achar usuário por e-mail). Fora do MVP.
- `ModerationPage` mostra o uid de quem enviou, não o nome (faltaria um `fetchProfiles(client, uids)` em `queries.ts`).
- `fetchCollectionCounts` só funciona para admin (regras) — usado só em `/admin/importar`.
- `scripts/seed.ts` grava no projeto real sem confirmação quando `GOOGLE_APPLICATION_CREDENTIALS` está definido; um `--yes` seria prudente.
- `pnpm rules:test` não roda no CI (precisa de Java + download do emulador); roda só local.
- Editar cidade de partida/chegada depois de criar a turnê não está na UI (só nome/banda/km por dia).
- `formatDatePt(iso, 'short')` devolve "sexta, 06/03" enquanto o SPEC fala em "sex, 06/03" (teste aceita os dois).
- Barra inferior do admin no celular tem 5 itens (apertada).
- Nome do app ainda não decidido ("Tour App" é provisório).

## Como continuar sem perder tempo
- Convenções e API do core: `SPEC.md`. Regras e emulador: `firebase/README.md`.
- Antes de abrir/atualizar PR: `pnpm -r typecheck && pnpm -r lint && pnpm -r test && pnpm typecheck:tools` e `VITE_FIREBASE_API_KEY=x VITE_FIREBASE_AUTH_DOMAIN=x.firebaseapp.com VITE_FIREBASE_PROJECT_ID=x VITE_FIREBASE_APP_ID=x pnpm --filter web build`.
- Mensagens de commit terminam com as linhas de coautoria do Claude; descrições de PR começam com o bloco de atribuição e terminam com o rodapé "Generated with Claude Code".
