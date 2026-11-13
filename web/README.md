# Genco Cans web app (app.gencocans.com)

Exported from Hostinger Horizons. This is the source of the live site and of what the
Capacitor shell in the repo root loads.

- `apps/web/` is the Vite + React front end.
- `supabase/functions/` holds the Supabase edge functions. They read secrets from the
  Supabase project's settings, not from this repo.

## Run locally

Copy `apps/web/.env.example` to `apps/web/.env` and fill in the values, then:

```bash
cd web && bun install
cd apps/web && npx vite
```

Build with `npx vite build` from `apps/web`. The root `bun run build` script recurses
under bun, so run the app's build directly.
