/**
 * Curated Sealed Bid rounds. Each rack is a real 7-letter anagram where a long
 * common word is the "obvious" bid the bot will make — picking it clashes, so
 * the player is nudged toward a less-obvious (but still valid) word. Every
 * `botPick` is formable from its `rack` (see sbEngine.canFormFromRack).
 *
 * English-only by design: this is an admin preview surface. The pool is read
 * directly by the page; the pure engine takes whatever rounds it is handed.
 */
import type { SbRound } from './sbEngine';

export const SEALED_BID_ROUNDS: SbRound[] = [
  { rack: 'TRAINED', botPick: 'TRAIN' },
  { rack: 'GARDENS', botPick: 'GARDEN' },
  { rack: 'MASTERY', botPick: 'MASTER' },
  { rack: 'PLANTER', botPick: 'PLANT' },
  { rack: 'BREATHS', botPick: 'BREATH' },
  { rack: 'CARPETS', botPick: 'CARPET' },
  { rack: 'STORMED', botPick: 'STORM' },
  { rack: 'FLOWERS', botPick: 'FLOWER' },
];

/**
 * Hebrew rounds. Stored in BASE-letter form (no sofit) because the engine,
 * `canFormFromRack`, and the `/api/dictionary/check?lang=he` lookup all operate
 * on the sofit-normalized base form. The UI applies final letters for display.
 * Each rack affords the obvious `botPick` plus less-obvious valid words so the
 * unique-bid incentive is real (all verified against the he dictionary list).
 */
export const SEALED_BID_ROUNDS_HE: SbRound[] = [
  { rack: 'שלומחת', botPick: 'שלומ' },  // שלום; alts: חלום, לחם, מלח
  { rack: 'ספרימת', botPick: 'מספר' },  // מספר; alts: ספר, פרס, תפר
  { rack: 'כלבימה', botPick: 'כלבימ' }, // כלבים; alts: מלך, כלים, הכל
  { rack: 'ארוחהת', botPick: 'ארוחה' }, // ארוחה (+ת for headroom); alts: אורח, רוח, תואר
  { rack: 'גדולימ', botPick: 'גדולימ' },// גדולים; alts: גדול, מגדל, דלי
  { rack: 'פרחימת', botPick: 'פרחימ' }, // פרחים; alts: פרח, פתח, מתח
];

/** Rounds per game session. */
export const ROUNDS_PER_GAME = 5;

/** The curated pool for a locale. Hebrew has its own rack set; every other
 *  locale falls back to the English pool (this is an admin preview surface). */
export function poolForLang(lang?: string): SbRound[] {
  return lang === 'he' ? SEALED_BID_ROUNDS_HE : SEALED_BID_ROUNDS;
}

/** Pick `count` distinct rounds at random for `lang` (page-side; tests pass rounds directly). */
export function pickRounds(count: number = ROUNDS_PER_GAME, lang?: string): SbRound[] {
  const shuffled = [...poolForLang(lang)];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, Math.min(count, shuffled.length));
}
