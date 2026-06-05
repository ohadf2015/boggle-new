/**
 * Snapshot / resync for local-mesh MP (slice 5).
 *
 * The authoritative host broadcasts versioned full-state snapshots plus
 * heartbeats carrying its current version. The link is lossy and may reorder or
 * drop packets, so clients must:
 *   - apply a snapshot ONLY if it is strictly newer than what they hold
 *     (duplicates and out-of-order older packets are ignored — idempotent),
 *   - notice when a heartbeat's version is ahead of theirs (they missed a
 *     snapshot) and request a resync.
 *
 * Pure + deterministic — no transport, no timers. The host-loop adapter
 * (slice 6) wires these to LocalP2PTransport.
 */

export interface VersionedState<S> {
  version: number;
  state: S;
}

export interface SnapshotResult<S> {
  next: VersionedState<S>;
  /** True only when `incoming` was strictly newer and therefore adopted. */
  applied: boolean;
}

/**
 * Adopt `incoming` iff it is strictly newer than `local` (or there is no local
 * state). Returns the unchanged `local` reference when skipping, so callers can
 * cheaply detect "no change" by identity.
 */
export function applyIncomingSnapshot<S>(
  local: VersionedState<S> | null,
  incoming: { version: number; state: S },
): SnapshotResult<S> {
  if (local && incoming.version <= local.version) {
    return { next: local, applied: false };
  }
  return { next: { version: incoming.version, state: incoming.state }, applied: true };
}

/**
 * A heartbeat reveals the host's current version. If it is ahead of ours we
 * dropped at least one snapshot and should ask the host to resend full state.
 */
export function needsResync(localVersion: number, heartbeatVersion: number): boolean {
  return heartbeatVersion > localVersion;
}
