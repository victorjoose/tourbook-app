# Tour App — app web

Este é o app web (Vite + React 19 + TypeScript + Tailwind v4) do Tour App. Ele só cuida de UI e integração; tipos, acesso ao Firestore e regras de negócio ficam no pacote `@tour/core` em `../../packages/core`.

A documentação completa (stack, criação do projeto Firebase, login com Google, regras do Firestore, variáveis de ambiente, emulador local, scripts, deploy na Vercel e CI) está no [README da raiz do repositório](../../README.md). A especificação técnica do MVP está em [SPEC.md](../../SPEC.md).

Atalhos, a partir da raiz do repositório:

```sh
cp apps/web/.env.example apps/web/.env   # preencha VITE_FIREBASE_* com a firebaseConfig do console do Firebase
pnpm install
pnpm dev                                 # http://localhost:5173
```

Neste diretório: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` e `pnpm preview`. O `vercel.json` daqui reescreve todas as rotas para `index.html` (SPA).
