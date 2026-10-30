import type { WordWheelPuzzle } from '@/utils/dailyChallenge/wordWheelGeneration';
import type { WordCheck } from '../useWordWheelSubmit';
import type { WordWheelEffect } from '../WordWheelEffectsCanvas';
import type { RivalScore } from './useWheelRivals';
import type { WheelBreakdown } from '@/utils/dailyChallenge/wordWheelScoring';

export interface WordWheelGameResult {
  wordsFound: string[];
  score: number;
  timeSeconds: number;
  /** Bonus days only: how the score was built, and gold-letter coins earned. */
  breakdown?: WheelBreakdown;
  coins?: number;
}

export interface WordWheelGameProps {
  puzzle: WordWheelPuzzle;
  duration: number;
  onComplete: (result: WordWheelGameResult) => void;
  onValidateWord: (word: string) => Promise<WordCheck>;
  /** Synchronous dictionary answer (true/false when loaded, null when cold) so a release scores in-frame. */
  onQuickVerdict?: (word: string) => boolean | null;
  onEffect: (effect: WordWheelEffect) => void;
  language: string;
  paused?: boolean;
  /** Practice mode: suppress countdown timer + show manual "end practice" CTA. */
  practice?: boolean;
  /**
   * Suppress the practice coach tip without enabling practice
   * gameplay changes (timer off, etc.). Used by Quick Play arcade rounds.
   */
  hideModeCoach?: boolean;
  /**
   * Hide all competitive chrome — leaderboard fetch, rival pill, pass toasts,
   * the combo counter, and the game_started funnel event. Lets the practice
   * hub reuse the real wheel gameplay without the live-game social layer.
   */
  hideCompetitive?: boolean;
  /**
   * Caller-supplied rivals, replacing the daily-leaderboard fetch entirely.
   * Quick Play passes its ghost rivals here: the daily board is the wrong cohort
   * for a quick round (different puzzle, different duration). Supplying them
   * also re-enables the rival pill + pass toasts under `hideCompetitive`, which
   * otherwise switches the whole social layer off.
   */
  rivals?: RivalScore[];
  /** Fired with each accepted word, the running found list and the running score. */
  onWordFound?: (word: string, wordsFound: string[], score: number) => void;
  /** Combo multiplier and gold-letter scoring (bonus-dated dailies only). */
  bonuses?: boolean;
  /** Today's gold letter; only scores when `bonuses` is on. */
  goldLetter?: string | null;
  /**
   * The puzzle date being played (YYYY-MM-DD). Drives which day's leaderboard
   * the live rival pill reads from — on a catch-up replay this must be the
   * PAST date, not today, or the player sees today's rivals on yesterday's
   * board. Defaults to today when omitted.
   */
  puzzleDate?: string;
  /** Current player id — filtered out of rivals so a replay can't show "you" as the player to beat. */
  currentPlayerId?: string | null;
  /** Current guest fingerprint — same self-filter for unauthenticated players. */
  currentGuestFingerprint?: string | null;
  /**
   * Fired when the player taps the in-HUD exit affordance. The Word Wheel had
   * no exit control at all (the player was trapped mid-game — worst under RTL,
   * where there was no top-nav back button to fall back on); the parent owns the
   * quit-confirm dialog + navigation. Omit to hide the button.
   */
  onExit?: () => void;
}
