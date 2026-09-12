'use client';

/**
 * The overlay quiet zone — "is this a moment nothing is allowed to cover?"
 *
 * THREE prompts have now covered a round-end payoff in a row: the SHOW OFF /
 * share modal, the cookie sheet (measured sitting on a live board for ~36s of a
 * guest's round), and the "Make LexiClash yours" style picker, which opened
 * full-screen over a student's YOU WON recap. Each was fixed where it was
 * found. This is the shared rule they should all have been reading.
 *
 * WHY NOT A ROUTE LIST. `lib/inGameSurface.ts` already argued this and it still
 * holds: appending `/word-tower`, `/crossword`, `/word-craft` to a list never
 * converged, because the list is written by whoever shipped the last bug. Worse
 * here — the classroom round-end recap lives on `/multiplayer`, the ONE route
 * deliberately kept out of `GAME_ROUTES` so its passive lobby can still
 * monetise. A surface that must not be covered says so itself.
 *
 * THREE INPUTS, ONE ANSWER:
 *  1. CLAIMS — a surface calls `claimOverlayQuietZone('classroom-results')` while
 *     it is mounted (see `useOverlayQuietZoneClaim`). This is the authoritative
 *     input: the student recap, the projector results, a lobby.
 *  2. THE IN-GAME BODY CLASS — `screen-fit-locked`, already set by
 *     `NavigationContext` for every fullscreen game present and future. Read
 *     live from the DOM, so no surface has to opt in twice.
 *  3. A GRACE WINDOW after either goes away, and after
 *     `noteOverlayQuietZoneGameOver()`.
 *
 * WHY THE GRACE WINDOW IS LOAD-BEARING (pitfalls class 1: two sources, one
 * resolves later). `PlayerStyleOnboardingWrapper` decides on an 800ms timer
 * started the moment `gameActive` flips false. The recap that would claim the
 * zone arrives in a `next/dynamic` chunk. Without a grace window, whether the
 * modal covers the podium is a race between a chunk and a timer — and losing it
 * is permanent, because that wrapper writes its "shown" marker at show time and
 * latches for the session. The zone therefore opens at round end and holds
 * until the recap's own claim takes over, so the pessimistic state is the one
 * rendered while the late source resolves.
 *
 * DEFER, NEVER DROP. Consumers must keep their "I want to open" state and
 * re-check when the zone clears — every consumer here subscribes, so the
 * re-check is a re-render, not a poll. A prompt that consumes a one-shot flag
 * (the push prompt's first-win pending flag) must consult the zone BEFORE
 * consuming it.
 *
 * The active reason is mirrored onto `<body data-overlay-quiet-zone="...">` on
 * purpose: a capture agent can sample it the way `[data-round-end-stage]` is
 * sampled and prove the zone was up while the recap was on screen. An absent
 * modal is not evidence; this is.
 */

import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { IN_GAME_BODY_CLASS, isInGameSurface } from './inGameSurface';

/**
 * How long the zone survives its last hard input. Long enough to bridge a
 * dynamic chunk mounting after round end (measured sub-second on a warm dev
 * server, seconds on a cold phone), short enough that a prompt held back at the
 * end of an ordinary game is late rather than lost.
 */
export const OVERLAY_QUIET_ZONE_GRACE_MS = 6000;

/** Mirrored on <body> while the zone is active. Value = the active reasons. */
export const OVERLAY_QUIET_ZONE_ATTR = 'data-overlay-quiet-zone';

type Listener = () => void;

const claims = new Map<symbol, string>();
const listeners = new Set<Listener>();

/**
 * When the last hard input (a claim, the in-game class, a game-over) was seen.
 * 0 = never, so a page that has never hosted a game has no grace window at all.
 */
let releasedAt = 0;
let graceTimer: ReturnType<typeof setTimeout> | null = null;
let observer: MutationObserver | null = null;
/** Last DOM reading, so the observer can spot the true→false edge. */
let bodyWasInGame = false;

function hardActive(): boolean {
  return claims.size > 0 || isInGameSurface();
}

function graceRemaining(now: number): number {
  if (releasedAt === 0) return 0;
  return Math.max(0, releasedAt + OVERLAY_QUIET_ZONE_GRACE_MS - now);
}

/**
 * Synchronous truth. Reads the DOM rather than cached state so the very first
 * render of a consumer — before any effect or observer has run — is already
 * correct, instead of optimistically painting "no game here".
 */
export function isOverlayQuietZoneActive(): boolean {
  if (hardActive()) return true;
  return graceRemaining(Date.now()) > 0;
}

/** The reason string published on <body>, or null when the zone is closed. */
export function overlayQuietZoneReason(): string | null {
  if (claims.size > 0) return Array.from(new Set(claims.values())).join(' ');
  if (isInGameSurface()) return 'in-game';
  if (graceRemaining(Date.now()) > 0) return 'round-end-grace';
  return null;
}

function syncBodyAttribute(): void {
  if (typeof document === 'undefined') return;
  const reason = overlayQuietZoneReason();
  if (reason) document.body.setAttribute(OVERLAY_QUIET_ZONE_ATTR, reason);
  else document.body.removeAttribute(OVERLAY_QUIET_ZONE_ATTR);
}

function emit(): void {
  syncBodyAttribute();
  listeners.forEach((listener) => listener());
}

/**
 * Wake every consumer the instant the grace window ends. Without this the zone
 * would only "expire" on some unrelated re-render, which is exactly the silent
 * no-op that turns a deferred prompt into a dropped one.
 */
function scheduleGraceEnd(): void {
  if (graceTimer) clearTimeout(graceTimer);
  const remaining = graceRemaining(Date.now());
  if (remaining <= 0) return;
  graceTimer = setTimeout(() => {
    graceTimer = null;
    emit();
  }, remaining + 1);
}

/** Called whenever a hard input goes away — starts the grace window from NOW. */
function beginGrace(): void {
  releasedAt = Date.now();
  scheduleGraceEnd();
}

/**
 * Round is over. Opens the zone even though nothing has claimed it yet, so the
 * prompts that decide on a timer can never win the race against the recap.
 */
export function noteOverlayQuietZoneGameOver(): void {
  beginGrace();
  emit();
}

/**
 * Hold the zone open. Returns the release function — call it on unmount.
 * Reason is a short surface name; it lands on the body attribute.
 */
export function claimOverlayQuietZone(reason: string): () => void {
  const token = Symbol(reason);
  claims.set(token, reason);
  if (graceTimer) {
    clearTimeout(graceTimer);
    graceTimer = null;
  }
  emit();

  let released = false;
  return () => {
    if (released) return;
    released = true;
    claims.delete(token);
    if (!hardActive()) beginGrace();
    emit();
  };
}

function startObserver(): void {
  if (observer || typeof document === 'undefined') return;
  bodyWasInGame = isInGameSurface();
  observer = new MutationObserver(() => {
    const nowInGame = isInGameSurface();
    if (nowInGame === bodyWasInGame) return;
    bodyWasInGame = nowInGame;
    // Leaving a game surface is a round end in every mode the app has, whether
    // or not a results component ever mounts.
    if (!nowInGame) beginGrace();
    emit();
  });
  observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
}

function stopObserver(): void {
  observer?.disconnect();
  observer = null;
}

/** Subscribe to zone changes. The observer runs only while someone listens. */
export function subscribeOverlayQuietZone(listener: Listener): () => void {
  listeners.add(listener);
  startObserver();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) stopObserver();
  };
}

/** Reactive read for a component deciding whether it may open. */
export function useOverlayQuietZone(): boolean {
  return useSyncExternalStore(
    subscribeOverlayQuietZone,
    isOverlayQuietZoneActive,
    () => false,
  );
}

/**
 * Hold the zone for as long as `active` and this component are alive. The
 * round-end recap and the projector results call this; so should any future
 * surface whose moment must not be covered.
 */
export function useOverlayQuietZoneClaim(active: boolean, reason: string): void {
  useEffect(() => {
    if (!active) return undefined;
    return claimOverlayQuietZone(reason);
  }, [active, reason]);
}

/**
 * Convenience for a prompt: `[mayOpen, quietZone]`. `mayOpen` is false while the
 * zone is up; the caller keeps its own "wants to open" state so the prompt is
 * deferred rather than dropped.
 */
export function useOverlayQuietZoneGate(): { quietZone: boolean; mayOpen: () => boolean } {
  const quietZone = useOverlayQuietZone();
  const mayOpen = useCallback(() => !isOverlayQuietZoneActive(), []);
  return { quietZone, mayOpen };
}

/** Test-only: wipe every input so cases cannot leak into each other. */
export function resetOverlayQuietZoneForTests(): void {
  claims.clear();
  listeners.clear();
  releasedAt = 0;
  if (graceTimer) clearTimeout(graceTimer);
  graceTimer = null;
  stopObserver();
  bodyWasInGame = false;
  if (typeof document !== 'undefined') {
    document.body.classList.remove(IN_GAME_BODY_CLASS);
    document.body.removeAttribute(OVERLAY_QUIET_ZONE_ATTR);
  }
}
