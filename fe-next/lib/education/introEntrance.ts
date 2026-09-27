/**
 * Academy mode intros render twice in a row: first as the route's loader
 * (the intro scene with a disabled button), then as the real intro once the
 * lesson data lands — a different component instance, so framer would replay
 * the entrance and a screenshot/glance mid-replay shows a half-built scene.
 * An intro only plays its entrance if the same intro has not mounted within
 * the last few seconds.
 */

const REPLAY_WINDOW_MS = 15_000;
const lastMount = new Map<string, { at: number; instance?: string; play: boolean }>();

/**
 * true = play the entrance animation for this mount. Records the mount either way.
 * `instance` (e.g. React useId) makes a repeated claim by the same mount — StrictMode's
 * double-invoked initialisers — return the same answer.
 */
export function claimIntroEntrance(intro: string, now: number = Date.now(), instance?: string): boolean {
  const prev = lastMount.get(intro);
  if (prev && instance !== undefined && prev.instance === instance) return prev.play;
  const play = prev === undefined || now - prev.at > REPLAY_WINDOW_MS;
  lastMount.set(intro, { at: now, instance, play });
  return play;
}
