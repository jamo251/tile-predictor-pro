# Tile Predictor Pro

React + TypeScript app that uploads game board screenshots, uses **Google Gemini** to extract per-cell scores from the image, then aggregates history into a **probability heatmap** (with optional recency weighting). Data stays in **localStorage** with import/export.

## Stack

- Vite 6, React 19, TypeScript, Tailwind CSS  
- `@google/genai` (Gemini) with structured JSON output  
- Optional Amplitude analytics (disabled unless you set a key)

## Run locally

**Prerequisites:** Node.js 20+

1. `npm install`
2. Copy `.env.example` to `.env.local` and set `VITE_GEMINI_API_KEY`
3. `npm run dev`

Other scripts: `npm run build`, `npm run lint`, `npm run format`, `npm test`.

## Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `VITE_GEMINI_API_KEY` | Yes | Gemini API key for vision / extraction |
| `VITE_AMPLITUDE_API_KEY` | No | Enables Amplitude if set |

`VITE_*` variables are embedded in the client bundle. **Do not ship a production app this way** without a backend proxy—anyone can read keys from built assets. For a portfolio / local demo, this is acceptable if you rotate keys if they leak.

## CI

GitHub Actions runs lint, tests, and production build on push and pull requests.

## License

MIT — see [LICENSE](./LICENSE).
