/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * When the UI is served separately from the deployed app (rare), set the API origin
   * (e.g. https://your-app.vercel.app). Leave empty for same-origin / Vite dev proxy.
   */
  readonly VITE_API_ORIGIN?: string;
  readonly VITE_AMPLITUDE_API_KEY?: string;
}
