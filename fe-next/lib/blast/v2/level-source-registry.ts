import { CuratedPackSource } from './curated-pack-source';
import { GeneratedLevelSource } from './generator';
import { ChainPackSource } from './chain-pack-source';
import { LOCALE_CONFIGS } from './locale-config';
import type { LevelSourceRegistry, LevelSource } from './level-source';
import type { Locale } from './types';
import { resolve } from 'node:path';

const CHAIN_LOCALES: Locale[] = ['en', 'he'];
const CHAIN_MAX_LEVEL = 30;

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
 * Resolve the appropriate source for a given level number and locale.
 * Priority: chain (1-15 for en/he) → curated → generated.
 */
export function getLevelSourceForLevel(
  levelNumber: number,
  locale: Locale,
  registry: LevelSourceRegistry,
): LevelSource {
  if (CHAIN_LOCALES.includes(locale) && levelNumber >= 1 && levelNumber <= CHAIN_MAX_LEVEL) {
    return registry.chain;
  }
  return levelNumber <= 30 ? registry.curated : registry.generated;
}
