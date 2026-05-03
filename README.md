# Tile Predictor Pro

Portfolio demo: upload board screenshots, call **Gemini vision** via a **Vercel serverless** route (`/api/analyze-board`), and visualize score patterns in a local-only heatmap (history in `localStorage`).

This repo is meant for **public GitHub**. The Gemini key lives **only** in Vercel environment variables—not in client code.

## Deploy on Vercel

1. Import the GitHub repo in [Vercel](https://vercel.com/).
2. In **Project → Settings → Environment Variables**, add **`GEMINI_API_KEY`** for Production (and Preview if you want previews to run analysis). Do **not** use a `VITE_` prefix for secrets.
3. Optional abuse protection for a **public** API: create a free [Upstash](https://upstash.com/) Redis DB and add **`UPSTASH_REDIS_REST_URL`** + **`UPSTASH_REDIS_REST_TOKEN`** on Vercel. Without these, quotas rely on Google's limits plus request validation only.
4. Optional split-origin: set **`ALLOWED_ORIGINS`** (comma-separated) if the UI calls `/api` from another origin (see [`.env.example`](./.env.example)).
5. Deploy. Same deployment serves **`dist`** and **`/api/*`**.

## Local development

- **`npm install`**
- Prefer **`npx vercel dev`** — runs Vite + `/api` together (recommended after `vercel link`).
- **`npm run dev`** (**Vite** on port 5173) proxies **`/api`** to **`http://127.0.0.1:3000`** by default — run **`npx vercel dev`** in another terminal so the API is on **3000** (or override with **`VITE_DEV_API_PROXY`**).
- **`GEMINI_API_KEY`**: add to `.env` in the repo root (**gitignored**) so **`vercel dev`** loads it, or paste into the Vercel-linked project env.

Never commit `.env`. Copy [`.env.example`](./.env.example) only as documentation.

### If you rotate a leaked key

Revoke/disable the old key in **Google AI Studio / Cloud**, set a fresh **`GEMINI_API_KEY`** in Vercel, and redeploy. The browser bundle never contained the secret.

## Environment variables

| Variable                 | Scope                                | Purpose                                      |
| ------------------------ | ------------------------------------ | -------------------------------------------- |
| `GEMINI_API_KEY`         | Server (Vercel + local `vercel dev`) | Gemini API — **never** prefixed with `VITE_` |
| `UPSTASH_*`              | Server                               | Optional Redis rate limiting                 |
| `ALLOWED_ORIGINS`        | Server                               | Optional CORS allowlist                      |
| `VITE_API_ORIGIN`        | Client build                         | Only if SPA and API origins differ           |
| `VITE_AMPLITUDE_API_KEY` | Client                               | Optional analytics                           |

## Stack

Vite 6, React 19, TypeScript, Tailwind (built locally — no CDN), Amplitude optional.

## Scripts

`npm run dev`, `npm run build`, `npm run preview`, `npm test`, `npm run lint`.

## CI

Lint, tests, and production **`vite`** build run on GitHub Actions.

## Security notes

Security headers + CSP are set for static responses in **[`vercel.json`](./vercel.json)**. Tune `connect-src` if you add third-party telemetry domains.

MIT — see [LICENSE](./LICENSE).
