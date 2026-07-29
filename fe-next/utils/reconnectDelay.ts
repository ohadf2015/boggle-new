/**
 * Per-client jittered reconnect delay for the planned server-shutdown →
 * restart (deploy) window.
 *
 * WHY THIS EXISTS:
 * On deploy the server broadcasts `serverShutdown` to EVERY connected client
 * at the same instant. The client handler then does a manual
 * `disconnect() → setTimeout(connect, delay)`. If `delay` is a fixed constant,
 * every client reconnects at the same moment and hammers the freshly-booted
 * (single) instance with a simultaneous connection storm — tripping the
 * per-IP / MAX_CONNECTIONS limits and slowing the very boot the clients are
 * waiting on.
 *
 * Socket.IO's built-in `randomizationFactor` does NOT help here: it only
 * jitters the NATIVE reconnection backoff, not this manual disconnect/connect
 * path. So we add our own jitter, spreading each client's first reconnect
 * uniformly across [base, base + jitter]. This smears the herd across a window
 * and lets most clients land AFTER the new process is accepting connections.
 * (Clients that still arrive early simply fail once and fall into the native
 * backoff — which IS jittered — so nothing is lost.)
 */

/** Minimum wait before the first reconnect attempt (covers fast boots). */
export const DEFAULT_RECONNECT_BASE_MS = 3000;

/** Width of the random spread added on top of the base. */
export const DEFAULT_RECONNECT_JITTER_MS = 7000;

function sanitize(value: number | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? value
    : fallback;
}

/**
 * Returns an integer millisecond delay in [base, base + jitter].
 *
 * @param reconnectIn       Server-supplied base wait (legacy payloads send only this).
 * @param reconnectJitterMs Server-supplied jitter width (newer payloads).
 * @param rng               Injectable randomness for deterministic tests.
 */
export function computeReconnectDelay(
  reconnectIn?: number,
  reconnectJitterMs?: number,
  rng: () => number = Math.random,
): number {
  const base = sanitize(reconnectIn, DEFAULT_RECONNECT_BASE_MS);
  const jitter = sanitize(reconnectJitterMs, DEFAULT_RECONNECT_JITTER_MS);
  return Math.round(base + rng() * jitter);
}
