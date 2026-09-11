/**
 * A launch outlives the component that started it.
 *
 * The express screen fires one side effect that ends in a navigation. Tying
 * that to a React effect was wrong twice over: dev double-mount ran the
 * cleanup between the classroom being created and the lesson being created, so
 * the run marked itself stale and the room was never asked for — a spinner
 * that never resolved, in front of a class. And on a genuine remount the guard
 * either restarts the work (two rooms) or blocks it (no room).
 *
 * So a launch is keyed by the intent, kept here, and a mount only SUBSCRIBES.
 * The store is deliberately tiny and framework-free — `useSyncExternalStore`
 * on the component side is the whole integration.
 */

import type { QuickLaunchFailure, QuickLaunchStage } from './ClassroomGameLobbyExpressRunner';

export interface LaunchSnapshot {
  stage: QuickLaunchStage;
  failure: QuickLaunchFailure | null;
  /** Set once the SERVER confirmed the room; the caller then navigates. */
  gameCode: string | null;
  /**
   * The mode this launch settled on, as soon as the runner knows it.
   *
   * The express screen shows a poster strip while the room spins up, and it
   * cannot highlight the live mode without being told: the mode is derived
   * inside the runner from the lesson's own words, which the screen has never
   * seen. `null` until the runner gets that far.
   */
  mode: string | null;
}

export interface LaunchControl {
  setStage: (stage: QuickLaunchStage) => void;
  /** Announce the mode the runner derived, so the strip can mark it. */
  setMode: (mode: string) => void;
  fail: (failure: QuickLaunchFailure) => void;
  succeed: (gameCode: string) => void;
  /** Torn down when the launch is abandoned (retry, or the teacher walks out). */
  onDispose: (fn: () => void) => void;
}

interface Launch {
  /**
   * Frozen and REPLACED on every change, never mutated in place —
   * `useSyncExternalStore` compares snapshots by identity, and a mutable
   * object would render once and then never again.
   */
  snapshot: LaunchSnapshot;
  disposers: Array<() => void>;
  settled: boolean;
}

const launches = new Map<string, Launch>();
/**
 * Listeners live OUTSIDE the launch, keyed the same way. A component
 * subscribes during render-commit, before its own effect has started the
 * launch, so the subscription cannot depend on the launch existing yet.
 */
const listeners = new Map<string, Set<() => void>>();

function emit(key: string): void {
  listeners.get(key)?.forEach((fn) => fn());
}

function update(key: string, launch: Launch, next: Partial<LaunchSnapshot>): void {
  launch.snapshot = { ...launch.snapshot, ...next };
  emit(key);
}

/** Start the launch for `key`, or do nothing if one is already in flight. */
export function ensureLaunch(key: string, start: (control: LaunchControl) => void): void {
  if (launches.has(key)) return;
  const launch: Launch = {
    snapshot: { stage: 'classroom', failure: null, gameCode: null, mode: null },
    disposers: [],
    settled: false,
  };
  launches.set(key, launch);
  emit(key);

  start({
    setStage: (stage) => {
      if (launch.settled || launch.snapshot.stage === stage) return;
      update(key, launch, { stage });
    },
    setMode: (mode) => {
      if (launch.settled || launch.snapshot.mode === mode) return;
      update(key, launch, { mode });
    },
    // First cause wins. A watchdog firing after the real error would otherwise
    // rename the problem to "timeout" and send the teacher down the wrong path.
    fail: (failure) => {
      if (launch.settled) return;
      launch.settled = true;
      update(key, launch, { failure });
    },
    succeed: (gameCode) => {
      if (launch.settled) return;
      launch.settled = true;
      update(key, launch, { gameCode });
    },
    onDispose: (fn) => {
      launch.disposers.push(fn);
    },
  });
}

export function getLaunch(key: string): LaunchSnapshot | undefined {
  return launches.get(key)?.snapshot;
}

export function subscribeLaunch(key: string, listener: () => void): () => void {
  let set = listeners.get(key);
  if (!set) {
    set = new Set();
    listeners.set(key, set);
  }
  set.add(listener);
  return () => {
    set.delete(listener);
    if (set.size === 0) listeners.delete(key);
  };
}

/** Drop a launch and run whatever it registered (socket disconnect, timers). */
export function abandonLaunch(key: string): void {
  const launch = launches.get(key);
  if (!launch) return;
  launches.delete(key);
  emit(key);
  launch.disposers.forEach((fn) => {
    try {
      fn();
    } catch {
      /* a disposer must never block the next one */
    }
  });
  launch.disposers.length = 0;
}

export function resetLaunchesForTest(): void {
  [...launches.keys()].forEach(abandonLaunch);
}
