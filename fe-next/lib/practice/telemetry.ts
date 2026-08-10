/**
 * Practice-mode telemetry — thin wrapper over PostHog `capture` for the
 * practice tree. Stable `practice_*` event names + snake_case property keys.
 *
 * Why a wrapper:
 * - Single grep target (`trackPractice*`) for compliance audits.
 * - Lets the funnel "tile tap → started → word_found × N → completed → chain"
 *   become computable in PostHog (none of these existed before).
 * - Never throws — analytics must not break gameplay.
 *
 * Mirrors `lib/drills/telemetry.ts` shape on purpose so the two trees share
 * dashboard ergonomics.
 */

import posthog from '@/lib/analytics/lazyPosthog';
import logger from '@/utils/logger';
import { stampFirstWinClockStart } from '@/lib/retention/firstWin';
import { trackRetentionPlay } from '@/lib/retention/tracking';
import type { PracticeMode } from './practiceTutorialSteps';

type Capture = (event: string, props?: Record<string, unknown>) => void;

const safeCapture: Capture = (event, props) => {
  try {
    (posthog.capture as unknown as Capture)(event, props);
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      logger.debug('[practiceTelemetry] capture failed', { event, err });
    }
  }
};

interface ModeLocale {
  mode: PracticeMode;
  locale: string;
}

export function trackPracticeStarted(args: ModeLocale): void {
  // First-win-fast: practice is the FTUE's first game — start the clock so
  // `first_game_won` can carry time_to_first_win_sec.
  stampFirstWinClockStart();
  safeCapture('practice_started', {
    mode: args.mode,
    locale: args.locale,
  });
}

export interface PracticeWordFoundArgs extends ModeLocale {
  word: string;
  wordsFound: number;
}

export function trackPracticeWordFound(args: PracticeWordFoundArgs): void {
  safeCapture('practice_word_found', {
    mode: args.mode,
    locale: args.locale,
    word: args.word,
    words_found: args.wordsFound,
  });
}

export interface PracticeCompletedArgs extends ModeLocale {
  wordsFound: number;
  durationSeconds: number;
  /** Day-count of the practice streak after this completion (1+). */
  streakDay: number;
}

export function trackPracticeCompleted(args: PracticeCompletedArgs): void {
  safeCapture('practice_completed', {
    mode: args.mode,
    locale: args.locale,
    words_found: args.wordsFound,
    duration_seconds: args.durationSeconds,
    streak_day: args.streakDay,
  });

  // Practice completions ARE the FTUE win moment (riddle solved / goal hit,
  // confetti + popup). Record the activation + the daily streak here because
  // practice sandboxes don't route through trackGameEnd. Both are idempotent
  // per device / per day. Dynamic import avoids a module cycle with
  // utils/growthTracking (which imports the retention tracker).
  void import('@/utils/growthTracking')
    .then(({ markFirstGameActivation }) => {
      markFirstGameActivation({
        won: true,
        score: args.wordsFound,
        wordCount: args.wordsFound,
        mode: `practice_${args.mode}`,
      });
    })
    .catch(() => { /* activation best-effort */ });
  trackRetentionPlay({ mode: `practice_${args.mode}` });
}

export interface PracticeChainClickedArgs {
  fromMode: PracticeMode;
  /** null when the player has finished the chain (no next mode). */
  toMode: PracticeMode | null;
}

export function trackPracticeChainClicked(args: PracticeChainClickedArgs): void {
  safeCapture('practice_chain_clicked', {
    from_mode: args.fromMode,
    to_mode: args.toMode,
  });
}

export interface PracticeAbandonedArgs extends ModeLocale {
  /** Which surface the user was on when they left. */
  step: 'tutorial' | 'play';
  /** Seconds from mount to navigation-away — helps distinguish bounce vs engaged-drop. */
  secondsOnPage: number;
}

export function trackPracticeAbandoned(args: PracticeAbandonedArgs): void {
  safeCapture('practice_abandoned', {
    mode: args.mode,
    locale: args.locale,
    step: args.step,
    seconds_on_page: args.secondsOnPage,
  });
}

export function trackPracticeRetryClicked(args: ModeLocale): void {
  safeCapture('practice_retry_clicked', {
    mode: args.mode,
    locale: args.locale,
  });
}
