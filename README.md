# ViaStellis — Web App

The public web client for [ViaStellis](https://viastellis.com), a Vedic astrology app.
React + Vite + TypeScript SPA, deployed to GitHub Pages.

## Develop

```bash
npm install
cp .env.example .env   # fill in your Supabase URL + anon key
npm run dev
```

## Build

```bash
npm run build          # type-checks (tsc -b) then bundles (vite)
```

## Deploy

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds and
publishes to GitHub Pages. Set the build secrets in
**Settings → Secrets and variables → Actions**:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

(These are public client values — the Supabase anon key is protected by
row-level security.)

## Notes

- Backend logic (Supabase Edge Functions, database migrations) lives outside
  this repository and is deployed separately.
- All astrology calculations run client-side from classical, public-domain
  algorithms (Lahiri ayanamsa, Vimshottari dasha, nakshatras, Whole Sign houses).
