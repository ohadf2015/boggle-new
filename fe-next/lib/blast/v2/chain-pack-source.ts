import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { BlastLevel, ChainLevelSpec, Locale } from './types';
import type { LevelSource } from './level-source';
import { buildChainLevel, type ExtraWordCheck } from './engine/chain-builder';
import { validateChainLevel } from './engine/chain-validator';
import { LOCALE_CONFIGS } from './locale-config';
import { getBlastCommonWords } from './engine/common-words';

type ChainPackFile = { locale: Locale; levels: ChainLevelSpec[] };

// Floor the extra-word-check min length at 4. 3-letter "common" hits dominate
// false positives (esp. Hebrew, where most 3-letter substrings are real roots)
// and over-constrain placement to the point of unsolvability.
const EXTRA_WORD_CHECK_MIN_LENGTH_FLOOR = 4;

export class ChainPackSource implements LevelSource {
  private cache = new Map<Locale, ChainPackFile>();
  private extraCheckCache = new Map<Locale, ExtraWordCheck>();

  constructor(private basePath: string) {}

  private async load(locale: Locale): Promise<ChainPackFile> {
    const cached = this.cache.get(locale);
    if (cached) return cached;
    const path = join(this.basePath, locale, 'pack-chain.json');
    const raw = JSON.parse(await readFile(path, 'utf8')) as ChainPackFile;
    this.cache.set(locale, raw);
    return raw;
  }

  // Common-word screen: rejects placements (horizontal OR vertical) that
  // create a dictionary word outside the authored chain. Without this the
  // newly-enabled vertical insertion produces incidental commons like "GEAR".
  private async getExtraWordCheck(locale: Locale): Promise<ExtraWordCheck | undefined> {
    const cached = this.extraCheckCache.get(locale);
    if (cached) return cached;
    try {
      const isCommon = await getBlastCommonWords(locale);
      const minLength = Math.max(
        EXTRA_WORD_CHECK_MIN_LENGTH_FLOOR,
        LOCALE_CONFIGS[locale].wordLengthRange.min,
      );
      const check: ExtraWordCheck = { isCommon, minLength };
      this.extraCheckCache.set(locale, check);
      return check;
    } catch {
      // Common-words list optional — skip the screen when missing.
      return undefined;
    }
  }

  async resolve(levelNumber: number, locale: Locale): Promise<BlastLevel> {
    const pack = await this.load(locale);
    const spec = pack.levels.find((l) => l.levelNumber === levelNumber);
    if (!spec) {
      throw new Error(`ChainPackSource: no chain spec for ${locale} level ${levelNumber}`);
    }
    const extraCheck = await this.getExtraWordCheck(locale);

    // Tier 1: with extra-word-check (avoids incidental dictionary words on board).
    // Capped at a smaller attempt budget for narrow grids — the screen rejects
    // many placements once towers stack, so we fail fast and fall back rather
    // than burn minutes searching.
    const tier1Budget = spec.columns <= 5 ? 600 : 3000;
    let level = buildChainLevel(spec, levelNumber, extraCheck, tier1Budget);

    // Tier 2: fallback without extra-word-check. Better an occasional incidental
    // word than an unplayable level. Solvability is the hard invariant; aesthetic
    // cleanliness is soft. (Only triggers when tier 1 exhausted attempts.)
    if (!level && extraCheck) {
      level = buildChainLevel(spec, levelNumber);
    }

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
