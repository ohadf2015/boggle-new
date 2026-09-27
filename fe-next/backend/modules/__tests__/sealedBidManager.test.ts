/**
 * sealedBidManager — server-authoritative Sealed Bid MP round state machine.
 * Pure logic (no IO): init → lock bids → resolve across players (sbMpEngine) →
 * advance, accumulating scores. Tested without sockets.
 */
import { describe, it, expect } from 'vitest';
import {
  initSealedBidState,
  currentRack,
  lockBid,
  allActiveLocked,
  resolveRound,
  advanceRound,
} from '../sealedBidManager';

const RACKS = ['TRAINED', 'GARDENS', 'MASTERY'];

describe('sealedBidManager', () => {
  it('initializes a bidding round with zeroed scores + empty bids', () => {
    const s = initSealedBidState(['a', 'b'], RACKS, 1000, 30000);
    expect(s.phase).toBe('bidding');
    expect(s.index).toBe(0);
    expect(currentRack(s)).toBe('TRAINED');
    expect(s.scores).toEqual({ a: 0, b: 0 });
    expect(s.bids).toEqual({});
    expect(s.roundDeadline).toBe(31000);
  });

  it('locks a bid for a player', () => {
    let s = initSealedBidState(['a', 'b'], RACKS, 1000, 30000);
    s = lockBid(s, 'a', 'RETAIN', true);
    expect(s.bids['a']).toEqual({ word: 'RETAIN', valid: true, locked: true });
    expect(allActiveLocked(s, ['a', 'b'])).toBe(false);
    s = lockBid(s, 'b', 'TRAIN', true);
    expect(allActiveLocked(s, ['a', 'b'])).toBe(true);
  });

  it('does not lock bids once the round is revealed', () => {
    let s = initSealedBidState(['a', 'b'], RACKS, 1000, 30000);
    s = { ...s, phase: 'revealed' };
    s = lockBid(s, 'a', 'RETAIN', true);
    expect(s.bids['a']).toBeUndefined();
  });

  it('resolves a round: unique doubles, clash halves, and banks scores', () => {
    let s = initSealedBidState(['a', 'b'], RACKS, 1000, 30000);
    s = lockBid(s, 'a', 'RETAIN', true);
    s = lockBid(s, 'b', 'TRAIN', true);
    const { state, results } = resolveRound(s);
    expect(state.phase).toBe('revealed');
    const a = results.find((r) => r.username === 'a')!;
    expect(a.outcome).toBe('unique');
    expect(state.scores['a']).toBe(a.points);
    expect(state.scores['a']).toBeGreaterThan(0);
  });

  it('treats a player who never locked as a pass (none/0)', () => {
    let s = initSealedBidState(['a', 'b'], RACKS, 1000, 30000);
    s = lockBid(s, 'a', 'RETAIN', true);
    const { state, results } = resolveRound(s);
    const b = results.find((r) => r.username === 'b')!;
    expect(b.outcome).toBe('none');
    expect(state.scores['b']).toBe(0);
  });

  it('advances to the next round, resetting bids + deadline', () => {
    let s = initSealedBidState(['a', 'b'], RACKS, 1000, 30000);
    s = lockBid(s, 'a', 'RETAIN', true);
    s = resolveRound(s).state;
    s = advanceRound(s, 5000, 30000);
    expect(s.phase).toBe('bidding');
    expect(s.index).toBe(1);
    expect(currentRack(s)).toBe('GARDENS');
    expect(s.bids).toEqual({});
    expect(s.roundDeadline).toBe(35000);
  });

  it('ends the match (done) after the last round', () => {
    let s = initSealedBidState(['a'], ['ONLYONE'], 1000, 30000);
    s = resolveRound(s).state;
    s = advanceRound(s, 5000, 30000);
    expect(s.phase).toBe('done');
  });

  it('accumulates scores across rounds', () => {
    let s = initSealedBidState(['a', 'b'], RACKS, 1000, 30000);
    s = lockBid(s, 'a', 'RETAIN', true);
    s = lockBid(s, 'b', 'TRAIN', true);
    s = resolveRound(s).state;
    const afterR1 = s.scores['a'];
    s = advanceRound(s, 5000, 30000);
    s = lockBid(s, 'a', 'GANDER', true);
    s = resolveRound(s).state;
    expect(s.scores['a']).toBeGreaterThan(afterR1);
  });
});
