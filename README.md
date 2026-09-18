# Health Factory

Household health config for one family per deploy. Not a multi-tenant SaaS.

This repo is the web app Ethan and his wife log into. First sign-in creates the household and the owner person. Member accounts, profile editing, and MCP come in later PRs.

## Stack

- Next.js App Router and shadcn/ui
- Supabase Auth and Supabase Postgres

## Point the app at your project

Creating a hosted Supabase project from this environment would still require a human confirm step, so the schema lives in the repo.

1. Copy `.env.example` to `.env.local`.
2. Fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` from your Supabase project.
3. Apply `supabase/migrations` to that project (`supabase db push` after `supabase link`, or paste the SQL in the dashboard).
4. In Auth settings, turn off email confirmations (or confirm the first owner email yourself). Local `supabase/config.toml` already has `enable_confirmations = false`.
5. Run `npm install` and `npm run dev`.

The first visit shows household setup. After that, the same route is sign-in.

`SUPABASE_SERVICE_ROLE_KEY` is server-only. Never prefix it with `NEXT_PUBLIC_`.

## Schema

- `households`: one row per deploy (unique index on `(true)`). Household config is shared.
- `people`: one row per human, linked to `auth.users`. Role is `owner` or `member`.
- `person_profiles`: 1:1 with `people`. RLS allows household members to read profiles and only the owning person to update them.

## Scripts

```bash
npm test
npm run lint
npm run build
npm run dev
```
