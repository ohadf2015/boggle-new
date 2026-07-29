/**
 * Blast v2 Admin Authoring CLI
 * Handles interactive and batch level authoring with validation
 */

import type { BlastLevel, CellId, Locale, ThemeKey, TileFlag } from './types';
import { LOCALE_CONFIGS } from './locale-config';
import { GeneratedLevelSource } from './generator/generated-level-source';
import * as fs from 'fs/promises';
import * as path from 'path';

const VALID_LOCALES: Locale[] = ['en', 'he', 'sv', 'ja', 'es'];
const VALID_THEMES: ThemeKey[] = [
  'onboarding',
  'fruits', 'animals', 'food', 'ocean', 'space',
  'nature', 'sports', 'colors', 'transport', 'body',
  'home', 'school', 'tools', 'weather', 'music',
  'jobs', 'family', 'numbers', 'feelings',
  'mythology', 'science', 'travel', 'art', 'time',
];

export interface AuthorizeLevelOptions {
  locale: Locale;
  theme: ThemeKey;
  levelNumber: number;
  mode: 'auto-gen' | 'manual';
  words?: string[];
  tileFlags?: Partial<Record<CellId, TileFlag[]>>;
  gravityMode?: 'standard' | 'lateral-slide';
  hasPivot?: boolean;
}

/**
 * Authorize and generate/validate a single Blast level
 * TDD entry point for the admin CLI
 */
export async function authorizeLevel(options: AuthorizeLevelOptions): Promise<BlastLevel> {
  // Validate inputs
  if (!VALID_LOCALES.includes(options.locale)) {
    throw new Error(`Invalid locale: ${options.locale}. Must be one of ${VALID_LOCALES.join(', ')}`);
  }

  if (!VALID_THEMES.includes(options.theme)) {
    throw new Error(`Invalid theme: ${options.theme}. Must be one of ${VALID_THEMES.join(', ')}`);
  }

  if (options.levelNumber < 1 || options.levelNumber > 999) {
    throw new Error(`Invalid level number: ${options.levelNumber}. Must be between 1 and 999`);
  }

  const config = LOCALE_CONFIGS[options.locale];
  if (!config.themes[options.theme]) {
    throw new Error(`Theme ${options.theme} not found in locale ${options.locale}`);
  }

  // Auto-gen or manual mode
  if (options.mode === 'auto-gen') {
    const generator = new GeneratedLevelSource(LOCALE_CONFIGS);
    const level = await generator.resolve(options.levelNumber, options.locale, 'default');

    // Apply overrides if provided
    if (options.tileFlags) {
      level.tileFlags = { ...level.tileFlags, ...options.tileFlags };
    }
    if (options.gravityMode) {
      level.gravityMode = options.gravityMode;
    }
    if (options.hasPivot !== undefined) {
      level.hasPivot = options.hasPivot;
    }

    return level;
  }

  // Manual mode: validate provided words and construct a level
  if (!options.words || options.words.length === 0) {
    throw new Error('Manual mode requires words to be provided');
  }

  // Normalize words according to locale
  const normalizedWords = options.words.map((w) => config.normalize(w));

  // Basic validation: all words should be from theme pool or general tile pool
  for (const word of normalizedWords) {
    const hasValidLength =
      word.length >= config.wordLengthRange.min && word.length <= config.wordLengthRange.max;
    if (!hasValidLength) {
      throw new Error(
        `Word "${word}" has invalid length. Must be ${config.wordLengthRange.min}-${config.wordLengthRange.max} chars`
      );
    }

    // Check all letters exist in tile pool
    for (const letter of word.split('')) {
      if (!config.tilePool.includes(letter)) {
        throw new Error(`Letter "${letter}" not in tile pool for ${options.locale}`);
      }
    }
  }

  // Build a minimal valid grid (simple layout)
  const columns = buildMinimalGrid(normalizedWords, config.tilePool);

  const level: BlastLevel = {
    id: `manual-${options.locale}-${options.theme}-${options.levelNumber}`,
    levelNumber: options.levelNumber,
    theme: options.theme,
    locale: options.locale,
    words: normalizedWords,
    columns,
    resolvableOrder: normalizedWords,
    tileFlags: options.tileFlags || {},
    difficulty: options.levelNumber,
    gravityMode: options.gravityMode,
    hasPivot: options.hasPivot,
  };

  return level;
}

/**
 * Build a minimal valid grid for manual word placement
 * Places each word horizontally in separate columns
 */
function buildMinimalGrid(
  words: string[],
  tilePool: string[]
): Array<{ index: number; tiles: string[] }> {
  const columns: Array<{ index: number; tiles: string[] }> = [];
  const maxHeight = Math.max(
    ...words.map((w) => w.length),
    words.length
  );

  for (let i = 0; i < maxHeight; i++) {
    const columnTiles: string[] = [];
    for (let w = 0; w < words.length; w++) {
      if (i < words[w].length) {
        columnTiles.push(words[w][i]);
      } else {
        // Filler letter
        columnTiles.push(tilePool[Math.floor(Math.random() * tilePool.length)]);
      }
    }
    columns.push({ index: i, tiles: columnTiles });
  }

  return columns;
}

/**
 * Write level(s) to a curated pack file
 * Creates or appends to content/blast/packs/<locale>/pack-<theme>.json
 */
export async function writeLevelToPack(
  level: BlastLevel,
  packDir: string = './content/blast/packs'
): Promise<string> {
  const localeDir = path.join(packDir, level.locale);
  const packPath = path.join(localeDir, `pack-${level.theme}.json`);

  // Ensure directory exists
  await fs.mkdir(localeDir, { recursive: true });

  // Load existing pack or create new one
  let packData: { theme: string; locale: string; levels: BlastLevel[] };
  try {
    const existing = await fs.readFile(packPath, 'utf-8');
    packData = JSON.parse(existing);
  } catch {
    // File doesn't exist, create new pack
    packData = {
      theme: level.theme,
      locale: level.locale,
      levels: [],
    };
  }

  // Append level
  packData.levels.push(level);

  // Write back
  await fs.writeFile(packPath, JSON.stringify(packData, null, 2), 'utf-8');

  return packPath;
}
