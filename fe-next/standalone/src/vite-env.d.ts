/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Which portal SDK to bundle: 'poki' | 'crazygames' | 'gamedistribution' | 'none' (default). */
  readonly VITE_PORTAL?: string;
  /** GameDistribution game id (hash) — only used when VITE_PORTAL=gamedistribution. */
  readonly VITE_GD_GAME_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
