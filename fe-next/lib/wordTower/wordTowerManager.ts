/**
 * Word Tower — pure game logic (Phase 1, Solo MVP core).
 *
 * No socket, no DB, no React, no dictionary import. Everything here is
 * deterministic and unit-testable. Dictionary validation is INJECTED so the
 * same logic runs client-side (browser Set lookup) and server-side (backend
 * dictionary) without divergence — see validateTowerWord's `isInDictionary`.
 *
 * Design: docs/2026-05-21-word-tower-game-mode-spec.md
 */
import type { Language } from '@/shared/types/game';
import { normalizeWord, sanitizeWord } from '@/shared/utils/wordNormalization';
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

// Word-final letters that tend to strand the Shiritori chain (vowels / Hebrew
// matres lectionis). JA kana always end in a vowel sound, so the rule is off
// there (that IS shiritori).
const CHAIN_VOWELS: Record<Language, string> = {
  en: 'AEIOU', he: 'אהוי', sv: 'AEIOU', es: 'AEIOU', ja: '', fr: 'AEIOU', de: 'AEIOU',
};

/**
 * The letter the NEXT word must start with. Normally the last letter; but if the
 * word ends in a vowel (a frequent dead-end), the chain falls back to the letter
 * BEFORE it — founder's rule, so a vowel ending never strands the player.
 */
export function nextChainAnchor(word: string, language: Language): string {
  const c = canon(word, language);
  const last = c.charAt(c.length - 1);
  const vowels = CHAIN_VOWELS[language] || '';
  // Vowel ending → the next word starts with the letter BEFORE it AND the vowel
  // (a 2-char anchor), keeping the vowel in the chain. Else just the last letter.
  if (vowels.includes(last) && c.length >= 2) return c.slice(c.length - 2);
  return last;
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
  // The anchor (1 or 2 chars) supplies its letters free — they're the shared connector.
  for (const ach of anchorLetter) avail.set(ach, (avail.get(ach) || 0) + 1);
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
  // The anchor (1 or 2 chars) supplies its letters free (not tray tiles).
  for (const ach of anchorLetter) { const n = need.get(ach) || 0; if (n > 0) need.set(ach, n - 1); }
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
  /** Highest altitude ever reached this run. Scramble-earning is gated on this
   *  (not the live height) so re-climbing after a hazard knockback can't farm
   *  free scrambles. Never decreases. */
  heightHighWaterM: number;
  /** Ids of environmental hazards already triggered this run (fire once each). */
  firedHazards: Set<string>;
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
    heightHighWaterM: 0,
    firedHazards: new Set<string>(),
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

/**
 * @param isInDictionary predicate receiving the CANONICAL (sanitized, normalized,
 *   uppercased) word. Client: `(w) => dictSet.has(w)`. Server: `(w) => backendLookup(w, lang)`.
 */
export function validateTowerWord(
  state: WordTowerPlayerState,
  word: string,
  isInDictionary: (canonWord: string) => boolean,
): ValidationResult {
  const { language } = state;
  const w = canon(word, language);
  if (w.length < WORD_TOWER_MIN_WORD_LEN) return { accepted: false, error: 'too_short' };
  if (!canon(word, language).startsWith(state.anchorLetter)) return { accepted: false, error: 'bad_chain' };
  if (!isBuildable(word, state.tray, state.anchorLetter, language)) return { accepted: false, error: 'not_buildable' };
  if (state.usedWords.has(w)) return { accepted: false, error: 'duplicate' };
  if (!isInDictionary(w)) return { accepted: false, error: 'not_in_dictionary' };
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

  // Earn scrambles only for NEW altitude above the run's high-water mark, so a
  // hazard knockback + re-climb can't repeatedly farm the same 25m boundary.
  const earnBase = Math.max(heightBefore, state.heightHighWaterM);
  const earned = Math.max(
    0,
    Math.floor(heightM / WORD_TOWER_SCRAMBLE_EARN_EVERY_M) -
      Math.floor(earnBase / WORD_TOWER_SCRAMBLE_EARN_EVERY_M),
  );
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
    anchorLetter: nextChainAnchor(word, language),
    tray,
    trayDraws: state.trayDraws + 1,
    scramblesLeft,
    scramblesEarned: state.scramblesEarned + earned,
    bombCharge: state.bombCharge + chargeGained,
    usedWords,
    longestWord: len > state.longestWord.length ? w : state.longestWord,
    longestCombo: Math.max(state.longestCombo, combo),
    heightHighWaterM: Math.max(state.heightHighWaterM, heightM),
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

/**
 * Escape a dead-end chain. Shiritori forces the next word to start with the
 * previous word's last letter — a word ending in a low-yield letter (Hebrew
 * ו/ה, English vowels) can strand the player with zero buildable words and no
 * way out (scramble keeps the anchor). This picks a FRESH anchor + tray to begin
 * a new chain link, breaking the combo. When `isViableAnchor` is supplied (the
 * client passes a dictionary check) it retries until the new anchor actually has
 * buildable words, so it never re-strands you. Free — the broken combo is the
 * only cost.
 */
export function rerollStart(
  state: WordTowerPlayerState,
  isViableAnchor?: (anchor: string, tray: string[]) => boolean,
): WordTowerPlayerState {
  const bag = [...(WORD_TOWER_LETTER_BAGS[state.language] || '')];
  if (bag.length === 0) return state;
  let draw = state.trayDraws;
  let anchorLetter = state.anchorLetter;
  let tray = state.tray;
  for (let attempt = 0; attempt < 16; attempt++) {
    const a = bag[Math.floor(mulberry32(hashString(`word-tower-${state.gameCode}-${state.playerId}-reanchor-${draw}`))() * bag.length)];
    const tr = generateTray(state.gameCode, state.playerId, state.language, draw + 1, WORD_TOWER_TRAY_SIZE);
    anchorLetter = a;
    tray = tr;
    draw += 2;
    if (!isViableAnchor || isViableAnchor(a, tr)) break;
  }
  return { ...state, anchorLetter, tray, trayDraws: draw, combo: 0 };
}

export interface DamageResult {
  state: WordTowerPlayerState;
  /** Floors actually toppled (clamped to what existed). */
  removed: number;
  /** Altitude (m) lost — the sum of the toppled floors' metres. */
  metersLost: number;
}

/**
 * Environmental hazard hit: topple the top `floorsToRemove` floors off the tower
 * (bomb / hurricane). Height drops by the lost floors' metres, the combo breaks,
 * and the chain re-anchors to whatever floor is now on top (a fresh anchor if the
 * tower is emptied). The high-water mark is deliberately preserved so re-climbing
 * can't farm scrambles. Pure — the scene reconciles the shorter `floors` array by
 * popping the missing tiles, which IS the "your building was ruined" visual.
 */
export function damageTower(state: WordTowerPlayerState, floorsToRemove: number): DamageResult {
  const remove = Math.min(Math.max(0, Math.floor(floorsToRemove)), state.floors.length);
  if (remove === 0) return { state, removed: 0, metersLost: 0 };

  const cut = state.floors.length - remove;
  const kept = state.floors.slice(0, cut);
  const metersLost = state.floors.slice(cut).reduce((s, f) => s + f.meters, 0);
  const heightM = Math.max(0, state.heightM - metersLost);
  const anchorLetter = kept.length > 0
    ? nextChainAnchor(kept[kept.length - 1]!.word, state.language)
    : pickAnchor(state.gameCode, state.playerId, state.language);

  return {
    state: { ...state, floors: kept, heightM, combo: 0, anchorLetter },
    removed: remove,
    metersLost,
  };
}

// --- persistence (Phase 2): serialize a compact, versioned save blob and
//     restore from it. Tray is NOT persisted — it is regenerated fresh on
//     resume (ephemeral). floors/usedWords are capped to keep the blob small;
//     past the usedWords cap, very old words may be re-used — known minor
//     dedup hole for Solo Endless (see spec §13). ---
export const WORD_TOWER_SAVE_VERSION = 1;
const SAVE_FLOORS_CAP = 50;
const SAVE_USED_WORDS_CAP = 200;

export interface WordTowerSaveState {
  version: number;
  anchorLetter: string;
  combo: number;
  scramblesLeft: number;
  bombCharge: number;
  heightM: number;
  floorsCount: number;
  longestWord: string;
  longestCombo: number;
  floors: WordTowerFloor[];
  usedWords: string[];
  /** Optional (added without a version bump — old blobs default safely). */
  heightHighWaterM?: number;
  firedHazards?: string[];
}

export function serializeWordTowerState(state: WordTowerPlayerState): WordTowerSaveState {
  return {
    version: WORD_TOWER_SAVE_VERSION,
    anchorLetter: state.anchorLetter,
    combo: state.combo,
    scramblesLeft: state.scramblesLeft,
    bombCharge: state.bombCharge,
    heightM: state.heightM,
    floorsCount: state.floors.length,
    longestWord: state.longestWord,
    longestCombo: state.longestCombo,
    floors: state.floors.slice(-SAVE_FLOORS_CAP),
    usedWords: [...state.usedWords].slice(-SAVE_USED_WORDS_CAP),
    heightHighWaterM: state.heightHighWaterM,
    firedHazards: [...state.firedHazards],
  };
}

export function restoreWordTowerState(
  opts: InitOpts,
  saved: WordTowerSaveState | null | undefined,
): WordTowerPlayerState {
  const base = initWordTowerState(opts);
  if (!saved || saved.version !== WORD_TOWER_SAVE_VERSION) return base;
  return {
    ...base,
    heightM: Math.max(0, saved.heightM ?? 0),
    combo: Math.max(0, saved.combo ?? 0),
    anchorLetter: saved.anchorLetter || base.anchorLetter,
    scramblesLeft: Math.max(0, saved.scramblesLeft ?? base.scramblesLeft),
    bombCharge: Math.max(0, saved.bombCharge ?? 0),
    floors: Array.isArray(saved.floors) ? saved.floors : [],
    usedWords: new Set(saved.usedWords ?? []),
    longestWord: saved.longestWord ?? '',
    longestCombo: Math.max(0, saved.longestCombo ?? 0),
    // Old (v1) blobs lack these: default the high-water to the saved height (so a
    // resumed run still can't farm below it) and an empty fired-hazard set.
    heightHighWaterM: Math.max(0, saved.heightHighWaterM ?? saved.heightM ?? 0),
    firedHazards: new Set(saved.firedHazards ?? []),
  };
}

/**
 * Live client-renderable view of a tower (INCLUDES the tray, unlike the
 * persistence blob). Sent over the socket so a versus client can render the
 * tray + anchor + meters without exposing internal fields.
 */
export interface TowerClientView {
  tray: string[];
  anchorLetter: string;
  scramblesLeft: number;
  heightM: number;
  combo: number;
  floors: number;
  bombCharge: number;
}

export function clientTowerView(s: WordTowerPlayerState): TowerClientView {
  return {
    tray: s.tray,
    anchorLetter: s.anchorLetter,
    scramblesLeft: s.scramblesLeft,
    heightM: s.heightM,
    combo: s.combo,
    floors: s.floors.length,
    bombCharge: s.bombCharge,
  };
}
