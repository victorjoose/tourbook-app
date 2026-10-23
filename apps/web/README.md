# Tour App — app web

Este é o app web (Vite + React 19 + TypeScript + Tailwind v4) do Tour App. Ele só cuida de UI e integração; tipos, consultas ao Supabase e regras de negócio ficam no pacote `@tour/core` em `../../packages/core`.

A documentação completa (stack, configuração do Supabase e do login com Google, variáveis de ambiente, scripts, deploy na Vercel e CI) está no [README da raiz do repositório](../../README.md). A especificação técnica do MVP está em [SPEC.md](../../SPEC.md).

Atalhos, a partir da raiz do repositório:

```sh
cp apps/web/.env.example apps/web/.env   # preencha VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY
pnpm install
pnpm dev                                 # http://localhost:5173
```

Neste diretório: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` e `pnpm preview`.
