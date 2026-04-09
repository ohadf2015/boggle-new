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

import posthog from 'posthog-js';
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
