/**
 * Ad-quality instrumentation — Deloitte × Google AdMob, "Quality drives value"
 * (2025). The study's core numbers: a single disruptive ad feature (obscure
 * close buttons, forced redirects, stalled/frozen ads) raises churn 6-7%;
 * repetition pushes 52% toward churn. Disruptive is not only "deceptive
 * creative" — from the player's side a fullscreen ad that stalls or fails to
 * dismiss IS the forced/frozen experience class.
 *
 * Two consequences implemented here:
 *
 *  1. MEASURE the outcome, not just the SDK breadcrumbs: every ad close emits
 *     a session-scoped `ad_closed` event, and an `ad_outcome` follow-up
 *     (played again within 5 min, or not). Joined with the existing
 *     `game_started` taxonomy in PostHog this is our own churn-per-ad-exposure
 *     dataset — the same measurement the study used to reach its numbers.
 *
 *  2. CLASSIFY the terminal so callers can react: a `broken` terminal (SDK
 *     stall, failed show/load) doubles the interstitial cooldown (see
 *     interstitialMinGapMs in lib/families/adPolicy.ts) so a misbehaving
 *     mediation chain never stacks two risky fullscreen experiences minutes
 *     apart.
 *
 * Pure module — no AdMob SDK dependency (type-only imports of the lifecycle
 * stage unions), so any provider path can call it and it stays trivially
 * testable.
 */
import {
  trackGrowthEvent,
  type InterstitialLifecycleStage,
  type RewardedLifecycleStage,
} from '@/utils/growthTracking';

/** How an ad experience ended, classified by its effect on the player. */
export type AdTerminal = 'clean' | 'broken' | 'skipped';

export interface AdCloseInfo {
  format: 'interstitial' | 'rewarded';
  terminal: AdTerminal;
  /** Rewarded surface key (per-surface AdMob unit), when format is rewarded. */
  surface?: string;
}

/**
 * Follow-up window for the ad_outcome event. Long enough that a willing
 * player has started (or is well into) their next game; short enough that
 * "played again" attributes to the ad experience rather than a later return
 * visit. 5 minutes — a LexiClash board runs 1-3 min, so two full boards fit.
 */
export const AD_OUTCOME_WINDOW_MS = 5 * 60 * 1000;

// ---------------------------------------------------------------------------
// Terminal classification
// ---------------------------------------------------------------------------

/**
 * Classify an interstitial lifecycle terminal stage.
 * Non-terminal breadcrumb stages (eligible..show_resolved) classify as
 * 'skipped' — they are never a close, so they must never count as exposure.
 */
export function classifyInterstitialTerminal(
  stage: InterstitialLifecycleStage,
): AdTerminal {
  switch (stage) {
    case 'dismissed':
      return 'clean'; // user closed a working ad
    case 'no_fill':
    case 'eligible':
    case 'prepare_start':
    case 'prepare_resolved':
    case 'show_called':
    case 'show_resolved':
      return 'skipped'; // nothing was ever shown — no exposure
    default:
      // safety_timeout | failed_to_show | failed_to_load | error — the ad
      // either froze on screen or never resolved: the disruptive class.
      return 'broken';
  }
}

/**
 * Classify a rewarded-ad close. `rewardGranted` → the full value exchange
 * completed → clean. No reward after a plain Dismissed = the player skipped
 * a working ad → clean (skipping is the user's right, per the study's
 * skip-features finding). Anything else means the SDK never delivered.
 */
export function classifyRewardedTerminal(
  rewardGranted: boolean,
  lastStage: RewardedLifecycleStage | null,
): AdTerminal {
  if (rewardGranted) return 'clean';
  if (lastStage === 'dismissed') return 'clean';
  return 'broken';
}

// ---------------------------------------------------------------------------
// Outcome tracking
// ---------------------------------------------------------------------------

interface PendingOutcome {
  info: AdCloseInfo;
  closedAt: number;
  timer: ReturnType<typeof setTimeout>;
}

// Module-level singleton: ad experiences are strictly sequential (one
// fullscreen native ad at a time), so a single pending slot is correct.
let pending: PendingOutcome | null = null;

function clearPending(): void {
  if (pending) {
    clearTimeout(pending.timer);
    pending = null;
  }
}

function emitOutcome(playedAgain: boolean, now: number): void {
  if (!pending) return;
  const { info, closedAt } = pending;
  clearPending();
  trackGrowthEvent('ad_outcome', {
    format: info.format,
    terminal: info.terminal,
    surface: info.surface ?? null,
    played_again_within_5m: playedAgain,
    minutes_to_next_game: playedAgain
      ? Number(((now - closedAt) / 60_000).toFixed(2))
      : null,
  });
}

/**
 * Record that an ad experience closed. Emits `ad_closed` immediately and arms
 * the follow-up: if the player finishes another game within
 * AD_OUTCOME_WINDOW_MS, `noteGameEndedAfterAd` emits `ad_outcome` with
 * played_again=true; otherwise the timer emits played_again=false.
 *
 * 'skipped' terminals (no fill, never shown) emit only `ad_closed` — there was
 * no exposure, so there is no outcome to measure.
 */
export function trackAdClosed(info: AdCloseInfo, now: number = Date.now()): void {
  trackGrowthEvent('ad_closed', {
    format: info.format,
    terminal: info.terminal,
    surface: info.surface ?? null,
  });
  if (info.terminal === 'skipped') return;
  clearPending(); // a new close supersedes any unreported previous window
  pending = {
    info,
    closedAt: now,
    timer: setTimeout(() => emitOutcome(false, Date.now()), AD_OUTCOME_WINDOW_MS),
  };
}

/**
 * The player finished a game while an ad-outcome window is open — they kept
 * playing after the ad. Call from the per-game-end counter (AdMobContext
 * already counts every game end, so it fires regardless of which provider
 * served the ad).
 */
export function noteGameEndedAfterAd(now: number = Date.now()): void {
  if (!pending) return;
  if (now - pending.closedAt > AD_OUTCOME_WINDOW_MS) {
    clearPending();
    return;
  }
  emitOutcome(true, now);
}

/** Test hook: drop any pending outcome and its timer. */
export function resetAdQualityForTests(): void {
  clearPending();
}
