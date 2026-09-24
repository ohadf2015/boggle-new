// ─── SharedFxGate ─────────────────────────────────────────────────────
// First-use gate for the SharedFxApp Pixi layer.
//
// SharedFxMount requests the fullscreen FX layer right after hydration on every
// route. That used to import pixi.js (~195KB br / ~850KB parsed) during first
// load even though nothing can spawn an effect before the visitor does
// something. essential-providers holds this gate at startup; SharedFxApp.mount()
// then waits here before importing pixi. The gate opens, once per page session,
// on the first pointerdown / keydown / touchstart, or on the first spawn* call.
//
// A spawn that arrives while the mount waits is HELD (bounded, and dropped if it
// goes stale) and replayed once the canvas exists: never silently lost.
// When the gate is not held (tests, or any caller that never holds it) mount()
// behaves exactly as before.

const FIRST_USE_EVENTS = ['pointerdown', 'keydown', 'touchstart'] as const;
const MAX_HELD_CALLS = 16;
// A celebration replayed long after its trigger reads as a glitch; skip it.
const HELD_CALL_TTL_MS = 2500;

interface HeldCall {
  at: number;
  replay: () => void;
}

let gate: Promise<void> | null = null;
let release: (() => void) | null = null;
let held: HeldCall[] = [];

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

function onFirstUse(): void {
  openFxGate();
}

function removeFirstUseListeners(): void {
  for (const type of FIRST_USE_EVENTS) window.removeEventListener(type, onFirstUse, true);
}

/** Hold the FX layer until first use. Idempotent; a no-op on the server. */
export function holdFxUntilFirstUse(): void {
  if (typeof window === 'undefined' || gate) return;
  gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  for (const type of FIRST_USE_EVENTS) {
    window.addEventListener(type, onFirstUse, { capture: true, passive: true });
  }
}

/** Open the gate (first interaction or first spawn). Safe to call repeatedly. */
export function openFxGate(): void {
  if (!release) return;
  const resolve = release;
  release = null;
  removeFirstUseListeners();
  resolve();
}

export function isFxGateHeld(): boolean {
  return release !== null;
}

/** Resolves immediately unless the gate is held. */
export function waitForFxGate(): Promise<void> {
  return gate ?? Promise.resolve();
}

/** Keep a spawn for replay after mount, and open the gate so the mount proceeds. */
export function holdFxCall(replay: () => void): void {
  if (held.length < MAX_HELD_CALLS) held.push({ at: now(), replay });
  openFxGate();
}

/** Replay fresh held spawns on the live layer. */
export function flushHeldFxCalls(): void {
  const calls = held;
  held = [];
  const cutoff = now() - HELD_CALL_TTL_MS;
  for (const call of calls) {
    if (call.at < cutoff) continue;
    try {
      call.replay();
    } catch {
      // decorative FX must never break the caller
    }
  }
}

export function dropHeldFxCalls(): void {
  held = [];
}

/** Test-only: restore the pristine (not held) state. */
export function resetFxGateForTests(): void {
  if (typeof window !== 'undefined') removeFirstUseListeners();
  gate = null;
  release = null;
  held = [];
}
