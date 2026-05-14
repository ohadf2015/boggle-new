import { readFile, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type { BlastLevel, Locale } from './types';
import { CURATED_LEVEL_CUTOFF, type LevelSource } from './level-source';

const VALID_LOCALES: Locale[] = ['en', 'he', 'sv', 'ja', 'es'];

export function validateCuratedLevel(raw: unknown): asserts raw is BlastLevel {
  if (!raw || typeof raw !== 'object') throw new Error('level must be object');
  const l = raw as Record<string, unknown>;
  if (!Array.isArray(l.words) || l.words.length === 0) throw new Error('words must be non-empty');
  if (!VALID_LOCALES.includes(l.locale as Locale)) throw new Error(`locale invalid: ${String(l.locale)}`);
  if (!Array.isArray(l.columns)) throw new Error('columns must be array');
  if (!Array.isArray(l.resolvableOrder)) throw new Error('resolvableOrder must be array');
  const wordSet = new Set(l.words);
  for (const w of l.resolvableOrder as string[]) {
    if (!wordSet.has(w)) throw new Error(`resolvableOrder contains unknown word: ${w}`);
  }
  if (typeof l.difficulty !== 'number') throw new Error('difficulty must be number');
}

type PackFile = { theme: string; locale: Locale; levels: BlastLevel[] };

export class CuratedPackSource implements LevelSource {
  private cache = new Map<string, BlastLevel>();
  constructor(private readonly basePath: string) {}
  async resolve(levelNumber: number, locale: Locale): Promise<BlastLevel> {
    if (levelNumber > CURATED_LEVEL_CUTOFF) {
      throw new Error(`level ${levelNumber} outside curated range (1..${CURATED_LEVEL_CUTOFF})`);
    }
    const cacheKey = `${locale}:${levelNumber}`;
    const hit = this.cache.get(cacheKey);
    if (hit) return hit;
    const dir = resolve(this.basePath, locale);
    const files = await readdir(dir);
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      // pack-chain.json is a forced-chain pack (ChainLevelSpec schema, owned by
      // ChainPackSource) — not a curated BlastLevel pack. Skip it here.
      if (file === 'pack-chain.json') continue;
      const raw = JSON.parse(await readFile(join(dir, file), 'utf-8')) as PackFile;
      for (const lvl of raw.levels) {
        if (lvl.levelNumber === levelNumber) {
          validateCuratedLevel(lvl);
          this.cache.set(cacheKey, lvl);
          return lvl;
        }
      }
    }
    throw new Error(`curated level ${levelNumber} not found in ${dir}`);
  }
}
