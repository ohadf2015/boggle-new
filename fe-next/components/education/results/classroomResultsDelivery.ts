/**
 * When a student's phone is allowed to show the round it just played.
 *
 * The multiplayer results broadcast carries `tvMode`, and a player normally
 * holds its results back until the host's projector finishes its reveal
 * animation and emits `resultsRevealed`. That is right for an arcade room where
 * the TV IS the show.
 *
 * It is wrong for a classroom, and silently so. Every classroom room is tvMode
 * by construction — `host/hooks/useHostViewState.ts` hard-sets broadcast for any
 * room carrying lesson data — so the deferral applied to thirty student phones
 * that were never watching a TV of their own. Measured on game H3ZS87: the round
 * ended at 02:34:07 and the host revealed at 02:34:23. Sixteen seconds of
 * spinner, with a 25s ceiling behind it, which is why three live capture runs
 * found ZERO student results screens.
 *
 * The wall keeps its drumroll; the phone in a student's hand does not wait for
 * it. A lesson recap on the payload is the signal — it is only ever built for a
 * classroom game (backend/services/gameLifecycle/gameScores.ts).
 *
 * Pure and separate so the 1000-line player socket hook gains a call, not a
 * paragraph, and so the rule can be tested without a socket.
 */

export interface TvRevealGate {
  /** The host is broadcasting to a projector. */
  tvMode?: boolean;
  /** Server-built lesson recap — present only for a classroom room. */
  classroomSummary?: unknown;
}

/** True when this client must wait for the host's `resultsRevealed`. */
export function shouldWaitForTvReveal(payload: TvRevealGate): boolean {
  return !!payload.tvMode && !payload.classroomSummary;
}

export interface TvRevealGateOptions<T extends TvRevealGate> {
  /** Hand the payload to the results screen. Called at most once per gate. */
  onShow: (payload: T) => void;
  /** Held back: stop gameplay and show the "calculating" state meanwhile. */
  onHold: () => void;
  /** Ceiling on the hold, in case the host never reveals (disconnect, tab close). */
  timeoutMs?: number;
}

export interface TvRevealGateHandle<T extends TvRevealGate> {
  /** A `validatedScores` payload arrived. Shows it, or holds it for the reveal. */
  receive: (payload: T) => void;
  /** The host's projector finished its reveal. */
  revealed: () => void;
  /** True once a payload has actually reached the results screen. */
  hasShown: () => boolean;
  /** Teardown — drops any held payload and its timer without firing them. */
  dispose: () => void;
}

/** How long a phone will wait on a projector that may never speak again. */
const REVEAL_CEILING_MS = 25000;

/**
 * The hold itself, as an object with a lifetime instead of four variables
 * scoped to a socket effect.
 *
 * That scoping was the bug. A student's phone drops its socket at the round
 * boundary — the single commonest thing that happens in a classroom — the
 * effect re-registers, and its cleanup threw away both the held payload and the
 * 25s ceiling. The server's resend then hit the hook's "already processed this
 * session" guard and was discarded as a duplicate of a screen nobody had ever
 * seen: no error, no log, no results, forever (Class 4). `hasShown()` is what
 * lets the caller tell "already displayed" apart from "received and lost".
 */
export function createTvRevealGate<T extends TvRevealGate>({
  onShow,
  onHold,
  timeoutMs = REVEAL_CEILING_MS,
}: TvRevealGateOptions<T>): TvRevealGateHandle<T> {
  let pending: T | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let revealedEarly = false;
  let shown = false;
  let disposed = false;

  const clear = () => {
    if (timer) { clearTimeout(timer); timer = null; }
    pending = null;
  };
  const show = (payload: T) => {
    clear();
    shown = true;
    onShow(payload);
  };

  return {
    receive: (payload) => {
      if (disposed) return;
      if (!shouldWaitForTvReveal(payload) || revealedEarly) { show(payload); return; }
      pending = payload;
      onHold();
      timer = setTimeout(() => { if (pending) show(pending); }, timeoutMs);
    },
    revealed: () => {
      if (disposed) return;
      if (!pending) { revealedEarly = true; return; }
      show(pending);
    },
    hasShown: () => shown,
    dispose: () => { disposed = true; clear(); },
  };
}
