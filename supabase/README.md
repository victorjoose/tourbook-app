# Supabase — banco de dados do Tour App

Esta pasta contém tudo o que é preciso para subir o banco do Tour App em um projeto Supabase:

| Arquivo | O que é |
| --- | --- |
| `migrations/0001_init.sql` | Schema completo: extensões (PostGIS, pgcrypto), tipos, tabelas, triggers, funções (`get_public_tourbook`, `is_admin`, …) e políticas de RLS. |
| `seed.sql` | Dados de exemplo da região-piloto (SC, PR e SP): cidades reais + casas de show, produtoras e bandas **fictícias**. |

> **Atenção:** todas as casas de show, produtoras e bandas do `seed.sql` são inventadas
> (nomes, endereços, telefones `99999-xxxx`, e-mails `@exemplo.com.br`, Instagram). Elas existem
> só para a interface ter o que mostrar. Substitua por cadastros reais antes de abrir o app para
> usuários. As cidades (nome, UF, coordenadas do centro e população aproximada) são reais.

## 1. Criar o projeto

1. Crie um projeto novo em [supabase.com](https://supabase.com) (região `South America (São Paulo)` é a mais próxima).
2. Guarde a senha do banco: ela é usada na string de conexão do `psql` e no `supabase link`.
3. Copie a *Project URL* (**Project Settings → Data API**) e a *publishable key* (**Project Settings → API Keys**) para `apps/web/.env`:

   ```
   VITE_SUPABASE_URL=https://<ref>.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```

4. Em **Authentication → Providers**, ative o **Google** (o app faz login só com Google) e cadastre
   as URLs de redirecionamento (`http://localhost:5173` em dev e a URL da Vercel em produção).

## 2. Aplicar a migração e o seed

### Opção A — SQL Editor (sem instalar nada)

1. No painel do projeto abra **SQL Editor → New query**.
2. Cole o conteúdo inteiro de `migrations/0001_init.sql` e clique em **Run**.
   A migração já ativa o PostGIS (`create extension postgis with schema extensions`).
3. Abra outra query, cole o conteúdo inteiro de `seed.sql` e clique em **Run**.

O seed é **idempotente**: usa `insert … on conflict do nothing` e referencia cidades/casas/produtoras
por `slug` (nunca por UUID). Pode ser executado quantas vezes quiser sem duplicar nada.
A ordem interna é: `cities → venues → producers → producer_cities → producer_venues → bands`.

### Opção B — Supabase CLI

```bash
# uma vez
supabase login
supabase link --project-ref <ref>          # pede a senha do banco

# aplica supabase/migrations/*.sql no projeto remoto
supabase db push

# roda o seed no projeto remoto (string de conexão no botão **Connect**, no topo do painel)
psql "postgresql://postgres.<ref>:<senha>@aws-0-<regiao>.pooler.supabase.com:5432/postgres" \
  -v ON_ERROR_STOP=1 -f supabase/seed.sql
```

Para desenvolvimento local com `supabase start`, o comando `supabase db reset` aplica as migrações
e, em seguida, o `seed.sql` automaticamente (o caminho padrão em `config.toml` é `./seed.sql`).

## 3. Tornar um usuário admin

Usuários com `profiles.role = 'admin'` veem e moderam casas/produtoras/bandas pendentes
(tela `/admin/moderacao`) e podem editar cidades.

1. Faça login no app pelo menos uma vez com a conta Google (o trigger `on_auth_user_created`
   cria a linha em `public.profiles`).
2. Pegue o UUID do usuário em **Authentication → Users** (ou `select id, email from auth.users;`).
3. No SQL Editor:

   ```sql
   update public.profiles set role = 'admin' where id = '<uuid do usuário>';
   ```

Para voltar a usuário comum, troque `'admin'` por `'user'`.

## 4. Conferindo

```sql
select
  (select count(*) from public.cities)    as cidades,     -- 92
  (select count(*) from public.venues)    as casas,       -- 45
  (select count(*) from public.producers) as produtoras,  -- 12
  (select count(*) from public.bands)     as bandas;      -- 20
```

Se a migração for alterada (novas colunas, enums, políticas), crie um arquivo novo em
`migrations/` (`0002_….sql`) em vez de editar o `0001_init.sql` de um projeto já publicado.

## 5. Limpar os dados de exemplo

Quando os cadastros reais estiverem prontos, remova as entidades fictícias (as cidades podem ficar):

```sql
delete from public.bands     where notes = 'Dado de exemplo — substitua por uma banda real.';
delete from public.producers where notes = 'Dado de exemplo — substitua por uma produtora real.';
delete from public.venues    where notes = 'Dado de exemplo — substitua por uma casa real.';
```

As tabelas de junção (`producer_cities`, `producer_venues`) são limpas em cascata.
