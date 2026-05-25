import type { BlastColumn, BlastLevel, CellId, Locale, ThemeKey } from '../types';
import { hashStringToSeed, seededPRNG } from '../prng';
import { columnCountForLevel, columnHeightRangeForLevel, validateSilhouette } from './silhouette';
import { placeWords, type Grid } from './placement';
import { placementRulesForLevel } from './placement-rules';
import { rollTileFlags } from './tile-flags';
import { interestingnessScore, INTERESTINGNESS_THRESHOLD } from './interestingness';
import { mechanicsForLevel } from '../mechanic-flags';
import type { LocaleConfig } from '../locale-config';
import type { LevelSource } from '../level-source';
import { findExtraWords } from '../engine';
import { getBlastCommonWords } from '../engine/common-words';
import { rollLevelModifier } from '../level-modifiers';

let MAX_REGEN_ATTEMPTS = 60;
const LATERAL_SLIDE_CHANCE = 1 / 8;

export class GeneratedLevelSource implements LevelSource {
  constructor(private readonly configs: Record<Locale, LocaleConfig>) {}

  async resolve(
    levelNumber: number,
    locale: Locale,
    userIdBucket = 'default',
    variantSalt = '',
  ): Promise<BlastLevel> {
    const config = this.configs[locale];
    const mechanics = mechanicsForLevel(levelNumber);
    const baseSeed = hashStringToSeed(`${levelNumber}:${locale}:${userIdBucket}:${variantSalt}`);
    const isCommon = await getBlastCommonWords(locale);
    const minLen = config.wordLengthRange.min;
    for (let attempt = 0; attempt < MAX_REGEN_ATTEMPTS; attempt++) {
      const prng = seededPRNG(baseSeed + attempt * 1000);
      const themeKey = pickTheme(prng, config);
      const theme = config.themes[themeKey];
      const wordCount = wordsCountForLevel(levelNumber);
      const words = prng.pickN(theme.wordPool, Math.min(wordCount, theme.wordPool.length));
      const colRange = columnCountForLevel(levelNumber);
      const heightRange = columnHeightRangeForLevel(levelNumber);
      const cols = colRange.min + prng.intRange(colRange.max - colRange.min + 1);
      const rules = placementRulesForLevel(levelNumber);
      // Only require vertical if there's actually room. Below maxHeight 3 a
      // 3-letter word can fit vertically, but heightRange.max already enforces
      // the level's vertical ceiling — passing the flag is safe.
      const place = placeWords(
        words,
        {
          cols,
          maxHeight: heightRange.max,
          firstWordRowZero: rules.firstWordRowZero,
          requireVerticalWord: rules.requireVerticalWord,
        },
        prng,
      );
      if (!place.ok) continue;
      const sil = validateSilhouette(place.heights);
      if (!sil.ok) continue;
      const fillerCells = fillEmpties(place.grid, cols, place.heights, config, prng);
      const allCells = [...Object.keys(place.grid.cells), ...Object.keys(fillerCells)] as CellId[];
      const modifier = rollLevelModifier(prng, levelNumber);
      const tileFlags = rollTileFlags(allCells, mechanics, levelNumber, prng, modifier);
      const columns = compactColumns(cols, { ...place.grid.cells, ...fillerCells });
      const candidate: BlastLevel = {
        id: `gen-${levelNumber}-${locale}-${userIdBucket}-${attempt}`,
        levelNumber, theme: themeKey, locale, words, columns,
        resolvableOrder: words, tileFlags, difficulty: levelNumber,
        gravityMode: mechanics.lateralSlideGravity && prng.chance(LATERAL_SLIDE_CHANCE) ? 'lateral-slide' : 'standard',
        hasPivot: mechanics.multiWordReveal && prng.chance(0.15),
        ...(modifier ? { modifier } : {}),
      };
      const score = interestingnessScore(candidate);
      candidate.interestingnessScore = score;
      if (score >= INTERESTINGNESS_THRESHOLD) {
        // Check for unintended common words before returning
        if (findExtraWords(candidate, isCommon, minLen).length > 0) continue;
        return candidate;
      }
    }
    throw new Error(`could not generate level ${levelNumber}/${locale} after ${MAX_REGEN_ATTEMPTS} attempts`);
  }
}

function pickTheme(prng: ReturnType<typeof seededPRNG>, config: LocaleConfig): ThemeKey {
  const themes = (Object.keys(config.themes) as ThemeKey[]).filter((k) => k !== 'onboarding');
  return themes[prng.intRange(themes.length)]!;
}

function wordsCountForLevel(n: number): number {
  if (n <= 5) return 3;
  if (n <= 15) return 4;
  if (n <= 30) return 5;
  if (n <= 50) return 6;
  return 8;
}

function fillEmpties(
  grid: Grid, cols: number, heights: number[],
  config: LocaleConfig, prng: ReturnType<typeof seededPRNG>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < heights[c]!; r++) {
      const id = `c${c}r${r}`;
      if (!grid.cells[id as CellId]) {
        // Pick a letter from the weighted distribution
        out[id] = weightedLetter(config, prng);
      }
    }
  }
  return out;
}

function weightedLetter(config: LocaleConfig, prng: ReturnType<typeof seededPRNG>): string {
  const entries = Object.entries(config.letterFrequency);
  const total = entries.reduce((s, [, w]) => s + w, 0);
  const target = prng.next() * total;
  let acc = 0;
  for (const [l, w] of entries) {
    acc += w;
    if (target <= acc) return l;
  }
  return entries[0]![0];
}

function compactColumns(cols: number, cells: Record<string, string>): BlastColumn[] {
  const out: BlastColumn[] = [];
  for (let c = 0; c < cols; c++) {
    const tiles: string[] = [];
    let r = 0;
    while (true) {
      const v = cells[`c${c}r${r}`];
      if (!v) break;
      tiles.push(v);
      r++;
    }
    if (tiles.length > 0) out.push({ index: c, tiles });
  }
  return out;
}
