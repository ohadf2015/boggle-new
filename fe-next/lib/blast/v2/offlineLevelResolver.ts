import enChain from '@/content/blast/packs/en/pack-chain.json';
import heChain from '@/content/blast/packs/he/pack-chain.json';
import svChain from '@/content/blast/packs/sv/pack-chain.json';
import esChain from '@/content/blast/packs/es/pack-chain.json';
import { buildChainLevel } from './engine/chain-builder';
import type { BlastLevel, ChainLevelSpec, Locale } from './types';

/**
 * Zero-network level resolver for Wordfall (Blast V2).
 *
 * The server route (`/api/blast/level`) reads pack JSON from disk and runs the
 * chain builder with the optional common-word screen (fs-backed). None of that
 * is reachable on a connection drop. This module bundles the chain packs as
 * static imports and runs the SAME pure `buildChainLevel` — no fs, no fetch — so
 * a rider can play the whole 1..30 campaign offline.
 *
 * It deliberately skips the extra-word-check (the fs-backed common-words screen)
 * — that screen only suppresses incidental dictionary words on the board, a
 * cosmetic nicety. Solvability is the hard invariant and `buildChainLevel`
 * guarantees it regardless. Score parity is unaffected: stars/coins are derived
 * server-side from `level.words` (the authored chain), which is identical no
 * matter which board layout the builder lands on.
 */

type ChainPackFile = { locale: Locale; levels: ChainLevelSpec[] };

// Mirror level-source-registry CHAIN_LOCALES so every locale the server serves
// real chain content for also gets it offline (no English fallback mid-ride).
const PACKS: Partial<Record<Locale, ChainPackFile>> = {
  en: enChain as ChainPackFile,
  he: heChain as ChainPackFile,
  sv: svChain as ChainPackFile,
  es: esChain as ChainPackFile,
};

/** Bundled chain packs cover the curated campaign range (levels 1..30). */
export const MAX_OFFLINE_LEVEL = 30;

/** True when a locale has its own bundled chain pack (vs. falling back to en). */
export function hasOfflineLevels(locale: Locale): boolean {
  return Boolean(PACKS[locale]);
}

/**
 * Build `levelNumber` for `locale` entirely client-side, or null when it's
 * outside the bundled range. Locales without their own pack fall back to the
 * en pack (mirrors the server's `getLevelSourceForLevel` en fallback), so an
 * es/ja rider still gets a playable board offline.
 */
export function resolveOfflineLevel(levelNumber: number, locale: Locale): BlastLevel | null {
  const pack = PACKS[locale] ?? PACKS.en;
  if (!pack) return null;
  const spec = pack.levels.find((l) => l.levelNumber === levelNumber);
  if (!spec) return null;
  // Tier-2 build (no extra-word-check) — pure + deterministic per spec.
  return buildChainLevel(spec, levelNumber);
}
