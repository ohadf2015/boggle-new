/**
 * Word Tower — pure game logic (Phase 1, Solo MVP core).
 *
 * No socket, no DB, no React. Everything here is deterministic and unit-testable.
 * The server handler (wordTowerHandler.ts) and client store consume these functions.
 *
 * Design: docs/2026-05-21-word-tower-game-mode-spec.md
 */
import type { Language } from '@/shared/types/game';
import { normalizeWord, sanitizeWord } from '@/shared/utils/wordNormalization';
import { isValidWord } from '../dictionary';
import {
  WORD_TOWER_TRAY_SIZE,
  WORD_TOWER_MIN_WORD_LEN,
  WORD_TOWER_SCRAMBLES_START,
  WORD_TOWER_SCRAMBLES_MAX_BANKED,
  WORD_TOWER_SCRAMBLE_EARN_EVERY_M,
  WORD_TOWER_BASE_FLOOR_M,
  WORD_TOWER_LENGTH_BONUS_M,
  WORD_TOWER_COMBO_STEP,
  WORD_TOWER_COMBO_CAP,
  WORD_TOWER_COMBO_MULT_MAX,
  WORD_TOWER_HIGH_RISE_LEN,
  WORD_TOWER_SKYSCRAPER_LEN,
  WORD_TOWER_BOMB_CHARGE_BY_LEN,
  WORD_TOWER_BIOMES,
  WORD_TOWER_LETTER_BAGS,
  type WordTowerBiomeId,
} from '@/shared/constants/wordTowerConstants';

// --- deterministic RNG (same primitives as wheelRushManager) ---
function hashString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- canonical form for matching + chain comparison ---
/** Sanitize, normalize per language (sofit→regular, accent-strip), uppercase. */
function canon(word: string, language: Language): string {
  return normalizeWord(sanitizeWord(word, language), language).toUpperCase();
}

export function chainStartLetter(word: string, language: Language): string {
  return canon(word, language).charAt(0);
}
export function chainLetter(word: string, language: Language): string {
  const c = canon(word, language);
  return c.charAt(c.length - 1);
}

// --- tray generation (frequency-weighted, deterministic) ---
export function generateTray(
  gameCode: string,
  playerId: string,
  language: Language,
  drawIndex = 0,
  count: number = WORD_TOWER_TRAY_SIZE,
): string[] {
  const bag = [...(WORD_TOWER_LETTER_BAGS[language] || '')];
  if (bag.length === 0) return [];
  const rng = mulberry32(hashString(`word-tower-${gameCode}-${playerId}-${drawIndex}`));
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    out.push(bag[Math.floor(rng() * bag.length)]);
  }
  return out;
}

function pickAnchor(gameCode: string, playerId: string, language: Language): string {
  const bag = [...(WORD_TOWER_LETTER_BAGS[language] || '')];
  if (bag.length === 0) return '';
  const rng = mulberry32(hashString(`word-tower-${gameCode}-${playerId}-anchor`));
  return bag[Math.floor(rng() * bag.length)];
}

// --- buildability: word must be formable from the tray, with the anchor letter
//     providing exactly one free instance of the required start letter ---
export function isBuildable(
  word: string,
  tray: string[],
  anchorLetter: string,
  language: Language,
): boolean {
  const w = canon(word, language);
  const avail = new Map<string, number>();
  avail.set(anchorLetter, (avail.get(anchorLetter) || 0) + 1);
  for (const t of tray) avail.set(t, (avail.get(t) || 0) + 1);
  for (const ch of w) {
    const n = avail.get(ch) || 0;
    if (n <= 0) return false;
    avail.set(ch, n - 1);
  }
  return true;
}

function consumeFromTray(tray: string[], canonWord: string, anchorLetter: string): string[] {
  const need = new Map<string, number>();
  for (const ch of canonWord) need.set(ch, (need.get(ch) || 0) + 1);
  // Anchor supplies one instance of the start letter (it is not a tray tile).
  if ((need.get(anchorLetter) || 0) > 0) need.set(anchorLetter, need.get(anchorLetter)! - 1);
  const out: string[] = [];
  for (const t of tray) {
    const n = need.get(t) || 0;
    if (n > 0) need.set(t, n - 1);
    else out.push(t);
  }
  return out;
}

// --- scoring math ---
export function lengthBonusM(len: number): number {
  const key = len >= 8 ? 8 : len;
  return WORD_TOWER_LENGTH_BONUS_M[key] ?? 0;
}
export function comboMult(combo: number): number {
  return Math.min(WORD_TOWER_COMBO_MULT_MAX, 1 + Math.min(combo, WORD_TOWER_COMBO_CAP) * WORD_TOWER_COMBO_STEP);
}
export function floorMeters(len: number, combo: number): number {
  return WORD_TOWER_BASE_FLOOR_M + lengthBonusM(len) * comboMult(combo);
}

export type CelebrationTier = 'none' | 'highRise' | 'tall' | 'skyscraper';
export function celebrationTier(len: number): CelebrationTier {
  if (len >= WORD_TOWER_SKYSCRAPER_LEN) return 'skyscraper';
  if (len === WORD_TOWER_HIGH_RISE_LEN + 1) return 'tall';
  if (len === WORD_TOWER_HIGH_RISE_LEN) return 'highRise';
  return 'none';
}

export function bombChargeForLen(len: number): number {
  const key = len >= WORD_TOWER_SKYSCRAPER_LEN ? WORD_TOWER_SKYSCRAPER_LEN : len;
  return WORD_TOWER_BOMB_CHARGE_BY_LEN[key] ?? 0;
}

export function biomeForHeight(heightM: number): WordTowerBiomeId {
  let id: WordTowerBiomeId = WORD_TOWER_BIOMES[0].id;
  for (const b of WORD_TOWER_BIOMES) {
    if (heightM >= b.minM) id = b.id;
  }
  return id;
}

// --- state ---
export interface WordTowerFloor {
  word: string;
  len: number;
  meters: number;
}
export interface WordTowerPlayerState {
  gameCode: string;
  playerId: string;
  language: Language;
  floors: WordTowerFloor[];
  heightM: number;
  combo: number;
  /** Canonical letter the next word must start with. */
  anchorLetter: string;
  tray: string[];
  scramblesLeft: number;
  scramblesEarned: number;
  bombCharge: number;
  /** Monotonic counter so each tray draw uses a fresh deterministic seed. */
  trayDraws: number;
  usedWords: Set<string>;
  longestWord: string;
  longestCombo: number;
}

export interface InitOpts {
  gameCode: string;
  playerId: string;
  language: Language;
}

export function initWordTowerState(opts: InitOpts): WordTowerPlayerState {
  const { gameCode, playerId, language } = opts;
  return {
    gameCode,
    playerId,
    language,
    floors: [],
    heightM: 0,
    combo: 0,
    anchorLetter: pickAnchor(gameCode, playerId, language),
    tray: generateTray(gameCode, playerId, language, 0),
    scramblesLeft: WORD_TOWER_SCRAMBLES_START,
    scramblesEarned: 0,
    bombCharge: 0,
    trayDraws: 1,
    usedWords: new Set<string>(),
    longestWord: '',
    longestCombo: 0,
  };
}

export type ValidationError =
  | 'too_short'
  | 'bad_chain'
  | 'not_buildable'
  | 'duplicate'
  | 'not_in_dictionary';

export interface ValidationResult {
  accepted: boolean;
  error?: ValidationError;
}

export function validateTowerWord(state: WordTowerPlayerState, word: string): ValidationResult {
  const { language } = state;
  const w = canon(word, language);
  if (w.length < WORD_TOWER_MIN_WORD_LEN) return { accepted: false, error: 'too_short' };
  if (chainStartLetter(word, language) !== state.anchorLetter) return { accepted: false, error: 'bad_chain' };
  if (!isBuildable(word, state.tray, state.anchorLetter, language)) return { accepted: false, error: 'not_buildable' };
  if (state.usedWords.has(w)) return { accepted: false, error: 'duplicate' };
  if (isValidWord(sanitizeWord(word, language), language) !== true) return { accepted: false, error: 'not_in_dictionary' };
  return { accepted: true };
}

export interface ApplyResult {
  floorAdded: true;
  meters: number;
  combo: number;
  scramblesEarned: number;
  bombCharge: number;
  tier: CelebrationTier;
  heightM: number;
  biome: WordTowerBiomeId;
}

/** Apply an already-validated word. Returns a new state plus a result for FX/telemetry. */
export function applyTowerWord(
  state: WordTowerPlayerState,
  word: string,
): { state: WordTowerPlayerState; result: ApplyResult } {
  const { language } = state;
  const w = canon(word, language);
  const len = w.length;
  const combo = state.combo + 1;
  const meters = floorMeters(len, combo);
  const heightBefore = state.heightM;
  const heightM = heightBefore + meters;

  const earned =
    Math.floor(heightM / WORD_TOWER_SCRAMBLE_EARN_EVERY_M) -
    Math.floor(heightBefore / WORD_TOWER_SCRAMBLE_EARN_EVERY_M);
  const scramblesLeft = Math.min(WORD_TOWER_SCRAMBLES_MAX_BANKED, state.scramblesLeft + earned);

  const remaining = consumeFromTray(state.tray, w, state.anchorLetter);
  const refill = generateTray(
    state.gameCode,
    state.playerId,
    language,
    state.trayDraws,
    WORD_TOWER_TRAY_SIZE - remaining.length,
  );
  const tray = [...remaining, ...refill];

  const usedWords = new Set(state.usedWords);
  usedWords.add(w);

  const chargeGained = bombChargeForLen(len);

  const next: WordTowerPlayerState = {
    ...state,
    floors: [...state.floors, { word: w, len, meters }],
    heightM,
    combo,
    anchorLetter: chainLetter(word, language),
    tray,
    trayDraws: state.trayDraws + 1,
    scramblesLeft,
    scramblesEarned: state.scramblesEarned + earned,
    bombCharge: state.bombCharge + chargeGained,
    usedWords,
    longestWord: len > state.longestWord.length ? w : state.longestWord,
    longestCombo: Math.max(state.longestCombo, combo),
  };

  return {
    state: next,
    result: {
      floorAdded: true,
      meters,
      combo,
      scramblesEarned: earned,
      bombCharge: chargeGained,
      tier: celebrationTier(len),
      heightM,
      biome: biomeForHeight(heightM),
    },
  };
}

/** Reroll the whole tray. Costs one scramble and breaks the combo; anchor unchanged. */
export function scrambleTray(state: WordTowerPlayerState): WordTowerPlayerState {
  if (state.scramblesLeft <= 0) return state;
  const tray = generateTray(state.gameCode, state.playerId, state.language, state.trayDraws, WORD_TOWER_TRAY_SIZE);
  return {
    ...state,
    tray,
    trayDraws: state.trayDraws + 1,
    scramblesLeft: state.scramblesLeft - 1,
    combo: 0,
  };
}
