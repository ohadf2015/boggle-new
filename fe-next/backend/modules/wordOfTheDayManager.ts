/**
 * Word of the Day Manager
 * Manages daily word selection, attempt recording, and stats retrieval.
 * Uses seeded random based on date for deterministic daily word picks.
 */

import { getSupabase } from './supabaseServer';
import logger from '../utils/logger';

/**
 * Coins for the word-of-the-day award, paid when a signed-in player finds the
 * daily Word Wheel's golden word (server-checked in the wheel submit route).
 * Mirrors WOTD_BONUS in client coinManager.
 */
export const WOTD_COIN_REWARD = 50;

/** Curated word list — interesting, medium-length words suitable for all languages */
const WORD_POOL: string[] = [
  'crystal', 'garden', 'bridge', 'shadow', 'temple', 'forest', 'dragon', 'silver',
  'planet', 'frozen', 'castle', 'marble', 'throne', 'harbor', 'sunset', 'wizard',
  'beacon', 'riddle', 'anchor', 'shield', 'scroll', 'mystic', 'falcon', 'legend',
  'spirit', 'timber', 'orchid', 'voyage', 'prism', 'comet', 'pearl', 'raven',
  'blaze', 'coral', 'ember', 'frost', 'haven', 'ivory', 'jewel', 'karma',
  'lumen', 'maple', 'noble', 'oasis', 'pixel', 'quest', 'reign', 'solar',
  'torch', 'ultra', 'vivid', 'wrath', 'zephyr', 'abyss', 'bloom', 'cedar',
  'drift', 'eagle', 'flame', 'gleam', 'honor', 'index', 'jolly', 'knack',
  'lunar', 'mirth', 'nexus', 'omega', 'plume', 'quilt', 'roost', 'spine',
  'tidal', 'unity', 'vigor', 'whirl', 'yield', 'zodiac', 'atlas', 'brush',
  'chord', 'delta', 'epoch', 'fjord', 'glyph', 'helix', 'ionic', 'jinx',
  'kayak', 'lyric', 'mocha', 'niche', 'orbit', 'pulse', 'quartz', 'rustic',
  'siren', 'trove', 'umbra', 'vault', 'wraith', 'xenon', 'yonder', 'zenith',
  'bliss', 'charm', 'dusk', 'fable', 'grace', 'haste', 'kneel', 'latch',
  'mural', 'nerve', 'onset', 'pluck', 'realm', 'storm', 'twist', 'verge',
];

/**
 * Seeded pseudo-random number generator (deterministic per date string)
 */
function seededRandom(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32-bit integer
  }
  // Normalize to 0-1
  return Math.abs(hash % 10000) / 10000;
}

/**
 * Get today's date as YYYY-MM-DD string
 */
function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

export interface WotdResult {
  word: string;
  date: string;
  language: string;
  foundCount: number;
  totalPlayers: number;
}

/**
 * Get the Word of the Day for a given language and date.
 * Uses seeded random to pick deterministically from the word pool.
 */
export async function getWordOfTheDay(language: string, date?: string): Promise<WotdResult> {
  const targetDate = date || getTodayDate();
  const seed = `${targetDate}-${language}-wotd`;
  const index = Math.floor(seededRandom(seed) * WORD_POOL.length);
  const word = WORD_POOL[index];

  // Try to fetch existing stats from DB
  const supabase = getSupabase()!;
  let foundCount = 0;
  let totalPlayers = 0;

  try {
    const { data } = await supabase
      .from('daily_word_of_day')
      .select('found_count, total_players')
      .eq('date', targetDate)
      .eq('language', language)
      .single();

    if (data) {
      foundCount = data.found_count ?? 0;
      totalPlayers = data.total_players ?? 0;
    }
  } catch {
    logger.debug('WOTD', `No existing stats for ${targetDate}/${language}`);
  }

  return { word, date: targetDate, language, foundCount, totalPlayers };
}

// Export for testing
export { WORD_POOL, seededRandom, getTodayDate };
