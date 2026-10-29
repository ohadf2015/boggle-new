// ---------------------------------------------------------------------------
// Growth Radar mirror — twins a small allowlist of funnel events to Growth
// Radar (window.gr, loaded from growthradar.app/gr.js in app/layout.tsx)
// alongside PostHog. PostHog is consent-gated, so ~97% of human visitors
// never produce growth:* events there and Growth Radar's funnel coverage sat
// at ~3% (t_eb26d5c5). gr.js is first-party and cookieless — mirroring the
// activation spine lets consent-refusers count in the funnel without
// changing the PostHog consent UX.
//
// Guarantees (same pattern as stock-analyzer client/src/lib/growthMirror.ts):
//  - allowlist-only: anything not listed below never goes to Growth Radar
//  - never throws, never blocks: gr is lazyOnload and may be absent
//    (ad-blockers, failed CDN fetch) — the mirror is best-effort telemetry
//  - no PII: email/name/phone/userId keys are stripped from mirrored props
//
// Ordering race (the reason the queue below exists): gr.js loads with
// strategy="lazyOnload" — after the page's own scripts. A first_game_played
// on a cold load can fire BEFORE window.gr exists and would be dropped
// silently. Events fired while gr is absent wait in a small queue and flush
// when gr appears (polled for up to 10s), then the mirror goes back to
// fire-and-forget.
// ---------------------------------------------------------------------------

declare global {
  interface Window {
    gr?: {
      capture?: (event: string, properties?: Record<string, unknown>) => void;
    };
  }
}

/** Events mirrored to Growth Radar as growth:<name> — the activation /
 *  monetization spine Growth Radar already funnels on. Keep explicit and
 *  small; do NOT mirror every GrowthEvent (volume). */
const MIRRORED_EVENTS: ReadonlySet<string> = new Set([
  'session_start',
  'landing_cta_clicked',
  'onboarding_started',
  'onboarding_completed',
  'signup_completed',
  'game_started',
  'first_game_played',
  'first_word_found',
  'game_completed',
  'first_game_won',
  'game_abandoned',
  // First-game bridge tap. Consent-free so the A/B can be read without a
  // PostHog join (growth:next_game_picked { from_mode, to_mode, first_session }).
  'next_game_picked',
  // signup-first-game goal. Must be mirrored or the experiment can never convert
  // (Growth Radar reads events_real, not PostHog). t_3b095edf.
  'account_first_game',
]);

/** Keys matching this are dropped from mirrored props. `name` also covers
 *  username / guest_name / guestName; `userId` is explicit per t_eb26d5c5. */
const SENSITIVE_KEY = /email|name|phone|userId/i;

function sanitizeProps(
  properties?: Record<string, unknown>,
): Record<string, unknown> | undefined {
  if (!properties) return properties;
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(properties)) {
    if (SENSITIVE_KEY.test(key)) continue;
    clean[key] = value;
  }
  return clean;
}

function grCapture(event: string, properties?: Record<string, unknown>): void {
  try {
    const gr = typeof window !== 'undefined' ? window.gr : undefined;
    gr?.capture?.(event, properties);
  } catch {
    // Analytics must never break the game — swallow anything gr throws.
  }
}

// --- pre-gr queue -----------------------------------------------------------
// Events that fire before window.gr exists are held here and flushed (in
// order) once gr appears. Bounded so a broken CDN can never grow memory, and
// abandoned after GIVE_UP_AFTER_MS so the poll does not run forever.
const MAX_PENDING = 20;
const POLL_INTERVAL_MS = 250;
const GIVE_UP_AFTER_MS = 10_000;

interface PendingMirrorEvent {
  event: string;
  properties?: Record<string, unknown>;
}

let pendingEvents: PendingMirrorEvent[] = [];
let pollTimer: ReturnType<typeof setInterval> | null = null;

function grIsReady(): boolean {
  try {
    return typeof window !== 'undefined' && typeof window.gr?.capture === 'function';
  } catch {
    return false;
  }
}

function stopPoll(): void {
  if (pollTimer !== null) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

function flushPending(): void {
  if (!pendingEvents.length) return;
  const events = pendingEvents;
  pendingEvents = [];
  for (const { event, properties } of events) {
    grCapture(event, properties);
  }
}

function startPoll(): void {
  if (pollTimer !== null || typeof window === 'undefined') return;
  const startedAt = Date.now();
  pollTimer = setInterval(() => {
    try {
      if (grIsReady()) {
        stopPoll();
        flushPending();
        return;
      }
      if (Date.now() - startedAt >= GIVE_UP_AFTER_MS) {
        // gr never arrived (ad-blocker, failed CDN fetch) — drop and stop.
        stopPoll();
        pendingEvents = [];
      }
    } catch {
      stopPoll();
    }
  }, POLL_INTERVAL_MS);
  // Never hold a Node process open for analytics (SSR / test runners).
  const timer = pollTimer as unknown as { unref?: () => void };
  if (typeof timer === 'object' && timer !== null && typeof timer.unref === 'function') {
    timer.unref();
  }
}

/** Send now when gr is ready (flushing anything queued first, so order is
 *  preserved); otherwise queue for the poll above. Never throws. */
function grCaptureOrQueue(event: string, properties?: Record<string, unknown>): void {
  try {
    if (grIsReady()) {
      stopPoll();
      flushPending();
      grCapture(event, properties);
      return;
    }
    pendingEvents.push({ event, properties });
    if (pendingEvents.length > MAX_PENDING) pendingEvents.shift();
    startPoll();
  } catch {
    // Analytics must never break the app.
  }
}

/** Test-only hook: clears the queue and stops the poll so no state leaks
 *  between tests. Not part of the app's runtime API. */
export function __resetGrowthRadarMirrorForTests(): void {
  stopPoll();
  pendingEvents = [];
}

/** A developer's machine. next dev posts to the production write key; those
 *  rows are not customers. Match the hosts Growth Radar's events_real drops. */
function isLoopbackPage(): boolean {
  try {
    if (typeof window === 'undefined') return false;
    const host = String(window.location?.hostname ?? '').toLowerCase().replace(/^\[|\]$/g, '').split('%')[0] ?? '';
    return host === 'localhost' || host === '127.0.0.1' || host === '::1' || host.endsWith('.localhost');
  } catch {
    return false;
  }
}

/** Mirror one event to Growth Radar if it is on the allowlist, as
 *  growth:<event> with PII stripped. Never throws. Loopback pages are skipped:
 *  a classroom session on localhost:3011 is not a LexiClash signup. */
export function mirrorGrowthEvent(
  event: string,
  properties?: Record<string, unknown>,
): void {
  if (!MIRRORED_EVENTS.has(event)) return;
  if (isLoopbackPage()) return;
  grCaptureOrQueue(`growth:${event}`, sanitizeProps(properties));
}
