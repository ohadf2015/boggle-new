import { CuratedPackSource } from './curated-pack-source';
import { GeneratedLevelSource } from './generator';
import { ChainPackSource } from './chain-pack-source';
import { LOCALE_CONFIGS } from './locale-config';
import type { LevelSourceRegistry, LevelSource } from './level-source';
import type { Locale } from './types';
import { resolve } from 'node:path';

// Hand-authored content locales. Adding a locale here without matching pack
// files in content/blast/packs/<locale>/ will throw at runtime. sv + es ship
// generated chain packs (scripts/blast/gen-sv-es-chain-packs.ts) verified
// solvable in all-levels-solvable.test.ts.
const CHAIN_LOCALES: Locale[] = ['en', 'he', 'sv', 'es'];
const CURATED_LOCALES: Locale[] = ['en', 'he'];
const CHAIN_MAX_LEVEL = 30;
const CURATED_MAX_LEVEL = 30;

let cached: LevelSourceRegistry | null = null;

export function buildRegistry(): LevelSourceRegistry {
  if (cached) return cached;
  const basePath = resolve(process.cwd(), 'content/blast/packs');
  cached = {
    curated: new CuratedPackSource(basePath),
    generated: new GeneratedLevelSource(LOCALE_CONFIGS),
    chain: new ChainPackSource(basePath),
  };
  return cached;
}

/**
 * Priority: chain (1-30 for chain locales en/he/sv/es) → curated (1-30 for
 * curated locales) → generated. ja (and any unlisted locale) bypasses pack
 * lookups entirely so missing pack dirs do not 404 the API.
 */
export function getLevelSourceForLevel(
  levelNumber: number,
  locale: Locale,
  registry: LevelSourceRegistry,
): LevelSource {
  if (CHAIN_LOCALES.includes(locale) && levelNumber >= 1 && levelNumber <= CHAIN_MAX_LEVEL) {
    return registry.chain;
  }
  if (CURATED_LOCALES.includes(locale) && levelNumber <= CURATED_MAX_LEVEL) {
    return registry.curated;
  }
  return registry.generated;
}
