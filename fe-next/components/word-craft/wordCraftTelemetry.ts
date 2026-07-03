/**
 * wordCraftTelemetry — thin PostHog wrapper for WordCraft mobile-redesign metrics.
 *
 * Mirror of `blastTelemetry`: fire-and-forget; errors from posthog.capture
 * (e.g. when PostHog isn't initialized in tests/SSR) are swallowed so gameplay
 * is never interrupted by analytics failures.
 *
 * Adoption metric for the redesign:
 *   word_craft_fast_tap_used / word_craft_turn_submitted ≥ 0.4 over 14 days
 * = the axis-lock fast-path landed.
 */
import posthog from '@/lib/analytics/lazyPosthog';
import { trackGameEnd } from '@/utils/growthTracking';
import type { WordCraftState } from '@/lib/word-craft/useWordCraftGame';

export type WordCraftAxis = 'h' | 'v';
export type WordCraftInputMethod = 'tap' | 'drag' | 'fast-tap' | 'mixed';

function safeCapture(event: string, payload: Record<string, unknown>): void {
  try {
    posthog.capture(event, payload);
  } catch {
    // swallow — analytics must not break the game loop
  }
}

/** Fired once when the dictionary finishes loading and the game is ready to play. */
export function trackWordCraftGameStarted(params: { locale: string }): void {
  safeCapture('word_craft_game_started', { ...params });
}

/** Fired when the player hits START on the pre-game setup screen. */
export function trackWordCraftSetupStart(params: {
  opponent: string;
  difficulty: string;
  modifier: string;
}): void {
  safeCapture('wordcraft_setup_start', { ...params });
}

/**
 * Fired when a player leaves word-craft mid-game (fewer than 3 player turns
 * completed). High rate = early abandonment / confusion signal.
 */
export function trackWordCraftAbandoned(params: {
  playerTurns: number;
  playerScore: number;
}): void {
  safeCapture('word_craft_abandoned', { ...params });
}

/** Fired the first time during a turn that 2 pending tiles establish an axis. */
export function trackWordCraftAxisLocked(params: {
  axis: WordCraftAxis;
  turnNumber: number;
  turnId: string;
}): void {
  safeCapture('word_craft_axis_locked', { ...params });
}

/** Fired each time the rack-tap fast-path drops a tile along the locked axis. */
export function trackWordCraftFastTapUsed(params: {
  turnId: string;
  tilesPlaced: number;
}): void {
  safeCapture('word_craft_fast_tap_used', { ...params });
}

/**
 * Fired when a drag drops on a cell that breaks the locked-axis line.
 * High rate here = the axis-lock heuristic is misreading player intent.
 */
export function trackWordCraftOffAxisDrop(params: { turnId: string }): void {
  safeCapture('word_craft_drag_dropped_off_axis', { ...params });
}

/** Fired when a single pending tile is recalled (strip × button or board tap). */
export function trackWordCraftPendingRecall(params: {
  turnId: string;
  source: 'strip' | 'board';
}): void {
  safeCapture('word_craft_pending_recall', { ...params });
}

/** Fired when the strip-header ✕ recall-all sweeps every pending tile. */
export function trackWordCraftRecallAll(params: {
  turnId: string;
  tilesRecalled: number;
}): void {
  safeCapture('word_craft_recall_all', { ...params });
}

/**
 * Fired on every successful turn submission. `inputMethod` is the dominant
 * gesture used for the placements committed in this turn — used as the
 * denominator for the fast-tap adoption ratio.
 */
export function trackWordCraftTurnSubmitted(params: {
  turnId: string;
  inputMethod: WordCraftInputMethod;
  tilesPlaced: number;
  score: number;
}): void {
  safeCapture('word_craft_turn_submitted', { ...params });
}

/**
 * Fired once when a WordCraft game ends. Routed through the shared trackGameEnd
 * so it persists to analytics_events (the admin game log's source) — WordCraft
 * previously emitted no completion event and was invisible in the admin log.
 *
 * A finished game is a played game regardless of outcome (completed=true); the
 * win/loss verdict rides in extras.isWinner. wordCount counts only the player's
 * own words (bot moves excluded).
 */
export function emitWordCraftGameEnd(
  state: WordCraftState,
  opts: { hotseat: boolean },
): void {
  const playerWordCount = state.history.reduce(
    (sum, h) => sum + (h.who === 'player' ? h.words.length : 0),
    0,
  );
  trackGameEnd('word-craft', state.player.score, playerWordCount, true, undefined, {
    isWinner: state.player.score > state.bot.score,
    hotseat: opts.hotseat,
  });
}
