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
  WORD_TOWER_WHEEL_SIZE,
  WORD_TOWER_WHEEL_MIN_VOWELS,
  WORD_TOWER_WHEEL_MAX_SAME,
  WORD_TOWER_MIN_WORD_LEN,
  WORD_TOWER_SCRAMBLES_START,
  WORD_TOWER_SCRAMBLES_MAX_BANKED,
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
  WORD_TOWER_VOWELS,
  type WordTowerBiomeId,
} from '@/shared/constants/wordTowerConstants';
import { mulberry32, fnv1aHash } from '@/lib/rng/seededRandom';
import {
  resolveTowerSubmitSurprise,
  initialTowerSurpriseSeed,
  type TowerSurpriseState,
  type ActiveTowerSurprise,
  type TowerSurpriseEvent,
} from './towerSurprise';

// --- deterministic RNG (imported from @/lib/rng/seededRandom) ---

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
  en: 'AEIOU', he: 'אהוי', sv: 'AEIOU', es: 'AEIOU', ja: '', fr: 'AEIOU', de: 'AEIOU', ru: 'АЕИОУЫ',
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
  const rng = mulberry32(fnv1aHash(`word-tower-${gameCode}-${playerId}-${drawIndex}`));
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    out.push(bag[Math.floor(rng() * bag.length)]);
  }
  return out;
}

/**
 * Spin a fresh word WHEEL: a small fixed ring of frequency-weighted letters the
 * player spells MANY words from (reused, not consumed) until they scramble. To
 * keep the small ring almost always solvable it is SEEDED with a guaranteed
 * minimum of vowels before the rest is drawn from the full bag, then shuffled
 * deterministically so the vowels aren't always in the same slots.
 */
export function generateWheel(
  gameCode: string,
  playerId: string,
  language: Language,
  drawIndex = 0,
  count: number = WORD_TOWER_WHEEL_SIZE,
  minVowels: number = WORD_TOWER_WHEEL_MIN_VOWELS,
): string[] {
  const bag = [...(WORD_TOWER_LETTER_BAGS[language] || '')];
  if (bag.length === 0) return [];
  const vowelSet = WORD_TOWER_VOWELS[language] || '';
  const vowelBag = bag.filter((c) => vowelSet.includes(c));
  const rng = mulberry32(fnv1aHash(`word-tower-wheel-${gameCode}-${playerId}-${drawIndex}`));
  const out: string[] = [];
  const counts = new Map<string, number>();
  const distinctBag = new Set(bag).size;
  const distinctVowels = new Set(vowelBag).size;
  // Draw one frequency-weighted letter from `source`, respecting the duplicate
  // cap when the source has enough DISTINCT letters to satisfy it (bounded
  // re-draws keep it deterministic + always terminating; a tiny bag falls back
  // to an uncapped draw so the ring still fills). Caps "3-of-a-kind" dud wheels.
  const drawCapped = (source: string[], distinct: number): string => {
    const capActive = distinct >= 2;
    for (let tries = 0; tries < 12 && capActive; tries++) {
      const c = source[Math.floor(rng() * source.length)];
      if ((counts.get(c) ?? 0) < WORD_TOWER_WHEEL_MAX_SAME) {
        counts.set(c, (counts.get(c) ?? 0) + 1);
        return c;
      }
    }
    const c = source[Math.floor(rng() * source.length)];
    counts.set(c, (counts.get(c) ?? 0) + 1);
    return c;
  };
  const wantVowels = vowelBag.length > 0 ? Math.min(minVowels, count) : 0;
  for (let i = 0; i < wantVowels; i++) out.push(drawCapped(vowelBag, distinctVowels));
  while (out.length < count) out.push(drawCapped(bag, distinctBag));
  // Fisher–Yates (seeded) so the guaranteed vowels land in varied positions.
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// --- daily wheel quality (#5): pick the ring that actually builds words ---
//
// The plain frequency draw can still hand out a wheel starved of makeable words
// (too many hard/duplicate letters). `pickBestWheel` scores a handful of
// deterministic candidate wheels against the real dictionary and keeps the one
// whose letters COVER the most distinct words — so every letter is usable and
// "words from all the letters" is possible. Coverage-max naturally rejects
// hard-letter-heavy rings, so no separate rare-letter cap is needed.

export interface WheelScore {
  /** Dictionary words (≥ minLen) buildable from the wheel (each tile ≤ once). */
  buildable: number;
  /** Distinct wheel letters used by at least one buildable word (0..wheel size). */
  coverage: number;
}

/**
 * Score a wheel against `dict` in a SINGLE pass: how many words it can build and
 * how many of its distinct letters are actually usable. Same canonical-form +
 * multiplicity rules as {@link isBuildable}.
 */
export function scoreWheel(dict: Iterable<string>, wheel: ReadonlyArray<string>, minLen: number): WheelScore {
  const avail = new Map<string, number>();
  for (const t of wheel) avail.set(t, (avail.get(t) ?? 0) + 1);
  const used = new Set<string>();
  let buildable = 0;
  for (const w of dict) {
    if (w.length < minLen) continue;
    const need = new Map<string, number>();
    let ok = true;
    for (const ch of w) {
      const n = (need.get(ch) ?? 0) + 1;
      need.set(ch, n);
      if (n > (avail.get(ch) ?? 0)) { ok = false; break; }
    }
    if (!ok) continue;
    buildable++;
    for (const ch of w) used.add(ch);
  }
  let coverage = 0;
  for (const t of new Set(wheel)) if (used.has(t)) coverage++;
  return { buildable, coverage };
}

/**
 * The best daily wheel: draw `candidates` deterministic wheels and keep the one
 * with the most letter COVERAGE (tie-broken by total buildable words). Falls
 * back to the plain drawIndex-0 wheel when no dictionary is available. Fully
 * deterministic for a given (gameCode, playerId, language, dict), so the daily
 * ring is identical for every player.
 */
export function pickBestWheel(
  gameCode: string,
  playerId: string,
  language: Language,
  dict?: Iterable<string> | null,
  opts: { candidates?: number; minLen?: number } = {},
): string[] {
  const { candidates = 8, minLen = WORD_TOWER_MIN_WORD_LEN } = opts;
  const base = generateWheel(gameCode, playerId, language, 0);
  if (!dict) return base;
  // A Set is re-iterable; an array is too. (An exhaustible iterator would be
  // consumed after the first candidate — daily callers pass the dictionary Set.)
  let best = base;
  let bestScore = scoreWheel(dict, base, minLen);
  for (let i = 1; i < candidates; i++) {
    const wheel = generateWheel(gameCode, playerId, language, i);
    const s = scoreWheel(dict, wheel, minLen);
    if (s.coverage > bestScore.coverage || (s.coverage === bestScore.coverage && s.buildable > bestScore.buildable)) {
      best = wheel;
      bestScore = s;
    }
  }
  return best;
}

// --- buildability: word must be formable from the wheel letters, each wheel
//     tile usable at most once per word (no chain anchor — the word stands on
//     its own letters). The wheel is REUSED across words, never consumed. ---
export function isBuildable(
  word: string,
  wheel: string[],
  language: Language,
): boolean {
  const w = canon(word, language);
  const avail = new Map<string, number>();
  for (const t of wheel) avail.set(t, (avail.get(t) || 0) + 1);
  for (const ch of w) {
    const n = avail.get(ch) || 0;
    if (n <= 0) return false;
    avail.set(ch, n - 1);
  }
  return true;
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
  /** Crane Stack drop quality applied to this floor's height (default 1). */
  placementMultiplier?: number;
  /** If a variable-reward surprise fired on the word that placed this floor, the
   *  event id — lets the renderer draw a special "surprise block" (gold, crystal,
   *  meteor…) so a cool moment leaves a permanent, visible mark on the tower.
   *  Deterministic (seeded upstream) + serialized, so a resumed/replayed run
   *  redraws the same special floors. Purely cosmetic — never affects height. */
  surprise?: TowerSurpriseEvent;
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
  // --- variable-reward (surprise) layer — see towerSurprise.ts. Optional so a
  //     run persisted before this layer shipped restores cleanly (defaulted on
  //     the first submit). Deterministic: seeded from gameCode, advanced per word. ---
  /** Deterministic LCG seed for the surprise roller. */
  surpriseSeed?: number;
  /** Accepted words since the last surprise (drives cooldown + pity). */
  wordsSinceSurprise?: number;
  /** Height multiplier banked by a prior updraft for the next word (1 = none). */
  nextWordHeightMult?: number;
}

export interface InitOpts {
  gameCode: string;
  playerId: string;
  language: Language;
  /**
   * @deprecated No-op since the chain was retired — there is no cold-open anchor
   * to protect any more (the wheel's guaranteed vowels keep the daily solvable).
   * Kept so existing daily callers compile unchanged.
   */
  avoidWeakAnchor?: boolean;
  /**
   * Canonical dictionary (Set). When present, the opening wheel is the best of
   * several candidates by word coverage (#5) instead of a plain frequency draw,
   * so the daily letters are always makeable. Omit to keep the plain draw.
   */
  dict?: Iterable<string> | null;
}

export function initWordTowerState(opts: InitOpts): WordTowerPlayerState {
  const { gameCode, playerId, language, dict } = opts;
  return {
    gameCode,
    playerId,
    language,
    floors: [],
    heightM: 0,
    combo: 0,
    // Chain retired: there is no required start letter, so the anchor is empty.
    // The field is kept (always '') for save/versus-prototype shape compatibility.
    anchorLetter: '',
    tray: pickBestWheel(gameCode, playerId, language, dict),
    scramblesLeft: WORD_TOWER_SCRAMBLES_START,
    scramblesEarned: 0,
    bombCharge: 0,
    trayDraws: 1,
    usedWords: new Set<string>(),
    longestWord: '',
    longestCombo: 0,
    heightHighWaterM: 0,
    firedHazards: new Set<string>(),
    surpriseSeed: initialTowerSurpriseSeed(gameCode),
    wordsSinceSurprise: 0,
    nextWordHeightMult: 1,
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
  // Chain retired — a word no longer has to start with any anchor letter; it only
  // has to be spellable from the wheel, unused, and real.
  if (!isBuildable(word, state.tray, language)) return { accepted: false, error: 'not_buildable' };
  if (state.usedWords.has(w)) return { accepted: false, error: 'duplicate' };
  if (!isInDictionary(w)) return { accepted: false, error: 'not_in_dictionary' };
  return { accepted: true };
}

/**
 * True when `word` (in any form) has already been placed this run — the SAME
 * dedup key {@link validateTowerWord} uses. Exposed so the crane's commit path
 * can re-check defensively: `hold` validates, but the drop (`commitPlacement`)
 * is otherwise an UNGUARDED apply, so a word committed by another path between
 * hold and drop could be re-placed ("the same word over and over"). The commit
 * re-runs this so a duplicate can never land twice.
 */
export function isTowerWordUsed(state: WordTowerPlayerState, word: string): boolean {
  return state.usedWords.has(canon(word, state.language));
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
  /** The variable-reward pop this word triggered (null on most words). Drives
   *  the HUD surprise banner + its sound. */
  surprise: ActiveTowerSurprise | null;
}

/** Apply an already-validated word. Returns a new state plus a result for FX/telemetry.
 *  `placementMultiplier` (default 1) scales the height granted — the Crane Stack
 *  layer feeds 0.3–1.4 here so a well-placed drop climbs farther. */
export function applyTowerWord(
  state: WordTowerPlayerState,
  word: string,
  placementMultiplier = 1,
): { state: WordTowerPlayerState; result: ApplyResult } {
  const { language } = state;
  const w = canon(word, language);
  const len = w.length;
  const combo = state.combo + 1;
  const baseMeters = floorMeters(len, combo) * placementMultiplier;

  // Variable-reward roll (deterministic). Resolved AFTER the base height so the
  // surprise bonus can scale off it; consumes any banked updraft multiplier.
  const prevSurprise: TowerSurpriseState = {
    surpriseSeed: state.surpriseSeed ?? initialTowerSurpriseSeed(state.gameCode),
    wordsSinceSurprise: state.wordsSinceSurprise ?? 0,
    nextWordHeightMult: state.nextWordHeightMult ?? 1,
    activeSurprise: null,
  };
  const surprise = resolveTowerSubmitSurprise(prevSurprise, {
    floorCount: state.floors.length,
    wordLen: len,
    combo,
    baseMeters,
  });

  const meters = baseMeters * surprise.appliedHeightMult + surprise.bonusMeters;
  const heightBefore = state.heightM;
  const heightM = heightBefore + meters;

  // Founder 2026-06-26: a new wheel is no longer FREE income from climbing —
  // climbing no longer rains scrambles. They are now EARNED bonuses (surprises /
  // wreck-compensation) or BOUGHT with coins (handled in the UI via coinManager).
  // So the only auto-grant left here is a surprise's bonus scrambles.
  const earned = 0;
  const scramblesLeft = Math.min(
    WORD_TOWER_SCRAMBLES_MAX_BANKED,
    state.scramblesLeft + surprise.bonusScrambles,
  );

  // The wheel is REUSED — letters are not consumed, so the ring stays put. The
  // player keeps spelling fresh words from it until they scramble for a new ring.
  const usedWords = new Set(state.usedWords);
  usedWords.add(w);

  const chargeGained = bombChargeForLen(len);

  const next: WordTowerPlayerState = {
    ...state,
    floors: [...state.floors, { word: w, len, meters, placementMultiplier, surprise: surprise.next.activeSurprise?.event }],
    heightM,
    combo,
    // No chain: the anchor stays empty; the wheel carries over unchanged.
    anchorLetter: '',
    tray: state.tray,
    scramblesLeft,
    scramblesEarned: state.scramblesEarned + earned + surprise.bonusScrambles,
    bombCharge: state.bombCharge + chargeGained,
    usedWords,
    longestWord: len > state.longestWord.length ? w : state.longestWord,
    longestCombo: Math.max(state.longestCombo, combo),
    heightHighWaterM: Math.max(state.heightHighWaterM, heightM),
    surpriseSeed: surprise.next.surpriseSeed,
    wordsSinceSurprise: surprise.next.wordsSinceSurprise,
    nextWordHeightMult: surprise.next.nextWordHeightMult,
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
      surprise: surprise.next.activeSurprise,
    },
  };
}

/**
 * Re-spin the wheel after the caller has already PAID for it (a coin purchase,
 * handled in the UI via coinManager). Breaks the combo (the price of a fresh
 * ring) but does NOT require or spend a banked bonus scramble. Pure.
 */
export function spinWheelPaid(state: WordTowerPlayerState): WordTowerPlayerState {
  const tray = generateWheel(state.gameCode, state.playerId, state.language, state.trayDraws);
  return {
    ...state,
    tray,
    trayDraws: state.trayDraws + 1,
    combo: 0,
  };
}

/** Spin a fresh wheel using a banked BONUS scramble (no-op if none left). */
export function scrambleTray(state: WordTowerPlayerState): WordTowerPlayerState {
  if (state.scramblesLeft <= 0) return state;
  return { ...spinWheelPaid(state), scramblesLeft: state.scramblesLeft - 1 };
}

/**
 * Spin a FREE fresh wheel — the dead-end escape. When the player has exhausted
 * (or can't see) the words in the current ring, this hands them a brand-new ring
 * at no scramble cost; the broken combo is the only price. When `isViable` is
 * supplied (the client passes a dictionary check) it retries until the new wheel
 * actually has buildable words, so it never re-strands the player.
 *
 * Named `rerollStart` for historical/import compatibility (it used to re-anchor
 * the chain); it now simply re-spins the wheel.
 */
export function rerollStart(
  state: WordTowerPlayerState,
  isViable?: (wheel: string[]) => boolean,
): WordTowerPlayerState {
  if ((WORD_TOWER_LETTER_BAGS[state.language] || '').length === 0) return state;
  let draw = state.trayDraws;
  let tray = state.tray;
  for (let attempt = 0; attempt < 16; attempt++) {
    const tr = generateWheel(state.gameCode, state.playerId, state.language, draw + 1);
    tray = tr;
    draw += 2;
    if (!isViable || isViable(tr)) break;
  }
  return { ...state, anchorLetter: '', tray, trayDraws: draw, combo: 0 };
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
 * (bomb / hurricane). Height drops by the lost floors' metres and the combo
 * breaks. The wheel is untouched (no chain to re-anchor). The high-water mark is
 * deliberately preserved so re-climbing can't farm scrambles. Pure — the scene
 * reconciles the shorter `floors` array by popping the missing tiles, which IS
 * the "your building was ruined" visual.
 */
export function damageTower(state: WordTowerPlayerState, floorsToRemove: number): DamageResult {
  const remove = Math.min(Math.max(0, Math.floor(floorsToRemove)), state.floors.length);
  if (remove === 0) return { state, removed: 0, metersLost: 0 };

  const cut = state.floors.length - remove;
  const kept = state.floors.slice(0, cut);
  const metersLost = state.floors.slice(cut).reduce((s, f) => s + f.meters, 0);
  const heightM = Math.max(0, state.heightM - metersLost);

  return {
    state: { ...state, floors: kept, heightM, combo: 0 },
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
  // Surprise (variable-reward) layer — MUST persist so a reloaded run rolls the
  // SAME surprises and reaches the SAME height (daily leaderboard integrity).
  // Optional: old blobs predate the layer and default safely on restore.
  surpriseSeed?: number;
  wordsSinceSurprise?: number;
  nextWordHeightMult?: number;
  // Persist the current wheel so a reload resumes the SAME daily letters instead
  // of drawing a fresh wheel every entry. Optional: old blobs fall back to a
  // fresh deterministic wheel.
  tray?: string[];
  // Keep the draw counter so the next scramble/scramble-paid uses the right seed.
  trayDraws?: number;
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
    surpriseSeed: state.surpriseSeed,
    wordsSinceSurprise: state.wordsSinceSurprise,
    nextWordHeightMult: state.nextWordHeightMult,
    tray: state.tray,
    trayDraws: state.trayDraws,
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
    // Chain retired: always empty, even when resuming a pre-wheel save whose blob
    // still carries a stale anchor letter (it must never prefix the built word).
    anchorLetter: '',
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
    // Surprise layer: carry the advanced seed + cooldown counter + banked updraft
    // so the next word rolls identically to a no-reload run. Old blobs (no fields)
    // fall back to base — a fresh seed from gameCode, counter 0, no charge.
    surpriseSeed: saved.surpriseSeed ?? base.surpriseSeed,
    wordsSinceSurprise: saved.wordsSinceSurprise ?? 0,
    nextWordHeightMult: saved.nextWordHeightMult ?? 1,
    // Persist the exact wheel (daily letters) and draw counter across reloads.
    // Old blobs without tray fall back to the deterministic base wheel.
    tray: saved.tray && saved.tray.length > 0 ? saved.tray : base.tray,
    trayDraws: saved.trayDraws ?? base.trayDraws,
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
