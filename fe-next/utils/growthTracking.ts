/**
 * Growth Tracking Utilities
 * Analytics events for measuring viral coefficient and user engagement
 */

import logger from '@/utils/logger';
import { getStoredUtmData } from './utmCapture';
import { getSession } from '@/lib/supabase';
import { getGuestSessionId, getGuestName } from './guestManager';
import { getPlatform } from '@/utils/platform';
import { trackEvent as trackGA4Event } from '@/components/GoogleAnalytics';
import { awardGameEnd } from '@/lib/playGames/awardPlayGames';
import { maybeRequestReviewAfterWin } from '@/utils/nativeReview';
import { postWithAuth } from '@/utils/authFetch';
import {
  getJsonFromLocalStorage,
  saveJsonToLocalStorage,
} from '@/utils/storageHelpers';
import { incrementGamesCompletedCount } from '@/utils/gamesCompletedCount';
import { incrementGamesPlayed } from '@/utils/pushNotifications';
import posthog from '@/lib/analytics/lazyPosthog';
import {
  setPostHogUserProps,
  setPostHogUserPropsOnce,
  setPostHogSuperProps,
  incrementPostHogUserProp,
  trackRageQuit,
  trackSessionDepth,
} from '@/utils/posthogEngagement';
import { markGameActive, markGameInactive } from '@/utils/abandonOnPagehide';
import { trackRetentionPlay } from '@/lib/retention/tracking';
import {
  stampFirstWinClockStart,
  consumeFirstWinClockSeconds,
  markFirstWinPromptPending,
} from '@/lib/retention/firstWin';

// Growth event types for tracking viral loops and engagement
export type GrowthEvent =
  // Acquisition
  | 'page_view'
  | 'landing_view'
  | 'qr_scan_landed' // Printed QR/barcode scan landed → redirected to daily challenge
  | 'referral_link_clicked'
  | 'room_joined_via_link'
  | 'room_joined_via_code'
  // Activation
  | 'first_game_played'
  | 'first_word_found'
  | 'first_game_won'
  // Session & Game lifecycle
  | 'session_start'
  | 'game_started'
  | 'game_completed'
  | 'game_abandoned'
  | 'game_abandon_attempted'
  | 'mode_selected'
  | 'wordcraft_card_pick_shown'
  | 'wordcraft_card_picked'
  // FTUE quick-start screen (props/multiplayer entry). Rageclicks were showing
  // up on /multiplayer, /ja, /sv/multiplayer with no event to attribute them to.
  | 'quickstart_play_clicked'
  | 'quickstart_shuffle_clicked'
  // Word Tower wheel economy. The tunables file says "balance pass happens in
  // Phase 5 from PostHog telemetry" — but no in-mode event was ever wired, so
  // the pass was never possible. These two make the wheel economy measurable:
  // wordtower_scramble_used: a fresh ring, props { source: 'banked' | 'bought' }.
  // wordtower_wall_reached: the player has 0 banked scrambles AND cannot afford
  //   a spin, so the scramble button is DISABLED. The ring is reused and letters
  //   are never consumed, so that is a dead end with no legal move — the leading
  //   candidate for "11 of 20 daily players placed one word and left".
  | 'wordtower_scramble_used'
  | 'wordtower_wall_reached'
  | 'results_viewed'
  | 'replay_countdown_shown'
  | 'results_autoplay_cancelled'
  // MP signup-nudge session counter. Distinct from `game_completed` so it never
  // pollutes the game-log lifecycle query (see useMultiplayerSignupNudge).
  | 'mp_session_game'
  // Retention
  | 'return_visit'
  | 'streak_continued'
  | 'streak_milestone'
  | 'streak_broken'
  | 'streak_freeze_used'
  // Streak Ignition (t_89663cfc) — first-session win-moment redesign on the
  // solo results screen. streak_ignition_shown: StreakIgnitionCard impression,
  //   props { day: number, won: boolean, variant: 'won' | 'lost' }.
  // tomorrow_card_shown: persistent TomorrowCard impression (first-session
  //   players only), props { seconds_to_midnight: number }.
  // save_streak_clicked: player acted on the streak-insurance signup card,
  //   props { source: 'solo_results' }.
  | 'streak_ignition_shown'
  | 'tomorrow_card_shown'
  | 'save_streak_clicked'
  // NextStepPrompt — the only cross-mode CTA in the product, and until now it
  // emitted nothing, so a 151/14d `daily_puzzle_opened` count could not be told
  // apart from "the CTA is never shown". `to` is the destination mode, `from`
  // the surface it was shown on.
  //   Props: { from: NextStepMode, to: 'daily' | 'multiplayer' | 'solo-bots',
  //             variant: 'desktop' | 'mobile' | 'landscape' }.
  | 'next_step_shown'
  | 'next_step_clicked'
  | 'daily_challenge_completed'
  | 'daily_puzzle_opened'
  | 'daily_puzzle_completed'
  | 'daily_word_hunt_complete'
  | 'wordhunt_invalid_submitted'
  | 'daily_rival_landed' // Rival challenge link landed (beat-me loop invitation)
  // exp-daily-chase-last-chance-v1: urgency variant of ChaseBanner shown when a
  // chasing player is within the last hours of the daily reset window.
  //   Props: { hoursRemaining: number; pointsGap: number | null }.
  | 'daily_last_chance_shown'
  // Player tapped the last-chance ChaseBanner CTA (routes into the day's puzzle).
  | 'daily_last_chance_clicked'
  // Adventure
  | 'adventure_level_start'
  | 'adventure_level_pass'
  | 'adventure_level_fail'
  | 'adventure_quit'
  // Social
  | 'share_link_copied'
  | 'share_whatsapp_clicked'
  | 'share_qr_generated'
  | 'share_win_prompt_shown'
  | 'share_win_prompt_clicked'
  | 'share_card_generated'
  // Unified share funnel — fires alongside surface-specific events with a
  // `method` prop so PostHog "Share Action (Any Method)" goal can match a
  // single event regardless of the channel.
  | 'share_completed'
  | 'friend_added'
  | 'challenge_sent'
  // Engagement
  | 'achievement_earned'
  | 'achievement_shared'
  | 'leaderboard_viewed'
  | 'profile_viewed'
  | 'feature_first_use'
  // Avatar "make it yours" nudge funnel (gentle, authed-only)
  | 'avatar_nudge_shown'
  | 'avatar_nudge_clicked'
  | 'avatar_nudge_dismissed'
  | 'hint_used'
  | 'wordwheel_drag_hint_shown'
  | 'wordwheel_drag_hint_dismissed'
  // Conversion
  | 'signup_prompt_shown'
  | 'signup_completed'
  | 'signup_dismissed'
  | 'first_win_signup_shown'
  | 'first_win_signup_completed'
  | 'first_win_signup_dismissed'
  | 'guest_conversion'
  // Push notification permission funnel
  | 'push_prompt_shown'
  | 'push_prompt_dismissed'
  | 'push_prompt_granted'
  | 'push_prompt_failed'
  // Push notification delivery funnel (instrumented to verify smart-reminder
  // push actually reaches devices — D1 = 0% suggested cron fires but FCM
  // delivery may not land. Properties: type, campaign, gameMode if relevant.)
  | 'notification_delivered'
  | 'notification_clicked'
  // Monetization
  | 'iap_viewed'
  | 'iap_tapped'
  | 'iap_purchased'
  | 'rewarded_ad_offered'
  | 'rewarded_ad_watched'
  | 'rewarded_ad_declined'
  // Age-gate prompt funnel (AgeGatePromptWrapper), tagged { stage }. Declared
  // 13+ unlocks interstitials + personalized ads; 'dismissed' users get
  // re-asked after RE_PROMPT_INTERVAL_MS. Shipped blind on 2026-07-03 — zero
  // interstitial requests for 39 days looked identical to "working".
  | 'age_gate'
  // Native rewarded-ad lifecycle breadcrumb. One event per stage transition in
  // useAdMob.showRewarded, tagged { stage, surface }. Diagnoses the "ad won't
  // close / no reward" report: production traffic shows whether sessions reach
  // `rewarded`, then `dismissed` (X tapped, ad torn down), or stall at
  // `safety_timeout` / never fire `dismissed`. NOT a funnel step.
  | 'rewarded_ad_lifecycle'
  // Native interstitial-ad lifecycle breadcrumb. One event per stage transition
  // in useAdMob.showInterstitial, tagged { stage }. Diagnoses the "interstitials
  // show blank screens" report — interstitials previously had ZERO telemetry, so
  // production couldn't distinguish (a) ad-surface blank (no_fill / failed_to_*)
  // from (b) a clean show_called→show_resolved→dismissed where the WebView never
  // repaints, from (c) a native stall that never fires dismissed and hits
  // safety_timeout. NOT a funnel step.
  | 'interstitial_ad_lifecycle'
  // Web display (AdSense Auto-Ads) placement audit. `units: 0` = the script
  // loaded but Auto-Ads placed nothing — the silent zero-revenue state.
  | 'web_ads_fill_audit'
  // Preference
  | 'language_changed'
  // Onboarding funnel
  | 'onboarding_started'
  | 'onboarding_step_completed'
  | 'onboarding_first_word_found'
  | 'onboarding_completed'
  | 'onboarding_skipped'
  | 'onboarding_quick_play'
  // First-session → live Daily conversion (D1 hook). Properties: { variant }.
  | 'first_session_daily_shown'
  | 'first_session_daily_clicked'
  // FTUE-gate redirect (useFTUEGate bounces an unauthenticated play surface,
  // e.g. /practice, to the homepage with ?next=). Instruments whether the
  // bounce actually resumes the original destination after onboarding —
  // targets rage clicks measured on the bounce URL (no prior signal existed
  // for whether these sessions ever complete the round-trip).
  | 'ftue_redirect_landed'
  | 'ftue_redirect_resumed'
  // Guardrail for exp-teacher-gate-redirect-clarity-v1: confirms the
  // TeacherGate → /education/access redirect actually lands.
  | 'education_access_redirect_landed'
  // Modals / confirmation dialogs
  | 'modal_interaction'
  // Friction / engagement
  | 'dead_time_detected'
  // Landing-page CTA instrumentation (visitor → onboarding funnel leak)
  | 'landing_cta_clicked'
  | 'education_upsell_impression'
  | 'school_lead_submitted'
  | 'school_lead_form_viewed'
  // Cross-promo CTA tracking (e.g. Word Hunt → Word Wheel, Daily → Multiplayer)
  | 'cross_promo_click'
  // Cross-promo CTA exposure — fires once when a cross-promo card is rendered, so
  // PostHog can compute click-through rate (clicks / impressions). Props mirror
  // cross_promo_click: { target, source, placement?, language? }.
  | 'cross_promo_impression'
  // Results-page CTA tracking — experiment conversion funnel (exp-results-replay-cta-v1)
  // Properties: { cta: 'quick_replay' | 'back_to_lobby' | 'next_step', mode?: string }
  | 'results_cta_clicked'
  // Word Wheel daily post-game signup funnel (experiment wheel-signup-offer-v1).
  // The wheel bypasses the generic guest-stats signup gate, so these are its own
  // conversion events. Properties: { experiment, variant, offerType, streakDays, score }.
  | 'wheel_signup_cta_viewed'
  | 'wheel_signup_cta_clicked'
  // Word Wheel already-played dead-end → practice CTA (experiment wheel-replay-cta-v1).
  // Anti-bounce second-activity hook. Properties: { experiment, variant }.
  | 'wheel_practice_cta_clicked'
  // CrazyGames portal short-flow funnel
  | 'cg_welcome_view'
  | 'cg_welcome_play'
  | 'cg_welcome_dismissed'
  | 'cg_tutorial_view'
  | 'cg_tutorial_complete'
  | 'cg_tutorial_skip'
  | 'cg_lobby_arrival'
  | 'cg_lobby_hero_view'
  | 'cg_lobby_hero_play'
  | 'cg_lobby_hero_browse'
  // CG SDK auth outcome — fired by CrazyGamesProvider.showAuthPrompt for every
  // invocation. Closes the 0-signups blind spot for CG cohort: pre-fix the
  // result was discarded, so PostHog couldn't tell dismiss from never-prompted.
  // Properties: { result: 'success' | 'dismiss' | 'already_signed_in' | 'error', errorCode? }.
  | 'cg_auth_prompt_outcome'
  // In-game sentiment — a single `game_feedback` event fired by useGameFeedback
  // when a player taps the "how was that?" card on an end-of-game surface
  // (MP round, single-player, daily, daily word-hunt). Properties: { surface:
  // 'mp_round'|'singleplayer'|'daily'|'word_hunt', rating: 'bad'|'ok'|'great', ratingValue:
  // 1|2|3, gameMode?, language? }. NOT a funnel step — kept off
  // CANONICAL_DUAL_EMIT. Consumed by the nightly improvement loop's feedback
  // digest, so all surfaces stay one query.
  | 'game_feedback'
  // Quick Play funnel instrumentation. Fired by MultiplayerFlow.handleQuickPlay
  // to close the rage-click blind spot on /multiplayer?quickPlay=true (24h: 23
  // rage clicks). Three stages so PostHog funnels can pinpoint drop-off:
  //   mp_quickplay_initiated — user tapped Quick Start or ?quickPlay auto-fired.
  //     Props: { trigger: 'url_param' | 'button', hadMatchRoom: boolean }.
  //   mp_quickplay_socket_wait — socket not yet connected at initiation moment.
  //     Props: { trigger: 'url_param' | 'button' }. High rate = socket latency issue.
  //   mp_quickplay_joined — lobby join confirmed (onJoined callback fired).
  //     Props: { asHost: boolean, language: string }.
  | 'mp_quickplay_initiated'
  | 'mp_quickplay_eager_shown'
  | 'mp_quickplay_socket_wait'
  | 'mp_quickplay_seeking'
  // Player backed out of the Quick Play wait to browse the lobby instead. Pairs
  // with 'mp_quickplay_seeking' to show how often the wait is worth abandoning.
  | 'mp_quickplay_seeking_dismissed'
  | 'mp_quickplay_joined'
  // mp_quickplay_rapid_click — Quick Play tapped again while a join was
  // already in flight (control-arm rage-click signature on /multiplayer).
  | 'mp_quickplay_rapid_click'
  // Word Hunt results page instrumentation — surfaces rage-click source.
  // wordhunt_results_loaded: fires on mount, tagged with solved + hint_variant
  //   (exp-wordhunt-hint-v1) so PostHog can split rage clicks by variant.
  // wordhunt_leaderboard_tap: fires when user taps the leaderboard area;
  //   high rate = evidence the dead tap-hint is confusing players.
  | 'wordhunt_results_loaded'
  | 'wordhunt_leaderboard_tap'
  // Multiplayer results page funnel — fills mp_round blind spots.
  //   results_viewed: also fired on ResultsMainContent mount (canonical mode funnel;
  //     props { mode, score }) so classic/survival/wheel-rush join word-wheel/blast.
  //   mp_results_viewed: fires on ResultsMainContent mount (isMultiplayer=true).
  //     Props: { gameMode, language }. Baseline reach for round-result funnel.
  //   mp_round_ready_clicked: fires when player marks ready for next round.
  //     Props: { language }. Measures round-transition engagement.
  //   mp_results_exit_clicked: fires when player exits from between-round results.
  //     Props: { language, gameMode }. Measures voluntary mid-series exits.
  | 'mp_results_viewed'
  | 'mp_round_ready_clicked'
  | 'mp_results_exit_clicked'
  // Brag-card share funnel (screenshot-first MP results card). NOTE: the web has
  // no screenshot API, so we can't fire on the actual screenshot — these are the
  // measurable proxies bracketing the intent.
  //   mp_brag_card_viewed: impression of the shareable artifact. Props: { gameMode,
  //     outcome, language }. Denominator for "how many saw it". Since the card was
  //     demoted to a collapsed strip this fires on the STRIP's mount — deliberately
  //     unchanged, so the historical impression denominator stays comparable (the
  //     strip renders under exactly the same `bragData != null` condition the card
  //     did, so it is the same population, just a smaller surface).
  //   mp_brag_card_expanded: player opened the strip to see the card. Props:
  //     { gameMode, outcome, language }. The new intent step between impression and
  //     copy/share; expect viewed → expanded → copy_link to be the funnel now.
  //   mp_brag_card_copy_link: player tapped the explicit Copy-link affordance on the
  //     card. Props: { gameMode, outcome, language }. The one directly-measurable
  //     share action; best signal that an impression converted to share intent.
  //   mp_brag_card_native_share: player COMPLETED the Web Share sheet on the card
  //     (fires on success only, not cancel). Props: { gameMode, outcome, language,
  //     hasRoomLink }.
  | 'mp_brag_card_viewed'
  | 'mp_brag_card_expanded'
  | 'mp_brag_card_copy_link'
  | 'mp_brag_card_native_share'
  //   mp_results_challenge_cta: player tapped the explicit "Challenge a friend" CTA
  //     on the MP results brag card (opens UnifiedShareModal in challenge mode).
  //     Props: { surface: 'mp_results' }.
  | 'mp_results_challenge_cta'
  // exp-mp-round-progress-header-v1 instrumentation.
  //   mp_round_gap_nudge_seen: gap-nudge pill rendered in mp results.
  //     Props: { gap: number, language }. Measures nudge exposure rate.
  //   mp_round_progress_header_shown: progress-header pill rendered.
  //     Props: { roundNumber: number, totalRounds: number }. Experiment impression.
  | 'mp_round_gap_nudge_seen'
  | 'mp_round_progress_header_shown'
  // Homepage mode-cube rapid re-click (rage-click signal).
  //   Fires when the same cube is clicked twice within 1.5s.
  //   Props: { mode: string, locale: string }.
  //   Funnel: mode_card_rapid_reclick → (no game_started) = rage-click confirmed.
  | 'mode_card_rapid_reclick'
  // ES/daily multiplayer join-attempt funnel gap.
  //   Fires on every join/start button tap in the MP lobby.
  //   Props: { locale: string, socketReady: boolean, action: 'create' | 'join' }.
  //   High socketReady=false rate = socket latency root cause for rage-clicks.
  | 'mp_lobby_join_attempted'
  // Terminal outcome of a join/create attempt — the SUCCESS half that
  // mp_lobby_join_attempted never had. That event fires only on the
  // socket-not-ready branch, so it counts failures and cannot express a rate;
  // this one fires on every terminal path so the join funnel is measurable.
  //   Props: { outcome: 'joined' | 'not_connected', wait_ms: number,
  //            isHostMode: boolean, quickPlay: boolean }.
  | 'mp_join_outcome'
  // MP lobby join stalled past the 10s safety timeout (server never replied to
  // createGame/join). Root-cause signal for the pageview→game_started funnel
  // drop and the confirmed-but-unfixed connecting→lobby CLS/rage-click issue.
  //   Props: { isHostMode: boolean }.
  | 'mp_lobby_join_timeout'
  // MP lobby join resolved (joined / joinedAsSpectator / error / rateLimited)
  // before the safety timeout. Pairs with mp_lobby_join_timeout to give a
  // success-rate denominator for the join funnel.
  //   Props: { result: 'joined' | 'joinedAsSpectator' | 'error' | 'rateLimited' }.
  | 'mp_lobby_join_resolved'
  // exp-mp-round-issue-probe-v1 triage chip selection.
  //   Fires when player picks a follow-up chip after bad/ok mp_round rating.
  //   Props: { issue: 'bots_too_strong' | 'technical_issue', language: string }.
  | 'mp_round_issue_selected'
  // mp_room_join_rate_limited — a direct-invite JoinRoomModal join tripped the
  // 50msg/10s socket limiter, quantifying the rage-click-into-lockout path the
  // Join button's loading spinner is meant to reduce.
  | 'mp_room_join_rate_limited'
  // Word Craft Run card-pick funnel — was fully uninstrumented (rageclicks on
  // /word-craft had no signal to attribute). Also verifies the 2026-08-24
  // rarity-weighted draw change actually shifted the served rarity mix.
  //   wordcraft_card_pick_shown: fires when CardPickScreen mounts.
  //     Props: { rarities: string[] } — the 3 offered cards' rarities, e.g.
  //     ['common','common','rare']. Denominator for pick-rate + rarity-mix checks.
  //   wordcraft_card_picked: fires when player selects a card.
  //     Props: { cardId: string, rarity: string }. Numerator for pick-rate by rarity.
  | 'wordcraft_card_pick_shown'
  | 'wordcraft_card_picked';

/** Onboarding funnel step identifiers (FTUE state machine). */
export type OnboardingStep =
  | 'language'
  | 'calmMode'
  | 'tutorial'
  | 'profile'
  | 'style'
  | 'quickStart'
  | 'mode_select';

export interface GrowthEventData {
  // Common properties
  timestamp?: number;
  sessionId?: string;
  userId?: string;
  isGuest?: boolean;

  // Game context
  gameCode?: string;
  roomName?: string;
  language?: string;
  playerCount?: number;

  // Event-specific data
  score?: number;
  wordCount?: number;
  achievementId?: string;
  achievementTier?: string;
  shareMethod?: 'whatsapp' | 'copy' | 'qr' | 'native' | 'facebook' | 'telegram' | 'twitter' | 'discord' | 'email' | 'sms';
  referralSource?: string;
  streakDays?: number;
  position?: number; // Leaderboard position

  // Custom properties
  [key: string]: unknown;
}

// Session tracking
let sessionId: string | null = null;
const eventQueue: Array<{ event: GrowthEvent; data: GrowthEventData }> = [];
const MAX_QUEUE_SIZE = 50;

// Funnel-critical events also emitted under their canonical (unprefixed)
// name so PostHog dashboards resolve without a `growth:` rewrite.
//
// t_c7d4f54a: do NOT dual-emit `game_started`. PostHog 14d showed near-1:1
// `game_started` (2,293) vs `growth:game_started` (2,254) — double-counting
// in taxonomy / GrowthRadar. Keep the existing `growth:game_started` emit
// only (no new event names). Nightly coverage already treats the growth:
// prefix as healthy for this event.
const CANONICAL_DUAL_EMIT: ReadonlySet<GrowthEvent> = new Set<GrowthEvent>([
  'game_completed',
  'game_abandoned',
  'first_game_played',
  'first_game_won',
  'first_word_found',
  'session_start',
  'signup_completed',
  'first_win_signup_completed',
  // collect-revenue.sh queries unprefixed 'rewarded_ad_watched' — must dual-emit
  'rewarded_ad_watched',
  // D1-retention lever: FTUE → auto-start practice game. Queried unprefixed
  // against the t_cce75cc7 return-visit funnel.
  'onboarding_quick_play',
  // D1-retention lever: first-session results → live Daily Word Hunt.
  'first_session_daily_shown',
  'first_session_daily_clicked',
]);

/**
 * Generate or retrieve session ID
 */
const getSessionId = (): string => {
  if (sessionId) return sessionId;

  if (typeof window === 'undefined') return 'server';

  // Try to get from sessionStorage
  sessionId = sessionStorage.getItem('lexiclash_session_id');

  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    sessionStorage.setItem('lexiclash_session_id', sessionId);
    // Fires once per browser-tab session, on first-ever generation (never on
    // an existing sessionStorage id) — the 'session_start' GrowthEvent had 0
    // call sites anywhere in the codebase (2026-08-01 coverage audit).
    trackGrowthEvent('session_start', {});
  }

  return sessionId;
};

/**
 * Get referral source from URL
 */
export const getReferralSource = (): string | null => {
  if (typeof window === 'undefined') return null;

  const params = new URLSearchParams(window.location.search);
  return params.get('ref') || params.get('utm_source') || null;
};

/**
 * Track a growth event
 */
export const trackGrowthEvent = (event: GrowthEvent, data: GrowthEventData = {}): void => {
  // Seeing a results screen ends the round, whoever reported it. `trackGameEnd`
  // used to be the only thing clearing the active-game flag, but it is driven by
  // `useGameEndTelemetry`, which keys off `tournament.finalScores` /
  // `waitingForResults` — a different source from the one the results screen
  // itself renders on. When results appeared and that gate did not flip, the
  // flag stayed set and the in-game view's unmount logged a FINISHED round as
  // `game_abandoned`: 1,218 in 30d, spiking at the exact round length, none with
  // a `game_completed` beside them, yet 96.8% had reached a results screen.
  // Clearing here covers every mode through one chokepoint instead of relying on
  // the five results components to stay in step (Class 3 in
  // `.claude/rules/60-recurring-pitfalls.md`). A genuine mid-round exit emits no
  // results event, so real abandons are untouched.
  if (event === 'results_viewed' || event === 'mp_results_viewed') {
    markGameInactive();
  }

  const enrichedData: GrowthEventData = {
    ...data,
    timestamp: Date.now(),
    sessionId: getSessionId(),
    referralSource: data.referralSource || getReferralSource() || undefined,
  };

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    logger.info(`[GROWTH] ${event}`, enrichedData);
  }

  // Add to queue for batch processing
  eventQueue.push({ event, data: enrichedData });

  // Trim queue if too large
  if (eventQueue.length > MAX_QUEUE_SIZE) {
    eventQueue.shift();
  }

  // Send to LogRocket if available
  if (typeof window !== 'undefined' && (window as unknown as { LogRocket?: { track: (event: string, data: object) => void } }).LogRocket) {
    try {
      (window as unknown as { LogRocket: { track: (event: string, data: object) => void } }).LogRocket.track(`growth:${event}`, enrichedData);
    } catch {
      // Silently fail if LogRocket not properly initialized
    }
  }

  // Send to PostHog (no-ops when opted out or not initialized)
  try {
    posthog.capture(`growth:${event}`, enrichedData);
    // Dual-emit canonical name for funnel/retention dashboards that query
    // unprefixed events. Whitelisted to avoid doubling event volume.
    if (CANONICAL_DUAL_EMIT.has(event)) {
      posthog.capture(event, enrichedData);
    }
  } catch {
    // Silently fail if PostHog not initialized
  }

  // Send to GA4 for unified analytics
  // Convert GrowthEventData to Record<string, string | number | boolean>
  const ga4Data: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(enrichedData)) {
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      ga4Data[key] = value;
    }
  }
  trackGA4Event(`growth_${event}`, ga4Data);

  // Persist to Supabase via analytics API (fire and forget)
  persistToSupabase(event, enrichedData);

  // Store key events in localStorage for analysis
  storeEventLocally(event, enrichedData);
};

/**
 * Authenticated identity for analytics, set from AuthContext when a user +
 * profile resolve, cleared on logout. analytics_events events are otherwise
 * fully anonymous (session-keyed only) — without this, even logged-in players
 * are recorded with no player_id and render as "Guest" in the admin game log.
 */
let analyticsIdentity: { userId: string; username: string | null } | null = null;

export const setAnalyticsIdentity = (
  userId: string | null,
  username?: string | null,
): void => {
  analyticsIdentity = userId ? { userId, username: username ?? null } : null;
};

export const getAnalyticsIdentity = (): { userId: string; username: string | null } | null =>
  analyticsIdentity;

/**
 * Best-effort bearer header for analytics writes.
 *
 * The server (backend/routes/analytics.ts) derives the player identity ONLY from
 * a verified token — it ignores any client-sent player_id and strips client
 * userId/username (those are spoofable). So without this header an authed player
 * is recorded anonymously and renders as "Guest" in the admin game log. Reads the
 * locally-cached session (no network round-trip); guests get no header.
 */
/**
 * Current UI locale for analytics, read outside React. game_started call sites
 * passed `{ language }` but game_completed sites did not, so the terminal event
 * the admin game log displays had no language and every game rendered as English.
 * Stamping this centrally guarantees EVERY event carries the locale.
 */
const getCurrentLanguage = (): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    const stored = window.localStorage.getItem('boggle_language');
    if (stored) return stored;
  } catch {
    /* localStorage unavailable (private mode / SSR) — fall through */
  }
  if (typeof document !== 'undefined' && document.documentElement.lang) {
    return document.documentElement.lang;
  }
  return null;
};

const getAnalyticsAuthHeaders = async (): Promise<Record<string, string>> => {
  try {
    const { data } = await getSession();
    const token = data?.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
};

/**
 * Persist event to Supabase analytics_events table via API
 * Fire-and-forget — never blocks the UI
 */
const persistToSupabase = (event: GrowthEvent, data: GrowthEventData): void => {
  if (typeof window === 'undefined') return;

  // Throttle: skip high-frequency events that would overwhelm the DB
  const skipPersist: GrowthEvent[] = ['page_view']; // page_view already tracked via trackPageView
  if (skipPersist.includes(event)) return;

  const utmData = getStoredUtmData();
  const guestSessionId = getGuestSessionId();

  // Build metadata from event data (exclude fields stored as top-level columns)
  const { sessionId: _sid, referralSource: _ref, timestamp: _ts, ...metadata } = data;

  // Enrich metadata with platform, guest_name + authed identity (forward-only).
  // username/userId let the admin log show real names for logged-in players
  // (analytics_events is otherwise anonymous → everyone rendered as "Guest").
  const identity = analyticsIdentity;
  const enrichedMetadata = {
    ...metadata,
    platform: getPlatform(),
    guest_name: getGuestName(),
    // Prefer a language a caller passed explicitly; else the current UI locale.
    language: (typeof metadata.language === 'string' && metadata.language) || getCurrentLanguage(),
    username: identity?.username ?? (typeof metadata.username === 'string' ? metadata.username : null),
    userId: identity?.userId ?? (typeof metadata.userId === 'string' ? metadata.userId : null),
  };

  // Attach the verified bearer token (when signed in) so the server can resolve
  // the real player identity; the body player_id is a hint the server re-verifies.
  void (async () => {
    const authHeaders = await getAnalyticsAuthHeaders();
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({
        event_type: event,
        session_id: guestSessionId || data.sessionId || null,
        player_id: identity?.userId ?? null,
        utm_source: utmData?.utm_source || utmData?.ref || null,
        utm_medium: utmData?.utm_medium || null,
        utm_campaign: utmData?.utm_campaign || null,
        referrer: utmData?.referrer || null,
        metadata: enrichedMetadata,
      }),
    }).catch(() => {
      // Silently fail — analytics should never break the game
    });
  })();
};

/**
 * Store important events locally for offline analysis
 */
const storeEventLocally = (event: GrowthEvent, data: GrowthEventData): void => {
  if (typeof window === 'undefined') return;

  // Only store key funnel events
  const keyEvents: GrowthEvent[] = [
    'first_game_played',
    'first_game_won',
    'share_whatsapp_clicked',
    'share_link_copied',
    'signup_completed',
    'streak_milestone',
  ];

  if (!keyEvents.includes(event)) return;

  const storageKey = 'lexiclash_growth_events';
  const existing = getJsonFromLocalStorage<Array<{ event: GrowthEvent; data: GrowthEventData; timestamp: number }>>(storageKey, []);
  existing.push({ event, data, timestamp: Date.now() });

  // Keep only last 100 events
  const trimmed = existing.slice(-100);
  saveJsonToLocalStorage(storageKey, trimmed);
};

/** Share method type for tracking */
export type ShareMethod = 'whatsapp' | 'copy' | 'qr' | 'native' | 'facebook' | 'telegram' | 'twitter' | 'discord' | 'email' | 'sms';

/**
 * Track share event with method
 */
export const trackShare = (method: ShareMethod, gameCode?: string): void => {
  const eventMap: Record<string, GrowthEvent> = {
    whatsapp: 'share_whatsapp_clicked',
    copy: 'share_link_copied',
    qr: 'share_qr_generated',
    native: 'share_link_copied',
    facebook: 'share_link_copied',
    telegram: 'share_link_copied',
    twitter: 'share_link_copied',
    discord: 'share_link_copied',
    email: 'share_link_copied',
    sms: 'share_link_copied',
  };

  const event = eventMap[method];
  if (event) {
    trackGrowthEvent(event, {
      shareMethod: method,
      gameCode,
    });
    // Funnel event for share action
    const platformMap: Record<string, string> = {
      copy: 'clipboard', native: 'native', whatsapp: 'whatsapp',
      facebook: 'native', telegram: 'native', twitter: 'native',
      discord: 'native', email: 'native', sms: 'native',
    };
    trackGA4Event('funnel_share', { platform: platformMap[method] || 'native' });
  }
};

/**
 * Track achievement earned
 */
export const trackAchievement = (achievementId: string, tier?: string): void => {
  trackGrowthEvent('achievement_earned', {
    achievementId,
    achievementTier: tier,
  });
};

/**
 * Track streak milestone
 */
export const trackStreakMilestone = (streakDays: number): void => {
  // Only track milestones at 3, 7, 14, 30 days
  const milestones = [3, 7, 14, 30, 50, 100];

  if (milestones.includes(streakDays)) {
    trackGrowthEvent('streak_milestone', { streakDays });
  }
};

/**
 * Track game completion
 */
export const trackGameCompletion = (
  isWinner: boolean,
  score: number,
  wordCount: number,
  isFirstGame: boolean,
  gameMode?: string
): void => {
  const mode = gameMode || 'unknown';
  if (isFirstGame) {
    trackGrowthEvent('first_game_played', { score, wordCount, mode, gameMode: mode });
    trackGA4Event('funnel_first_game', { mode });
  }

  if (isWinner) {
    trackGrowthEvent(isFirstGame ? 'first_game_won' : 'streak_continued', {
      score,
      wordCount,
      mode,
      gameMode: mode,
    });
  }
};

/**
 * Track signup funnel.
 *
 * `prompt_shown` is fired by useSignupPrompt when the modal opens. It also
 * stickies the variant in sessionStorage so that a later auth-success can
 * resolve the funnel to `completed`. `dismissed` fires when the modal is
 * closed without auth — separates "didn't see" from "saw but bounced".
 */
const SIGNUP_FUNNEL_PENDING_KEY = 'lexiclash_signup_funnel_pending';

export const trackSignupFunnel = (
  step: 'prompt_shown' | 'completed' | 'dismissed',
  isFirstWin: boolean
): void => {
  const variant = isFirstWin ? 'first_win' : 'multi_game';
  if (typeof window !== 'undefined') {
    if (step === 'prompt_shown') {
      sessionStorage.setItem(SIGNUP_FUNNEL_PENDING_KEY, variant);
    } else {
      sessionStorage.removeItem(SIGNUP_FUNNEL_PENDING_KEY);
    }
  }
  if (step === 'prompt_shown') {
    trackGrowthEvent(isFirstWin ? 'first_win_signup_shown' : 'signup_prompt_shown');
  } else if (step === 'completed') {
    trackGrowthEvent(isFirstWin ? 'first_win_signup_completed' : 'signup_completed');
  } else {
    trackGrowthEvent(isFirstWin ? 'first_win_signup_dismissed' : 'signup_dismissed');
  }
};

/**
 * Resolve a pending signup-prompt funnel to `completed` after the user
 * authenticates. Called from AuthContext on guest → authed transition.
 * No-op if no prompt was shown (covers users who signed up via header
 * button, not via the post-game prompt).
 */
export const consumePendingSignupCompletion = (): void => {
  if (typeof window === 'undefined') return;
  const pending = sessionStorage.getItem(SIGNUP_FUNNEL_PENDING_KEY);
  if (!pending) return;
  sessionStorage.removeItem(SIGNUP_FUNNEL_PENDING_KEY);
  trackSignupFunnel('completed', pending === 'first_win');
};

/**
 * Unconditional signup-completion emit for the PostHog "Signup Completed"
 * goal. The existing `trackSignupFunnel('completed')` only fires when the
 * post-game prompt was shown first, so users signing up via header / menu /
 * onboarding never produced a completion event (PostHog 30d 2026-05-05:
 * 22 prompt_shown × 6 users → 0 completed; meanwhile 15 unique authed users
 * the same window). Fire this on every guest → authed transition with a
 * `source` prop so the funnel can attribute by signup origin.
 */
export const trackSignupCompleted = (source: string = 'unknown'): void => {
  trackGrowthEvent('signup_completed', { source });
};

/** localStorage key holding the JSON array of userIds already counted as a
 *  completed signup on this device (dedup set). */
export const SIGNUP_COUNTED_KEY = 'lexiclash_signup_counted';
/** An account older than this when first seen authed is a returning user, not
 *  a fresh signup. Generous (1h) so OAuth + email-confirm + magic-link flows
 *  all comfortably fit, while days-old accounts are excluded. */
export const SIGNUP_RECENT_WINDOW_MS = 60 * 60 * 1000;
const SIGNUP_FUTURE_SKEW_MS = 5 * 60 * 1000;

/**
 * Is this a *just-created* account (vs a returning session being restored)?
 *
 * A genuine signup resolves authed within seconds-to-minutes of `created_at`;
 * a returning user's restored session carries a `created_at` days/months old.
 * Missing/unparseable timestamps return `false` — we never fire a "signup" we
 * cannot confirm is fresh (biases the conversion metric toward purity).
 */
export const isRecentAccount = (
  createdAt: string | null | undefined,
  nowMs: number,
  windowMs: number = SIGNUP_RECENT_WINDOW_MS,
): boolean => {
  if (!createdAt) return false;
  const created = Date.parse(createdAt);
  if (Number.isNaN(created)) return false;
  const age = nowMs - created;
  // Allow small negative age (client/server clock skew) for genuinely new rows.
  return age >= -SIGNUP_FUTURE_SKEW_MS && age < windowMs;
};

/**
 * Fire `signup_completed` at most once per genuine signup.
 *
 * Replaces the raw `trackSignupCompleted` call in AuthContext, which re-fired
 * on every cold load because its `wasGuest` gate trusts an in-memory ref that
 * resets on mount (PostHog 30d: 380 events / 9 users). Two guards:
 *   1. recency — old accounts (returning users) are excluded outright;
 *   2. dedup — a per-device userId set, so reloads and multi-account devices
 *      each count a given account only once.
 * Returns whether the event was emitted (for callers/tests).
 */
export const maybeTrackSignupCompleted = (args: {
  userId: string;
  createdAt?: string | null;
  source?: string;
  nowMs?: number;
  recentWindowMs?: number;
}): boolean => {
  const { userId, createdAt, source = 'unknown', nowMs = Date.now(), recentWindowMs } = args;
  if (typeof window === 'undefined' || !userId) return false;
  if (!isRecentAccount(createdAt, nowMs, recentWindowMs)) return false;

  try {
    const raw = localStorage.getItem(SIGNUP_COUNTED_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    const counted: string[] = Array.isArray(parsed) ? parsed : [];
    if (counted.includes(userId)) return false;
    // Cap to bound storage (multi-account dev devices) — keep most recent 50.
    localStorage.setItem(SIGNUP_COUNTED_KEY, JSON.stringify([...counted, userId].slice(-50)));
  } catch {
    // localStorage unavailable (private mode / quota). The recency guard still
    // blocks old accounts; without dedup we may re-emit on reloads within the
    // window — best-effort, far better than the unbounded pre-fix re-fire.
  }

  trackSignupCompleted(source);
  return true;
};

/**
 * Get growth metrics summary (for admin dashboard)
 */
export const getGrowthMetricsSummary = (): {
  totalShares: number;
  totalAchievements: number;
  avgStreakDays: number;
  conversionEvents: number;
} => {
  if (typeof window === 'undefined') {
    return { totalShares: 0, totalAchievements: 0, avgStreakDays: 0, conversionEvents: 0 };
  }

  const events = getJsonFromLocalStorage<Array<{ event: string; data: { streakDays?: number } }>>(
    'lexiclash_growth_events',
    []
  );

  const shareEvents = events.filter((e) =>
    ['share_whatsapp_clicked', 'share_link_copied'].includes(e.event)
  );

  const achievementEvents = events.filter((e) => e.event === 'achievement_earned');

  const streakEvents = events.filter((e) => e.event === 'streak_milestone');

  const conversionEvents = events.filter((e) =>
    ['signup_completed', 'first_win_signup_completed'].includes(e.event)
  );

  const avgStreak =
    streakEvents.length > 0
      ? streakEvents.reduce((sum, e) => sum + (e.data?.streakDays || 0), 0) / streakEvents.length
      : 0;

  return {
    totalShares: shareEvents.length,
    totalAchievements: achievementEvents.length,
    avgStreakDays: Math.round(avgStreak),
    conversionEvents: conversionEvents.length,
  };
};

/**
 * Generate a unique referral code for sharing
 */
export const generateReferralCode = (userId?: string): string => {
  const base = userId || getSessionId();
  const hash = base.split('').reduce((acc, char) => {
    return ((acc << 5) - acc + char.charCodeAt(0)) | 0;
  }, 0);

  return Math.abs(hash).toString(36).substring(0, 6).toUpperCase();
};

/**
 * Get share URL with referral tracking
 * @param gameCode - The game code
 * @param referralCode - Optional referral code
 * @param utmSource - UTM source for tracking (defaults to 'referral')
 */
export const getShareUrlWithTracking = (gameCode: string, referralCode?: string, utmSource: string = 'referral'): string => {
  if (typeof window === 'undefined') return '';

  const baseUrl = window.location.origin;
  const params = new URLSearchParams();
  params.set('room', gameCode);

  if (referralCode) {
    params.set('ref', referralCode);
  }

  // Add UTM tracking for analytics
  params.set('utm_source', utmSource);
  params.set('utm_medium', 'referral');
  params.set('utm_campaign', 'player_invite');

  return `${baseUrl}?${params.toString()}`;
};

/**
 * Track analytics event to server (for guest player tracking)
 * This sends events to the backend for database storage
 */
export const trackAnalyticsEvent = async (
  eventType: string,
  guestName?: string,
  metadata: Record<string, unknown> = {}
): Promise<void> => {
  if (typeof window === 'undefined') return;

  try {
    const utmData = getStoredUtmData();
    const sessionId = getGuestSessionId();
    const storedGuestName = getGuestName();

    const payload = {
      event_type: eventType,
      session_id: sessionId,
      guest_name: guestName || storedGuestName || null,
      utm_source: utmData?.utm_source || utmData?.ref || null,
      utm_medium: utmData?.utm_medium || null,
      utm_campaign: utmData?.utm_campaign || null,
      referrer: utmData?.referrer || null,
      metadata,
    };

    // Fire and forget - don't block on response. Attach the verified bearer
    // token (when signed in) so the server can resolve real player identity.
    const authHeaders = await getAnalyticsAuthHeaders();
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify(payload),
    }).catch((err) => {
      logger.warn('[ANALYTICS] Failed to track event:', err);
    });
  } catch (error) {
    logger.warn('[ANALYTICS] Error tracking event:', error);
  }
};

/**
 * Track guest player joining a game
 */
export const trackGuestJoin = (
  guestName: string,
  gameCode: string,
  language?: string
): void => {
  trackAnalyticsEvent('guest_join', guestName, { gameCode, language });
  trackGrowthEvent('room_joined_via_link', { gameCode, isGuest: true });
};

/**
 * Track guest player game completion
 */
export const trackGuestGameComplete = (
  guestName: string,
  gameCode: string,
  score: number,
  wordCount: number,
  isWinner: boolean
): void => {
  trackAnalyticsEvent('guest_game_complete', guestName, {
    gameCode,
    score,
    wordCount,
    isWinner,
  });
};

/**
 * Track page view with UTM data
 */
export const trackPageView = (path?: string): void => {
  if (typeof window === 'undefined') return;

  const guestName = getGuestName();
  trackAnalyticsEvent('page_view', guestName || undefined, {
    path: path || window.location.pathname,
    search: window.location.search,
  });
};

// In-memory session game counter — resets on tab reload, which is the
// correct granularity for "binge session" analysis.
let sessionGameCount = 0;

/**
 * Fire activation funnel events once per device.
 *
 * Callers: trackGameEnd (all modes) + tutorial completion (engineered win).
 * Dedup via localStorage so whichever fires first wins the slot.
 */
export const markFirstGameActivation = (args: {
  won: boolean;
  score: number;
  wordCount: number;
  mode: string;
}): void => {
  if (typeof window === 'undefined') return;
  const { won, score, wordCount, mode } = args;
  const playedKey = 'lexiclash_first_game_played';
  const wonKey = 'lexiclash_first_game_won';

  try {
    if (!localStorage.getItem(playedKey)) {
      localStorage.setItem(playedKey, '1');
      trackGrowthEvent('first_game_played', { score, wordCount, gameMode: mode });
      trackGA4Event('funnel_first_game', { mode });
      // Pay the referrer, if this player arrived through someone's link. This is
      // the only place that detects a genuine first game exactly once, and the
      // endpoint had never been called by anything — 0 milestone rewards had ever
      // been granted. It no-ops server-side for players who weren't referred.
      // Fire-and-forget: a reward report must never block the end-of-game path.
      // `requireSession`: a referral reward is credited against a profile, so this endpoint
      // is meaningless without a session — and most first games are played logged out. It
      // fired anyway and 401'd, which is the single most common network error in session
      // replay (103 sessions in one week).
      void postWithAuth('/api/referral/milestone', {
        milestone: 'first_game_played',
        metadata: { totalScore: score },
      }, { requireSession: true }).catch(() => {});
    }
    if (won && !localStorage.getItem(wonKey)) {
      localStorage.setItem(wonKey, '1');
      // First-win-fast: how long from first game start to this win (D1 target
      // is a win-feeling moment inside 60s). Null when the clock never stamped.
      const timeToFirstWinSec = consumeFirstWinClockSeconds();
      trackGrowthEvent('first_game_won', {
        score,
        wordCount,
        gameMode: mode,
        time_to_first_win_sec: timeToFirstWinSec,
        under_60s: timeToFirstWinSec != null ? timeToFirstWinSec < 60 : undefined,
      });
      // Re-engagement: arm the push-opt-in prompt to fire right after the win
      // (PushNotificationPrompt listens for FIRST_WIN_EVENT / polls the flag).
      markFirstWinPromptPending();
    }
  } catch {
    /* localStorage unavailable (private mode, quota) — activation best-effort */
  }
};

/**
 * Marketing-name → engine-name vocab map for the home screen mode cards.
 *
 * `trackModeSelected` receives the marketing name (what the card says, e.g.
 * "quickPlay", "arena"). `trackGameStart` receives the engine name (e.g.
 * "singleplayer", "multiplayer"). Without a translation, PostHog funnels
 * broken-down by either prop never link the two events, hiding the real
 * conversion (PostHog 2026-04-27 sweep: blast 27→0, connections 18→0).
 *
 * Add new mode cards here whenever a marketing label diverges from its engine
 * label. If marketing == engine, you can omit the entry — `engineModeFor`
 * falls back to the input.
 */
const MODE_SELECTED_TO_ENGINE: Record<string, string> = {
  quickPlay: 'singleplayer',
  practice: 'singleplayer',
  arena: 'multiplayer',
  // identity-mapped (kept explicit for self-documentation):
  blast: 'blast',
  adventure: 'adventure',
  connections: 'connections',
  brainGym: 'brainGym',
};

export function engineModeFor(uiMode: string): string {
  return MODE_SELECTED_TO_ENGINE[uiMode] ?? uiMode;
}

/**
 * Track game start across any mode (SP, MP, daily, adventure, drill, blast)
 */
export const trackGameStart = (
  mode: string,
  extras: Record<string, unknown> = {}
): void => {
  sessionGameCount += 1;
  // gameMode/engineMode defaults first so MP callers' explicit engineMode:'multiplayer'
  // + gameMode:'<resolved>' override them (nightly splits MP rounds by mode). The
  // canonical `mode` goes LAST so extras can never clobber it — matches trackGameEnd's
  // ordering and the mode-property contract test.
  trackGrowthEvent('game_started', {
    gameMode: mode,
    engineMode: mode,
    ...extras,
    mode,
  });
  trackSessionDepth(sessionGameCount);
  markGameActive(mode);
  // First-win-fast: start the clock on a brand-new player's first game so the
  // eventual `first_game_won` carries time_to_first_win_sec (target: <60s).
  stampFirstWinClockStart();
};

/**
 * Track game completion across any mode
 */
export const trackGameEnd = (
  mode: string,
  score: number,
  wordCount: number,
  completed: boolean,
  durationSec?: number,
  extras: Record<string, unknown> = {}
): void => {
  // Game lifecycle ended (either path) — clear active flag so a later pagehide
  // does not double-emit `game_abandoned`.
  markGameInactive();

  trackGrowthEvent(completed ? 'game_completed' : 'game_abandoned', {
    ...extras,
    mode,
    gameMode: mode,
    score,
    wordCount,
    durationSec,
  });

  // Lifetime person properties — enable cohort slicing in PostHog
  // (e.g. "players with ≥10 games" × "first_mode_played = adventure").
  if (completed) {
    incrementGamesCompletedCount();
    incrementGamesPlayed();
    incrementPostHogUserProp('total_games_played', 1);
    if (wordCount > 0) incrementPostHogUserProp('total_words_found', wordCount);
    setPostHogUserProps({
      last_played_at: new Date().toISOString(),
      last_mode: mode,
      last_score: score,
    });
    setPostHogUserPropsOnce({
      first_mode_played: mode,
      first_played_at: new Date().toISOString(),
    });

    markFirstGameActivation({
      won: extras.isWinner === true,
      score,
      wordCount,
      mode,
    });

    // Daily retention streak: every completed game counts as "played today"
    // (D1 habit loop). Idempotent within a UTC day; emits streak_day_recorded
    // / streak_freeze_used / streak_broken / streak_milestone.
    trackRetentionPlay({ mode });

    // Award Play Games Services leaderboard score + achievements.
    // Fire-and-forget; the bridge is a no-op off Android and never throws.
    void awardGameEnd({
      mode,
      score,
      wordCount,
      isWinner: extras.isWinner === true,
      language: getCurrentLanguage() ?? undefined,
    });

    // Seed reviews: on a win, maybe surface the native Play review sheet.
    // Self-gated (win-threshold + throttle), native-Android-only, never throws.
    if (extras.isWinner === true) void maybeRequestReviewAfterWin();
  } else if (durationSec !== undefined && durationSec < 15) {
    // Rage-quit: abandoned a game within 15s — strong onboarding-friction signal.
    trackRageQuit({ mode, durationMs: durationSec * 1000, wordsFound: wordCount });
  }
};

/**
 * Track game end due to error/crash/disconnect.
 * Emits game_abandoned with error_reason recorded in metadata.
 * Intended for catastrophic client-side errors that terminate a session.
 *
 * @param mode - Game mode
 * @param errorReason - Human-readable error reason (e.g. 'connection_lost', 'crash_detected')
 * @param extras - Optional additional metadata (merged into event data)
 */
export const trackGameError = (
  mode: string,
  errorReason: string,
  extras: Record<string, unknown> = {}
): void => {
  trackGameEnd(mode, 0, 0, false, undefined, {
    ...extras,
    errorReason,
    error_reason: errorReason, // Alias for backend clarity
  });
};

/**
 * Track adventure level events
 */
export const trackAdventureLevel = (
  action: 'start' | 'pass' | 'fail' | 'quit',
  world: number,
  level: number,
  extras: Record<string, unknown> = {}
): void => {
  const eventMap = {
    start: 'adventure_level_start' as const,
    pass: 'adventure_level_pass' as const,
    fail: 'adventure_level_fail' as const,
    quit: 'adventure_quit' as const,
  };
  trackGrowthEvent(eventMap[action], { ...extras, world, level });
};

/**
 * Track mode selection from home screen
 */
export const trackModeSelected = (mode: string, fromScreen: string = 'home'): void => {
  trackGrowthEvent('mode_selected', {
    gameMode: mode,
    fromScreen,
    engineMode: engineModeFor(mode),
  });
};

/**
 * Track first use of a feature (deduplicated in localStorage)
 */
export const trackFeatureFirstUse = (feature: string): void => {
  if (typeof window === 'undefined') return;
  const key = `lexiclash_first_use_${feature}`;
  if (localStorage.getItem(key)) return;
  localStorage.setItem(key, '1');
  trackGrowthEvent('feature_first_use', { feature });
};

/**
 * Track daily puzzle engagement
 */
export const trackDailyPuzzle = (
  action: 'opened' | 'completed',
  puzzleType: string,
  extras: Record<string, unknown> = {}
): void => {
  trackGrowthEvent(
    action === 'opened' ? 'daily_puzzle_opened' : 'daily_puzzle_completed',
    { ...extras, puzzleType }
  );
};

/**
 * Track hint usage
 */
export const trackHintUsed = (mode: string, hintType: string = 'standard'): void => {
  trackGrowthEvent('hint_used', { gameMode: mode, hintType });
};

/**
 * Track UI language switches. Registers `locale` as a PostHog super prop so
 * all subsequent events auto-carry it — critical for per-locale cohorting.
 * Also writes last-touch + first-touch person props.
 */
/**
 * Rewarded-ad funnel: surface = which UI showed the CTA.
 * Fires when the button/modal is rendered for the user (before click).
 */
export const trackRewardedAdOffered = (
  surface: string,
  extras: Record<string, unknown> = {},
): void => {
  trackGrowthEvent('rewarded_ad_offered', { surface, ...extras });
};

/**
 * Rewarded-ad success: reward granted. `platform` is the ad network that served.
 */
export const trackRewardedAdWatched = (
  platform: string,
  reward: number,
  surface?: string,
): void => {
  trackGrowthEvent('rewarded_ad_watched', { platform, reward, surface });
};

/**
 * Rewarded-ad dismiss/error: no reward granted. `reason` classifies drop-off.
 */
export const trackRewardedAdDeclined = (
  reason: string,
  platform?: string,
  surface?: string,
): void => {
  trackGrowthEvent('rewarded_ad_declined', { reason, platform, surface });
};

/** Stages of the native rewarded-ad lifecycle (useAdMob.showRewarded). */
export type RewardedLifecycleStage =
  | 'prepare_start'
  | 'prepare_resolved'
  | 'show_called'
  | 'show_resolved'
  | 'rewarded'
  | 'dismissed'
  | 'failed_to_show'
  | 'failed_to_load'
  | 'prepare_timeout'
  | 'safety_timeout'
  | 'visibility_reconcile';

/**
 * Breadcrumb one stage of the native rewarded-ad lifecycle. Fires on every
 * transition so production traffic can pinpoint where a "stuck ad / no reward"
 * session stalls — e.g. reaches `rewarded` but never `dismissed` (the X tap
 * isn't tearing the ad down), or hits `safety_timeout` (nothing fired at all).
 */
export const trackRewardedLifecycle = (
  stage: RewardedLifecycleStage,
  surface: string,
): void => {
  trackGrowthEvent('rewarded_ad_lifecycle', { stage, surface });
};

/** Age-gate prompt funnel stages (AgeGatePromptWrapper). */
export type AgeGateStage = 'shown' | 'declared' | 'dismissed';

export const trackAgeGate = (stage: AgeGateStage): void => {
  trackGrowthEvent('age_gate', { stage });
};

/** Stages of the native interstitial-ad lifecycle (useAdMob.showInterstitial). */
export type InterstitialLifecycleStage =
  | 'eligible'        // passed the frequency/cap gate — an ad will be attempted
  | 'prepare_start'   // warm slot empty → cold-loading at show time
  | 'prepare_resolved'
  | 'no_fill'         // still not ready after (cold) prepare → skip show, slot preserved
  | 'show_called'     // AdMob.showInterstitial() invoked (native Activity about to front)
  | 'show_resolved'   // showInterstitial() promise resolved (the show call returned)
  | 'dismissed'       // Dismissed event — user closed the ad, Activity torn down
  | 'failed_to_show'
  | 'failed_to_load'
  | 'safety_timeout'  // no terminal event fired within the safety window
  | 'error';          // showInterstitial() threw

/**
 * Breadcrumb one stage of the native interstitial-ad lifecycle. Fires on every
 * transition so production traffic can pinpoint the "interstitials show blank
 * screens" report: e.g. reaching `show_called` then `dismissed` cleanly (so a
 * blank is the WebView failing to repaint after teardown), vs `no_fill` /
 * `failed_to_show` (the ad surface itself never filled), vs `safety_timeout`
 * (the native ad stalled and fired nothing). Mirrors trackRewardedLifecycle.
 */
export const trackInterstitialLifecycle = (
  stage: InterstitialLifecycleStage,
): void => {
  trackGrowthEvent('interstitial_ad_lifecycle', { stage });
};

/**
 * Onboarding funnel — fires once on mount of OnboardingFlow.
 * Paired with `onboarding_step_completed` to build FTUE funnel in PostHog.
 */
export const trackOnboardingStart = (extras: Record<string, unknown> = {}): void => {
  trackGrowthEvent('onboarding_started', extras);
};

/** Onboarding step completion — fires as the user advances through the FTUE. */
export const trackOnboardingStep = (
  step: OnboardingStep,
  extras: Record<string, unknown> = {},
): void => {
  trackGrowthEvent('onboarding_step_completed', { step, ...extras });
};

/**
 * Onboarding tutorial activation — fires on first word found per attempt.
 * `attemptNumber` preserves retry-loop signal (1 = first try; >1 = after score-reveal retry).
 */
export const trackOnboardingFirstWord = (
  word: string,
  attemptNumber: number,
  extras: Record<string, unknown> = {},
): void => {
  trackGrowthEvent('onboarding_first_word_found', { word, attemptNumber, ...extras });
};

/**
 * Onboarding completed — fires when the user reaches the mode-fork (FTUE
 * fully done). Caller passes `step_count` (how many steps fired) and
 * `duration_ms` so PostHog can render a completion-rate funnel + median
 * time-to-onboard. Pair with `onboarding_started` for the conversion
 * denominator.
 */
export const trackOnboardingCompleted = (
  extras: { step_count: number; duration_ms: number } & Record<string, unknown>,
): void => {
  trackGrowthEvent('onboarding_completed', extras);
};

/**
 * Onboarding skipped — fires when the user bails (closes/skips) before
 * reaching the mode-fork. `at_step` carries the last step they saw so we
 * can spot drop-off hotspots, `duration_ms` measures patience.
 */
export const trackOnboardingSkipped = (
  extras: { at_step: OnboardingStep | 'unknown'; duration_ms: number } & Record<string, unknown>,
): void => {
  trackGrowthEvent('onboarding_skipped', extras);
};

/**
 * Onboarding quick-play — fires when the user takes the FTUE fast lane that
 * lands them in an auto-started practice game with zero extra taps: the
 * one-screen quickStart PLAY, the "Skip → Play Now" escape on any FTUE step,
 * or style-step completion. `source` discriminates which entry fired it.
 * This is the D1-retention experiment metric — pair with the return_visit
 * funnel from t_cce75cc7.
 *
 * Does NOT fire when "Skip → Play Now" is used while a room invite is
 * pending — that exit lands in the room, not practice, and is tracked via
 * `trackInviteConsumed({ path: 'quick_play' })` instead.
 */
export const trackOnboardingQuickPlay = (
  extras: { source: 'quick_start' | 'ftue_skip' | 'style_complete' } & Record<string, unknown>,
): void => {
  trackGrowthEvent('onboarding_quick_play', extras);
};

export type FirstSessionDailyVariant = 'first_session' | 'daily_open' | 'already_played';

/**
 * First-session Daily pitch — shown on PracticeResults after the FTUE
 * auto-start game. Pair `first_session_daily_shown` → `_clicked` with
 * next-day `return_visit` to measure the D1 lift.
 */
export const trackFirstSessionDailyShown = (
  extras: { variant: FirstSessionDailyVariant } & Record<string, unknown>,
): void => {
  trackGrowthEvent('first_session_daily_shown', extras);
};

export const trackFirstSessionDailyClicked = (
  extras: { variant: FirstSessionDailyVariant } & Record<string, unknown>,
): void => {
  trackGrowthEvent('first_session_daily_clicked', extras);
};

/** Modal action discriminator for funnel analysis. */
export type ModalAction = 'shown' | 'dismissed' | 'confirmed';

/**
 * Track modal shown / dismissed / confirmed (quit-confirm, streak-broken, etc).
 * Single event + action discriminator → clean PostHog funnels.
 */
export const trackModalInteraction = (
  modalId: string,
  action: ModalAction,
  extras: Record<string, unknown> = {},
): void => {
  trackGrowthEvent('modal_interaction', { modalId, action, ...extras });
};

/**
 * Dead-time detected — fires once per round when user is idle past threshold.
 * Signal for engagement friction (stuck, distracted, or interface issue).
 */
export const trackDeadTime = (
  gameMode: string,
  thresholdMs: number,
  extras: Record<string, unknown> = {},
): void => {
  trackGrowthEvent('dead_time_detected', { gameMode, thresholdMs, ...extras });
};

/**
 * Landing-page CTA click. Used to diagnose the visitor → onboarding_started
 * gap (88 of 95 visitors drop pre-onboarding). `cta` is a stable id for the
 * surface (e.g. 'mode_card', 'hero_play'); extras carry disambiguators
 * (mode, variant) for breakdowns.
 */
export const trackLandingCtaClick = (
  cta: string,
  extras: Record<string, unknown> = {},
): void => {
  trackGrowthEvent('landing_cta_clicked', { ...extras, cta });
};

export const trackLanguageChanged = (from: string, to: string): void => {
  if (from === to) return;
  trackGrowthEvent('language_changed', { from, to });
  setPostHogSuperProps({ locale: to });
  setPostHogUserProps({ locale_last_used: to });
  setPostHogUserPropsOnce({ locale_first_used: to });
};

/**
 * Tier-position-panel exposure. Fires once per panel mount per session.
 * Powers the `tier-position-panel` experiment uplift analysis on /leaderboard.
 */
export const trackTierPositionViewed = (props: {
  tier_id: string;
  rank_in_tier: number;
  tier_population: number;
  percentile: number;
  season_id: number | null;
}): void => {
  try {
    posthog.capture('tier_position_viewed', props);
  } catch {
    // PostHog not initialized — silent
  }
};

/**
 * Click on a peer row inside TierPositionPanel. Tracks whether the
 * social-comparison piece converts into /player/[id] visits.
 */
export const trackTierPeerClicked = (props: {
  tier_id: string;
  peer_rank_in_tier: number;
  was_above: boolean;
}): void => {
  try {
    posthog.capture('tier_peer_clicked', props);
  } catch {
    // PostHog not initialized — silent
  }
};

/**
 * 50% / 90% progress milestone within current tier. Caller dedupes
 * per session (use a ref guard at the call site).
 */
export const trackTierProgressionMilestone = (props: {
  tier_id: string;
  milestone_pct: 50 | 90;
  score: number;
}): void => {
  try {
    posthog.capture('tier_progression_milestone', props);
  } catch {
    // PostHog not initialized — silent
  }
};

/**
 * Highlight reel start — fires when the user opens the highlights generator.
 * `topEpicness` is the max epicness score of all clips in the buffer.
 * `clipCount` is how many clips are available to pick from.
 */
export const trackHighlightStart = (payload: {
  topEpicness: number;
  clipCount: number;
}): void => {
  try {
    posthog.capture('highlight_started', payload);
  } catch {
    // PostHog not initialized — silent
  }
};

/**
 * Highlight reel skip — fires when the user skips a clip during playback.
 * `clipIndex` is the position in the reel (0-indexed).
 * `elapsedMs` is how long they watched before skipping.
 */
export const trackHighlightSkipped = (payload: {
  clipIndex: number;
  elapsedMs: number;
}): void => {
  try {
    posthog.capture('highlight_skipped', payload);
  } catch {
    // PostHog not initialized — silent
  }
};

/**
 * Highlight buffer overflow — fires when the clip buffer exceeds max capacity.
 * `eventsDropped` is how many clips were discarded to make room.
 */
export const trackHighlightBufferOverflow = (payload: {
  eventsDropped: number;
}): void => {
  try {
    posthog.capture('highlight_buffer_overflow', payload);
  } catch {
    // PostHog not initialized — silent
  }
};

const growthTracking = {
  trackGrowthEvent,
  trackShare,
  trackAchievement,
  trackStreakMilestone,
  trackGameCompletion,
  trackSignupFunnel,
  getGrowthMetricsSummary,
  generateReferralCode,
  getShareUrlWithTracking,
  getReferralSource,
  trackAnalyticsEvent,
  trackGuestJoin,
  trackGuestGameComplete,
  trackPageView,
  trackGameStart,
  trackGameEnd,
  trackAdventureLevel,
  trackModeSelected,
  trackFeatureFirstUse,
  trackDailyPuzzle,
  trackHintUsed,
  trackLandingCtaClick,
  trackLanguageChanged,
  trackOnboardingStart,
  trackOnboardingStep,
  trackOnboardingFirstWord,
  trackModalInteraction,
  trackDeadTime,
  trackRewardedAdOffered,
  trackRewardedAdWatched,
  trackRewardedAdDeclined,
};

// ── Invite onboarding events ──────────────────────────────────────────
// Funnel for first-time users who land via an MP-room invite link.

interface InviteLandedProps {
  roomCode: string;
  hasHostName: boolean;
  isFirstTimeUser: boolean;
}

export const trackInviteLanded = (props: InviteLandedProps): void => {
  try {
    posthog.capture('invite_landed', props);
  } catch { /* silent — posthog not initialised */ }
};

export const trackInviteTutorialStarted = (props: { roomCode: string }): void => {
  try {
    posthog.capture('invite_tutorial_started', props);
  } catch { /* silent */ }
};

interface InviteTutorialWordFoundProps {
  roomCode: string;
  word: string;
  secondsSinceStart: number;
}

export const trackInviteTutorialWordFound = (props: InviteTutorialWordFoundProps): void => {
  try {
    posthog.capture('invite_tutorial_word_found', props);
  } catch { /* silent */ }
};

interface InviteTutorialSkippedProps {
  roomCode: string;
  step: 'profile' | 'tutorial';
  secondsSinceLanded: number;
}

export const trackInviteTutorialSkipped = (props: InviteTutorialSkippedProps): void => {
  try {
    posthog.capture('invite_tutorial_skipped', props);
  } catch { /* silent */ }
};

interface InviteConsumedProps {
  roomCode: string;
  path: 'tutorial' | 'skip' | 'direct' | 'quick_play';
  totalSeconds: number;
}

export const trackInviteConsumed = (props: InviteConsumedProps): void => {
  try {
    posthog.capture('invite_consumed', props);
  } catch { /* silent */ }
};

// Counterpart to `invite_landed`: the invited room was gone by the time the
// auto-join fired (expired / host left / never existed). Pairs with the
// "room is no longer available" toast so the dead-invite rate is visible on
// the growth dashboards, not just the successful-landing rate.
export const trackInviteRoomDead = (props: { roomCode: string }): void => {
  try {
    posthog.capture('invite_room_dead', props);
  } catch { /* silent — posthog not initialised */ }
};

// Fires when a returning user's client-side redirect to /multiplayer fires.
// Fills the funnel gap between invite_landed and invite_consumed for returning
// users (new users fire invite_consumed via useInviteOnboardingMode instead).
interface InviteRedirectFiredProps {
  roomCode: string;
  variant: string; // exp-invite-arrival-clarity-v1 variant
}

export const trackInviteRedirectFired = (props: InviteRedirectFiredProps): void => {
  try {
    posthog.capture('invite_redirect_fired', props);
  } catch { /* silent */ }
};

interface PracticePendingBannerProps {
  roomCode: string;
  secondsOnPracticeHub: number;
}

export const trackPracticePendingBannerClicked = (props: PracticePendingBannerProps): void => {
  try {
    posthog.capture('practice_pending_banner_clicked', props);
  } catch { /* silent */ }
};

export default growthTracking;
