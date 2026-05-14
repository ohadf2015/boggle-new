import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { BlastLevel, ChainLevelSpec, Locale } from './types';
import type { LevelSource } from './level-source';
import { buildChainLevel } from './engine/chain-builder';
import { validateChainLevel } from './engine/chain-validator';

type ChainPackFile = { locale: Locale; levels: ChainLevelSpec[] };

export class ChainPackSource implements LevelSource {
  private cache = new Map<Locale, ChainPackFile>();

  constructor(private basePath: string) {}

  private async load(locale: Locale): Promise<ChainPackFile> {
    const cached = this.cache.get(locale);
    if (cached) return cached;
    const path = join(this.basePath, locale, 'pack-chain.json');
    const raw = JSON.parse(await readFile(path, 'utf8')) as ChainPackFile;
    this.cache.set(locale, raw);
    return raw;
  }

  async resolve(levelNumber: number, locale: Locale): Promise<BlastLevel> {
    const pack = await this.load(locale);
    const spec = pack.levels.find((l) => l.levelNumber === levelNumber);
    if (!spec) {
      throw new Error(`ChainPackSource: no chain spec for ${locale} level ${levelNumber}`);
    }
    const level = buildChainLevel(spec, levelNumber);
    if (!level) {
      throw new Error(`ChainPackSource: buildChainLevel failed for ${spec.id}`);
    }
    const check = validateChainLevel(level);
    if (!check.ok) {
      throw new Error(`ChainPackSource: ${spec.id} invalid — ${check.reason}`);
    }
    return level;
  }
}
