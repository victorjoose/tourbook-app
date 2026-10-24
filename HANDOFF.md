# Handoff — Tour App (estado em 2026-10-24, ~03:30 UTC)

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
1. **Publicar as regras** no projeto Firebase: console → Firestore → Regras → colar `firebase/firestore.rules` (ou `npx firebase login` + `pnpm rules:deploy`). Sem isso o banco em modo produção nega tudo.
2. Criar `apps/web/.env` com a config web do app "Tour App Web" (console → Configurações do projeto → Seus apps). Chaves em `apps/web/.env.example`. A config já está preenchida no ambiente do Claude desta sessão, mas **não** está versionada nem em memória (é pública por natureza, mas evitamos espalhar).
3. `pnpm install && pnpm dev` → entrar com Google → no console, `profiles/<uid>.role = 'admin'` → abrir `/admin/importar` e importar os dados de exemplo.
4. Criar uma turnê, gerar o link público, baixar o PDF. Reportar bugs.
5. Deploy na Vercel (Root Directory `apps/web`, env `VITE_FIREBASE_*` + `VITE_MAP_STYLE_URL`) e adicionar o domínio da Vercel em Authentication → Settings → Authorized domains.
6. Marcar o PR #1 como pronto e fazer merge em `main` quando o José aprovar.

## Revisão automática em andamento (pode ter parado por limite de uso)
Uma rodada de revisão adversarial (segurança, correção, UX, qualidade → verificação → correções) estava rodando às 03:30 UTC. Se ela terminou, as correções ficam **no working tree sem commit** em `/home/user/tourbook-app` (ambiente desta sessão). Quem continuar deve:
- rodar `git status`; se houver mudanças, rodar os quatro comandos de verificação acima e commitar/pushar em `feat/mvp`;
- se o ambiente desta sessão não existir mais, nada se perdeu: tudo o que está em `feat/mvp` é o estado íntegro e verde; a revisão pode ser refeita (ver "Pendências conhecidas").

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
