import type { BlastLevel, Locale } from './types';

export interface LevelSource {
  resolve(
    levelNumber: number,
    locale: Locale,
    userIdBucket?: string,
    // Optional daily/seasonal salt — only `GeneratedLevelSource` consumes it.
    // Curated/chain sources ignore the param so hand-authored content stays
    // visually identical across days.
    variantSalt?: string,
  ): Promise<BlastLevel>;
}

export type LevelSourceRegistry = { curated: LevelSource; generated: LevelSource; chain: LevelSource };

export const CURATED_LEVEL_CUTOFF = 30;

export function getLevelSource(levelNumber: number, registry: LevelSourceRegistry): LevelSource {
  return levelNumber <= CURATED_LEVEL_CUTOFF ? registry.curated : registry.generated;
}
