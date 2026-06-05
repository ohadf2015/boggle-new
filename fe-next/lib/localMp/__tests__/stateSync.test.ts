import { describe, it, expect } from 'vitest';
import { applyIncomingSnapshot, needsResync, type VersionedState } from '../stateSync';

interface Game {
  scores: Record<string, number>;
  timeLeft: number;
}

describe('local MP state sync (lossy-link safe)', () => {
  it('applies the first snapshot when there is no local state', () => {
    const incoming = { version: 1, state: { scores: { p1: 0 }, timeLeft: 60 } as Game };
    const { next, applied } = applyIncomingSnapshot<Game>(null, incoming);
    expect(applied).toBe(true);
    expect(next.version).toBe(1);
    expect(next.state.timeLeft).toBe(60);
  });

  it('applies a strictly newer snapshot', () => {
    const local: VersionedState<Game> = { version: 3, state: { scores: { p1: 5 }, timeLeft: 50 } };
    const incoming = { version: 4, state: { scores: { p1: 9 }, timeLeft: 49 } };
    const { next, applied } = applyIncomingSnapshot<Game>(local, incoming);
    expect(applied).toBe(true);
    expect(next.version).toBe(4);
    expect(next.state.scores.p1).toBe(9);
  });

  it('ignores a duplicate snapshot (same version) — idempotent', () => {
    const local: VersionedState<Game> = { version: 4, state: { scores: { p1: 9 }, timeLeft: 49 } };
    const incoming = { version: 4, state: { scores: { p1: 999 }, timeLeft: 1 } };
    const { next, applied } = applyIncomingSnapshot<Game>(local, incoming);
    expect(applied).toBe(false);
    expect(next).toBe(local); // unchanged reference
  });

  it('ignores an out-of-order older snapshot (lossy link reorders)', () => {
    const local: VersionedState<Game> = { version: 6, state: { scores: { p1: 12 }, timeLeft: 40 } };
    const incoming = { version: 5, state: { scores: { p1: 11 }, timeLeft: 41 } };
    const { applied } = applyIncomingSnapshot<Game>(local, incoming);
    expect(applied).toBe(false);
  });

  it('detects a version gap from a heartbeat and requests resync', () => {
    // Heartbeat says host is at v10 but we only have v7 → we missed snapshots.
    expect(needsResync(7, 10)).toBe(true);
  });

  it('does not request resync when caught up or ahead', () => {
    expect(needsResync(10, 10)).toBe(false);
    expect(needsResync(11, 10)).toBe(false); // never behind in practice; be safe
  });
});
