/**
 * Per-mode RULES — pure data, one row per mode, read by the start handler,
 * the scoring engine and the results builder. Behaviour (round setup, payload
 * fields, results summary) lives in the per-mode modules under ./ ; this table
 * stays import-free so the scoring engine can read it without pulling in any
 * mode machinery.
 */

import type { GameMode, Language } from '@/shared/types';
import { BLAST_MP_DEFAULT_TIMER, DEFAULT_TIMER } from '@/shared/constants/gameConstants';
import { WHEEL_RUSH_DURATION_SEC } from '@/shared/constants/wheelRushConstants';
import { WORD_TOWER_VERSUS_MATCH_S } from '@/shared/constants/wordTowerConstants';

export interface GameModeRules {
  /** Round length when the host supplied none. */
  defaultTimerSec: number;
  /**
   * Event-driven modes: the room timer is only a backstop sized to the mode's
   * natural max length, so the host's grid-game timer can't guillotine a match.
   */
  fixedTimerSec?: number;
  /** Board size override (Blast keeps its tile economy on 6x6). */
  gridSize?: { rows: number; cols: number };
  /** Beta (in-work) mode: host must be admin/beta tester. Name used in the refusal. */
  betaName?: string;
  /** Beta modes with curated content only in some languages. */
  languages?: Language[];
  /** Invite-a-human modes: no bot auto-fill (bots have no move logic there). */
  humanOnly: boolean;
  /** Classic round events + rush tiles (2+ players). */
  roundEvents: boolean;
  /** Everyone may bank the same word at full value (no duplicate halving). */
  duplicatesAllowed: boolean;
  /** Results-time rarity multiplier (off where the mode already encodes rarity). */
  rarityScoring: boolean;
}

const BOARD: GameModeRules = {
  defaultTimerSec: DEFAULT_TIMER,
  humanOnly: false,
  roundEvents: false,
  duplicatesAllowed: false,
  rarityScoring: true,
};

export const GAME_MODE_RULES: Record<GameMode, GameModeRules> = {
  classic: { ...BOARD, roundEvents: true },
  // Tile bonuses already reward unique paths.
  blast: { ...BOARD, defaultTimerSec: BLAST_MP_DEFAULT_TIMER, gridSize: { rows: 6, cols: 6 }, rarityScoring: false },
  // Finding the same board words as opponents is fine — the goal is the target.
  'word-hunt': { ...BOARD, duplicatesAllowed: true },
  // Lock-free parallel discovery: first-finder bonus + repeat factor encode rarity.
  'wheel-rush': { ...BOARD, defaultTimerSec: WHEEL_RUSH_DURATION_SEC, duplicatesAllowed: true, rarityScoring: false },
  'word-tower': { ...BOARD, betaName: 'Word Tower', fixedTimerSec: WORD_TOWER_VERSUS_MATCH_S, humanOnly: true },
  // Generous race cap (a 5x5 can take minutes).
  crossword: { ...BOARD, betaName: 'Crossword', fixedTimerSec: 420, humanOnly: true, languages: ['en', 'he', 'sv', 'ja', 'es'] },
  // Per-student lesson-dealt race: 5min clock, no classic bots, shared list
  // words bank at full value for everyone who crafts them.
  wordcraft: { ...BOARD, defaultTimerSec: 300, humanOnly: true, duplicatesAllowed: true, rarityScoring: false },
};

export function getGameModeRules(mode: string | null | undefined): GameModeRules {
  return GAME_MODE_RULES[(mode || 'classic') as GameMode] ?? GAME_MODE_RULES.classic;
}

/** Duplicate halving is off in big rooms (>7 players) and in modes that allow shared words. */
export function isDuplicateRuleDisabled(mode: string | null | undefined, playerCount: number): boolean {
  return playerCount > 7 || getGameModeRules(mode).duplicatesAllowed;
}
