/**
 * Word Tower mode tunables. See docs/2026-05-21-word-tower-game-mode-spec.md (Appendix A).
 * All values are first-guess; balance pass happens in Phase 5 from PostHog telemetry.
 */
import type { Language } from '@/shared/types/game';

// --- Tray + scramble economy ---
export const WORD_TOWER_TRAY_SIZE = 12;
/**
 * Word-wheel size. The chain ("next word starts with the last letter") was
 * retired: the player now spells MANY words from one fixed ring of letters
 * (classic word-wheel), reusing the same tiles until they scramble for a fresh
 * ring. Seven reads cleanly around a dial and yields a rich buildable set.
 */
export const WORD_TOWER_WHEEL_SIZE = 7;
/** Guaranteed vowels in a freshly-spun wheel so it is virtually always solvable. */
export const WORD_TOWER_WHEEL_MIN_VOWELS = 2;
/** Max copies of any single letter in a freshly-spun wheel — caps "3 of the same
 *  letter" dud rings that waste slots and starve word variety (relaxed only when
 *  a language bag lacks enough distinct letters to satisfy it). */
export const WORD_TOWER_WHEEL_MAX_SAME = 2;
export const WORD_TOWER_MIN_WORD_LEN = 3;
/** Starting BONUS scramble allowance (a seed; climbing no longer refills it). */
export const WORD_TOWER_SCRAMBLES_START = 3;
export const WORD_TOWER_SCRAMBLES_MAX_BANKED = 5;
/** @deprecated 2026-06-26 — scrambles no longer rain from altitude. Kept so old
 *  save blobs / importers don't break; not read by the live earn path. */
export const WORD_TOWER_SCRAMBLE_EARN_EVERY_M = 25;
/** Coin price of a fresh wheel once banked bonus scrambles run out (buy path). */
export const WORD_TOWER_SCRAMBLE_COIN_COST = 30;

// --- Altitude / scoring ---
export const WORD_TOWER_BASE_FLOOR_M = 2.0;
/** Extra meters by word length (length -> bonus meters); 8+ uses the 8 key. */
export const WORD_TOWER_LENGTH_BONUS_M: Record<number, number> = {
  3: 0,
  4: 0.5,
  5: 1.5,
  6: 3,
  7: 5,
  8: 8,
};
/** comboMult = 1 + min(combo, CAP) * STEP, never exceeding MAX. */
export const WORD_TOWER_COMBO_STEP = 0.1;
export const WORD_TOWER_COMBO_CAP = 10;
export const WORD_TOWER_COMBO_MULT_MAX = 2.0;

// --- Celebration / bomb-charge ladder (by word length) ---
export const WORD_TOWER_HIGH_RISE_LEN = 5; // "High Rise" — burst + scramble + bomb tick
export const WORD_TOWER_SKYSCRAPER_LEN = 7; // "Skyscraper" — gold shower + full bomb charge
/** Bomb charge ticks earned per word of given length (5/6/7+). */
export const WORD_TOWER_BOMB_CHARGE_BY_LEN: Record<number, number> = {
  5: 1,
  6: 2,
  7: 4, // 7+ -> full bar (see WORD_TOWER_BOMB_CHARGE_PER_BAR)
};
export const WORD_TOWER_BOMB_CHARGE_PER_BAR = 4;

// --- Versus / bombs (Phase 4; defined now so tuning lives in one place) ---
export const WORD_TOWER_BOMB_LEAD_GATE_M = 15;
export const WORD_TOWER_BOMB_COOLDOWN_S = 20;
export const WORD_TOWER_BOMB_RECV_CAP_FLOORS_PER_MIN = 8;
export const WORD_TOWER_BOMB_MAX_BANKED = 2;
export const WORD_TOWER_BOMB_DAMAGE_MAX_FLOORS = 5;
export const WORD_TOWER_REBUILD_SHIELD_S = 2;
export const WORD_TOWER_VERSUS_MATCH_S = 180;

// --- Realtime broadcast ---
export const WORD_TOWER_STATE_BROADCAST_THROTTLE_MS = 300;

// --- Visual progression (biome lower-bound altitudes in meters) ---
export const WORD_TOWER_BIOMES = [
  { id: 'city', minM: 0 },
  { id: 'sky', minM: 50 },
  { id: 'stratosphere', minM: 150 },
  { id: 'orbit', minM: 300 },
  { id: 'nebula', minM: 500 },
  { id: 'galaxy', minM: 800 },
] as const;
export type WordTowerBiomeId = (typeof WORD_TOWER_BIOMES)[number]['id'];

/**
 * Per-language letter bags. Letters repeat in proportion to real-world
 * frequency, so a uniform draw from the bag is naturally weighted (Scrabble
 * tile-distribution approach). Hebrew uses regular (non-sofit) forms only;
 * Spanish omits accents (chain comparison normalizes them away). Japanese is a
 * functional common-hiragana bag for the v1 surface-character chain (kanji
 * reading-based chains are deferred — see spec §13).
 */
export const WORD_TOWER_LETTER_BAGS: Record<Language, string> = {
  en:
    'EEEEEEEEEEEE' +
    'AAAAAAAAA' +
    'IIIIIIIII' +
    'OOOOOOOO' +
    'NNNNNN' +
    'RRRRRR' +
    'TTTTTT' +
    'LLLL' +
    'SSSS' +
    'UUUU' +
    'DDDD' +
    'GGG' +
    'BB' +
    'CC' +
    'MM' +
    'PP' +
    'FF' +
    'HH' +
    'VV' +
    'WW' +
    'YY' +
    'KJXQZ',
  sv:
    'EEEEEEEEEE' +
    'AAAAAAAA' +
    'NNNNNN' +
    'RRRRRR' +
    'TTTTTT' +
    'SSSSSS' +
    'IIIIII' +
    'LLLL' +
    'DDDD' +
    'OOOO' +
    'MMM' +
    'GGG' +
    'KKK' +
    'VV' +
    'HH' +
    'FF' +
    'UU' +
    'PP' +
    'ÅÅ' +
    'ÄÄ' +
    'ÖÖ' +
    'BJ',
  es:
    'EEEEEEEEEE' +
    'AAAAAAAAAA' +
    'OOOOOOOO' +
    'SSSSSS' +
    'RRRRRR' +
    'NNNNNN' +
    'IIIIII' +
    'DDDD' +
    'LLLL' +
    'CCCC' +
    'TTTT' +
    'UUUU' +
    'MMM' +
    'PPP' +
    'BB' +
    'GG' +
    'VV' +
    'FF' +
    'HH' +
    'QQ' +
    'YJ' +
    'ZÑ',
  he:
    'יייייייי' +
    'וווווווו' +
    'הההההה' +
    'אאאאאא' +
    'ללללל' +
    'רררר' +
    'מממ' +
    'נננ' +
    'תתת' +
    'ששש' +
    'בבב' +
    'קק' +
    'דד' +
    'עע' +
    'חח' +
    'פפ' +
    'סס' +
    'גג' +
    'זטצ',
  ja:
    'いいいいい' +
    'うううう' +
    'んんん' +
    'かかか' +
    'しししし' +
    'たたた' +
    'てて' +
    'とと' +
    'なな' +
    'にに' +
    'のののの' +
    'はは' +
    'まま' +
    'もも' +
    'らら' +
    'りり' +
    'るる' +
    'れれ' +
    'おお' +
    'ささ' +
    'きき' +
    'くく',
  ru:
    'ОООООООООО' +
    'EEEEEEEEEE' +
    'AAAAAAAA' +
    'ИИИИИИИ' +
    'NNNNNN' +
    'РРРРРР' +
    'TTTTTT' +
    'LLLL' +
    'КККК' +
    'ММММ' +
    'ДДДД' +
    'ПППП' +
    'ВВВ' +
    'ГГГ' +
    'ЗЗ' +
    'ББ' +
    'СС' +
    'УУ' +
    'ЙХШЩЦЖФЭЮЯ',
  // Languages present in the Language union but not yet supported by Word Tower.
  fr: '',
  de: '',
};

/**
 * Per-language vowel set. A freshly-spun wheel is seeded with
 * {@link WORD_TOWER_WHEEL_MIN_VOWELS} of these so the small (7-letter) ring is
 * almost always solvable. Hebrew/Japanese list their vowel-like mater/kana so
 * the same guarantee holds; empty for unsupported languages.
 */
export const WORD_TOWER_VOWELS: Record<Language, string> = {
  en: 'AEIOU',
  sv: 'AEIOUYÅÄÖ',
  es: 'AEIOU',
  he: 'אהויע',
  ja: 'あいうえお',
  fr: 'AEIOU',
  de: 'AEIOU',
  ru: 'АЕИОУЫ',
};
