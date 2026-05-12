import { CuratedPackSource } from './curated-pack-source';
import { GeneratedLevelSource } from './generator';
import { LOCALE_CONFIGS } from './locale-config';
import type { LevelSourceRegistry } from './level-source';
import { resolve } from 'node:path';

let cached: LevelSourceRegistry | null = null;

export function buildRegistry(): LevelSourceRegistry {
  if (cached) return cached;
  const basePath = resolve(process.cwd(), 'content/blast/packs');
  cached = {
    curated: new CuratedPackSource(basePath),
    generated: new GeneratedLevelSource(LOCALE_CONFIGS),
  };
  return cached;
}
