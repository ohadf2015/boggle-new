/**
 * PostHog Engagement Helpers
 *
 * Focused utilities for deeper engagement analytics beyond basic funnels:
 * - Super properties (attached to every event)
 * - User (person) properties — $set, $set_once, increment
 * - Typed event helpers for behavioral signals (word_found, rage_quit, etc.)
 * - Dead-time detector (surfaces confusion / AFK players)
 * - Tab visibility tracker (attention-time signal)
 *
 * All functions no-op gracefully if PostHog isn't initialized or consent
 * hasn't been granted — never throws, never blocks gameplay.
 *
 * Privacy: never send raw user-typed content (words). Send length + shape only.
 */

import posthog from '@/lib/analytics/lazyPosthog';
import logger from '@/utils/logger';

// ---------- Safe wrapper ----------

type PHFn = (...args: unknown[]) => unknown;

function safe<T>(fn: () => T): T | undefined {
  try {
    return fn();
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      logger.debug('[posthogEngagement] call failed', err);
    }
    return undefined;
  }
}

// ---------- Super properties ----------

/** Register properties attached to every future event this session. */
export function setPostHogSuperProps(props: Record<string, unknown>): void {
  safe(() => (posthog.register as PHFn)(props));
}

/** Register properties attached to every event — but only if not already set. */
export function setPostHogSuperPropsOnce(props: Record<string, unknown>): void {
  safe(() => (posthog.register_once as PHFn)(props));
}

// ---------- User (person) properties ----------

/**
 * Set person properties ($set) — always overwrites. Use for "current state"
 * fields like last_played_at, preferred_mode, current_streak.
 */
export function setPostHogUserProps(props: Record<string, unknown>): void {
  safe(() => (posthog.people?.set as PHFn | undefined)?.(props));
}

/**
 * Set person properties only on first write ($set_once). Use for "first ever"
 * fields like first_mode_played, acquisition_date, first_locale.
 */
export function setPostHogUserPropsOnce(props: Record<string, unknown>): void {
  safe(() => (posthog.people?.set_once as PHFn | undefined)?.(props));
}

/**
 * Increment a person property. PostHog's JS SDK doesn't expose a typed
 * increment helper — we use the documented `$set` capture with a
 * `$add` operator as the canonical pattern. The `$set_once` mirror
 * seeds the counter on the first call so later `$add` calls accumulate.
 */
export function incrementPostHogUserProp(key: string, by: number = 1): void {
  safe(() => {
    (posthog.capture as PHFn)('$set', {
      $set: { [`${key}_last_inc_at`]: new Date().toISOString() },
      $set_once: { [key]: 0 },
      $add: { [key]: by },
    });
  });
}

// ---------- Typed event helpers ----------

/**
 * A word was successfully found. We never send the raw word (privacy).
 * `timeSinceLastWordMs` surfaces "flow state" — short gaps = engaged rhythm.
 */
export function trackWordFound(args: {
  word: string;
  mode: string;
  timeSinceLastWordMs?: number;
  score?: number;
}): void {
  safe(() =>
    (posthog.capture as PHFn)('word_found', {
      word_length: args.word.length,
      mode: args.mode,
      time_since_last_word_ms: args.timeSinceLastWordMs,
      score: args.score,
    })
  );
}

/**
 * An invalid word was attempted — frustration signal. Reason helps
 * distinguish "typo" vs "player doesn't know the rules".
 */
export function trackInvalidWord(args: {
  mode: string;
  reason: 'not_in_dictionary' | 'too_short' | 'already_found' | 'invalid_path' | 'other';
  attemptLength: number;
}): void {
  safe(() =>
    (posthog.capture as PHFn)('invalid_word_attempted', {
      mode: args.mode,
      reason: args.reason,
      attempt_length: args.attemptLength,
    })
  );
}

/**
 * Player abandoned a game within ~15s of starting — strong signal of
 * onboarding friction or mismatched expectations for this mode.
 */
export function trackRageQuit(args: {
  mode: string;
  durationMs: number;
  wordsFound: number;
}): void {
  safe(() =>
    (posthog.capture as PHFn)('rage_quit', {
      mode: args.mode,
      duration_ms: args.durationMs,
      words_found: args.wordsFound,
    })
  );
}

/** Adventure level retried — surfaces difficulty spikes. */
export function trackLevelRetried(args: {
  world: number;
  level: number;
  attempt: number;
}): void {
  safe(() =>
    (posthog.capture as PHFn)('level_retried', {
      world: args.world,
      level: args.level,
      attempt: args.attempt,
    })
  );
}

/** Which modals / prompts are users dismissing and how. */
export function trackModalDismissed(args: {
  modalId: string;
  method: 'backdrop' | 'close_button' | 'escape_key' | 'cta' | 'auto';
}): void {
  safe(() =>
    (posthog.capture as PHFn)('modal_dismissed', {
      modal_id: args.modalId,
      method: args.method,
    })
  );
}

/** Room-list card tapped to join a public MP room. */
export function trackMpRoomJoinClicked(args: { gameMode: string }): void {
  safe(() =>
    (posthog.capture as PHFn)('mp_room_join_clicked', {
      game_mode: args.gameMode,
    })
  );
}

/** A room-card tap was suppressed because a join was already in flight —
 *  the rage-click signal this guard exists to kill. Non-zero volume here
 *  means players are still tapping through the disabled state. */
export function trackMpRoomJoinBlocked(args: { gameMode: string }): void {
  safe(() =>
    (posthog.capture as PHFn)('mp_room_join_blocked', {
      game_mode: args.gameMode,
    })
  );
}

/** MP drag-FTUE lifecycle: shown when 20s idle hits; dismissed when user
 *  taps the close button, hits Esc, or any pointer activity / first word. */
export function trackMpFtue(args: {
  event: 'shown' | 'dismissed';
  mode: string;
  reason?: 'activity' | 'first_word' | 'manual' | 'timeout';
}): void {
  safe(() =>
    (posthog.capture as PHFn)(args.event === 'shown' ? 'mp_ftue_shown' : 'mp_ftue_dismissed', {
      mode: args.mode,
      reason: args.reason,
    })
  );
}

/** MP stuck-player coach: fires when one of the four help stages is shown.
 *  Pairs with trackMpStuckCoachOutcome to answer "did the help work?". */
export function trackMpStuckCoachShown(args: {
  stage: string;
  gamesPlayed: number;
  isDesktop: boolean;
}): void {
  safe(() =>
    (posthog.capture as PHFn)('mp_stuck_coach_shown', {
      stage: args.stage,
      mode: 'classic',
      games_played: args.gamesPlayed,
      is_desktop: args.isDesktop,
    })
  );
}

/** MP stuck-player coach outcome — the real "how did the player react" signal.
 *  helped = a valid word landed within the show window; dismissed = manual close;
 *  ignored = auto-hidden with no valid word. ms_to_valid present only when helped. */
export function trackMpStuckCoachOutcome(args: {
  stage: string;
  outcome: 'helped' | 'dismissed' | 'ignored';
  msToValid?: number;
}): void {
  safe(() =>
    (posthog.capture as PHFn)('mp_stuck_coach_outcome', {
      stage: args.stage,
      mode: 'classic',
      outcome: args.outcome,
      ms_to_valid: args.msToValid,
    })
  );
}

/** Solo-host "play vs bots" rescue prompt — the surface that counters the dominant
 *  MP pre-game drop (solo host abandons the empty lobby). `shown` fires once when an
 *  alone host first sees it; `clicked` when they take the bot-start. The shown→clicked
 *  →game_started funnel is the fast read of whether the prompt works (aggregate
 *  waiting-drops are ~5-8/day, too noisy to read success off directly). */
export function trackSoloPlayPrompt(args: {
  event: 'shown' | 'clicked';
  lobbyWaitSec?: number;
  auto_filled?: boolean;
}): void {
  safe(() =>
    (posthog.capture as PHFn)(
      args.event === 'shown' ? 'mp_solo_prompt_shown' : 'mp_solo_prompt_play_vs_bots',
      {
        mode: 'classic',
        lobby_wait_sec: args.lobbyWaitSec,
        auto_filled: args.auto_filled,
      }
    )
  );
}

/** CTA click with location — lets you build click-through funnels per surface. */
export function trackCtaClicked(args: {
  ctaId: string;
  location: string;
  metadata?: Record<string, unknown>;
}): void {
  safe(() =>
    (posthog.capture as PHFn)('cta_clicked', {
      cta_id: args.ctaId,
      location: args.location,
      ...args.metadata,
    })
  );
}

/**
 * Fires only at milestone session depths (3, 5, 10, 20). This signals
 * binge sessions — the most valuable engagement behavior to understand.
 */
const SESSION_DEPTH_MILESTONES = [3, 5, 10, 20] as const;
export function trackSessionDepth(gameNumber: number): void {
  if (!SESSION_DEPTH_MILESTONES.includes(gameNumber as (typeof SESSION_DEPTH_MILESTONES)[number])) {
    return;
  }
  safe(() =>
    (posthog.capture as PHFn)('session_depth_milestone', {
      games_this_session: gameNumber,
    })
  );
}

// ---------- Dead-time detector ----------

/**
 * Fires `dead_time_detected` after `thresholdMs` of no recorded activity.
 * Call `.recordActivity()` on every meaningful interaction; call `.stop()`
 * when the game ends. Surfaces confusion / AFK / cognitive overload.
 */
export function createDeadTimeDetector(opts: { thresholdMs: number; mode: string }): {
  start: () => void;
  stop: () => void;
  recordActivity: () => void;
} {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastActivity = Date.now();
  let running = false;

  const arm = () => {
    if (timer) clearTimeout(timer);
    if (!running) return;
    timer = setTimeout(() => {
      if (!running) return;
      const idleMs = Date.now() - lastActivity;
      safe(() =>
        (posthog.capture as PHFn)('dead_time_detected', {
          mode: opts.mode,
          idle_ms: idleMs,
        })
      );
      // Re-arm so long idle periods fire repeatedly at the threshold cadence
      arm();
    }, opts.thresholdMs);
  };

  return {
    start() {
      running = true;
      lastActivity = Date.now();
      arm();
    },
    stop() {
      running = false;
      if (timer) clearTimeout(timer);
      timer = null;
    },
    recordActivity() {
      lastActivity = Date.now();
      if (running) arm();
    },
  };
}

// ---------- Platform detection ----------

export type EngagementPlatform = 'crazygames' | 'poki' | 'android' | 'ios' | 'web';

/**
 * Detects the runtime platform for slicing PostHog cohorts. CrazyGames uses
 * `window.__crazyGamesEnvironment` set by the SDK provider on first paint.
 * Poki injects `window.PokiSDK` (portal build via VITE_PORTAL=poki, or the
 * SDK script tag); the document.referrer check catches a plain iframe embed
 * on poki.com before the SDK finishes loading. Capacitor sets
 * `window.Capacitor` on native shells. Everything else = web.
 */
export function detectPlatform(): EngagementPlatform {
  if (typeof window === 'undefined') return 'web';
  try {
    if ((window as { __crazyGamesEnvironment?: string }).__crazyGamesEnvironment === 'crazygames') {
      return 'crazygames';
    }
  } catch { /* noop */ }
  try {
    if ((window as { PokiSDK?: unknown }).PokiSDK) {
      return 'poki';
    }
    const refHost = document.referrer ? new URL(document.referrer).hostname : '';
    if (/(^|\.)poki\.com$/i.test(refHost)) {
      return 'poki';
    }
  } catch { /* noop */ }
  try {
    const cap = (window as { Capacitor?: { isNativePlatform?: () => boolean; getPlatform?: () => string } }).Capacitor;
    if (cap?.isNativePlatform?.()) {
      const p = cap.getPlatform?.();
      if (p === 'ios') return 'ios';
      return 'android';
    }
  } catch { /* noop */ }
  return 'web';
}

// ---------- First-minute survival (CrazyGames ranking signal) ----------

/**
 * Fires `first_minute_retained` — the single most important CrazyGames
 * ranking signal. CG's algorithm penalizes games where players bounce in
 * <60s. Tracking this lets us A/B onboarding flows against bounce rate.
 */
export function trackFirstMinuteRetained(args: { mode: string; platform: EngagementPlatform }): void {
  safe(() =>
    (posthog.capture as PHFn)('first_minute_retained', {
      mode: args.mode,
      platform: args.platform,
    })
  );
}

/**
 * Idempotent 60s timer. Call `start()` on game start, `cancel()` on early
 * abandon. Fires once per instance — repeat `start()` is a no-op.
 */
export function createFirstMinuteSurvivalTimer(args: {
  mode: string;
  platform: EngagementPlatform;
}): { start: () => void; cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let fired = false;

  return {
    start() {
      if (fired || timer) return;
      timer = setTimeout(() => {
        fired = true;
        timer = null;
        trackFirstMinuteRetained({ mode: args.mode, platform: args.platform });
      }, 60_000);
    },
    cancel() {
      if (timer) clearTimeout(timer);
      timer = null;
    },
  };
}

// ---------- Replay loop (plays per session — CG engagement metric) ----------

/**
 * Replay button clicked from a results / end screen. Pair with
 * `next_game_started` to build a "results→replay→played" funnel.
 */
export function trackReplayClicked(args: { mode: string; fromScreen: string }): void {
  safe(() =>
    (posthog.capture as PHFn)('replay_clicked', {
      mode: args.mode,
      from_screen: args.fromScreen,
    })
  );
}

/**
 * Subsequent game in a session (gamesThisSession >= 2). Drives the CG
 * "plays per session" metric — CG ranking weights replays heavily.
 */
export function trackNextGameStarted(args: { mode: string; gamesThisSession: number }): void {
  safe(() =>
    (posthog.capture as PHFn)('next_game_started', {
      mode: args.mode,
      games_this_session: args.gamesThisSession,
    })
  );
}

// ---------- Ad lifecycle (CG ad fill + revenue funnel) ----------

export type AdLifecycleEvent = 'requested' | 'shown' | 'completed' | 'skipped' | 'error';
export type AdType = 'midgame' | 'rewarded' | 'banner' | 'preroll';

/**
 * Capture each step of an ad's lifecycle so we can compute fill rate
 * (`shown / requested`) and completion rate (`completed / shown`). On
 * CrazyGames revenue scales with completion — surfacing skips/errors
 * lets us tune placement frequency to maximize completion without
 * burning the player.
 */
export function trackAdLifecycle(args: {
  event: AdLifecycleEvent;
  adType: AdType;
  placement: string;
  errorMessage?: string;
}): void {
  safe(() =>
    (posthog.capture as PHFn)(`ad_${args.event}`, {
      ad_type: args.adType,
      placement: args.placement,
      ...(args.errorMessage ? { error_message: args.errorMessage } : {}),
    })
  );
}

// ---------- Tab visibility tracker ----------

/**
 * Installs a document visibility listener that captures `tab_hidden` /
 * `tab_visible` with duration. Returns a cleanup function.
 *
 * Attention time is one of the strongest engagement metrics — PostHog's
 * built-in pageleave only gives you session duration, not per-tab focus.
 */
export function installTabVisibilityTracker(): () => void {
  if (typeof document === 'undefined') return () => undefined;

  let hiddenAt: number | null = null;

  const handler = () => {
    if (document.hidden) {
      hiddenAt = Date.now();
      safe(() => (posthog.capture as PHFn)('tab_hidden', {}));
    } else {
      const awayMs = hiddenAt ? Date.now() - hiddenAt : 0;
      hiddenAt = null;
      safe(() => (posthog.capture as PHFn)('tab_visible', { away_ms: awayMs }));
    }
  };

  document.addEventListener('visibilitychange', handler);
  return () => document.removeEventListener('visibilitychange', handler);
}

// ---------- Daily signup rank ----------

export function trackDailySignupRank(data: {
  rank: number | undefined;
  percentile: number;
  puzzleDate: string;
  language: string;
}): void {
  safe(() => (posthog.capture as PHFn)('daily_signup_rank_revealed', data));
}

// ---------- Leaderboard engagement (exp-leaderboard-play-cta-v1) ----------

/**
 * Leaderboard play-CTA shown. Fire when the experiment variant renders
 * the "Play to rank up" banner. Used to compute show→click conversion.
 */
export function trackLeaderboardPlayCtaShown(args: { variant: string }): void {
  safe(() =>
    (posthog.capture as PHFn)('leaderboard_play_cta_shown', {
      experiment: 'exp-leaderboard-play-cta-v1',
      variant: args.variant,
    })
  );
}

/**
 * Leaderboard play-CTA clicked. Pair with game_started to compute
 * leaderboard → game funnel from the experiment variant.
 */
export function trackLeaderboardPlayCtaClicked(args: { variant: string }): void {
  safe(() =>
    (posthog.capture as PHFn)('leaderboard_play_cta_clicked', {
      experiment: 'exp-leaderboard-play-cta-v1',
      variant: args.variant,
    })
  );
}

// ---------- Results screen (funnel instrumentation gap) ----------

/**
 * Results screen viewed — fills the gap between game_completed and the
 * next user action. Fires once per results-screen mount.
 * Properties allow slicing by mode, outcome, and session game count so
 * we can measure how results-screen dwell time correlates with replay rate.
 */
export function trackResultsScreenViewed(args: {
  mode: string;
  outcome: 'win' | 'loss' | 'timeout' | 'other';
  gamesThisSession: number;
  scoreRank?: number | null;
}): void {
  safe(() =>
    (posthog.capture as PHFn)('results_screen_viewed', {
      mode: args.mode,
      outcome: args.outcome,
      games_this_session: args.gamesThisSession,
      score_rank: args.scoreRank ?? null,
    })
  );
}
