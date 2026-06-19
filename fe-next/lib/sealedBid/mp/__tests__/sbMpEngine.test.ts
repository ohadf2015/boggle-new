/**
 * Sealed Bid multiplayer resolver — the interactive-simultaneous core. Unlike
 * the solo engine (player vs a fixed bot word), MP clash is emergent: a word is
 * UNIQUE only if no OTHER player bid it this round (2x), and CLASHES if >=2
 * players bid the same word (each gets half). Pass/invalid score nothing. Pure +
 * deterministic so it unit-tests without sockets.
 */
import { describe, it, expect } from 'vitest';
import { resolveSbMpRound, type SbMpBid } from '../sbMpEngine';

const bid = (username: string, word: string | null, valid = true): SbMpBid => ({ username, word, valid });
const byUser = (results: ReturnType<typeof resolveSbMpRound>, u: string) => results.find((r) => r.username === u)!;

describe('resolveSbMpRound', () => {
  it('awards double to two players who bid different valid words (both unique)', () => {
    const res = resolveSbMpRound([bid('a', 'TRAIN'), bid('b', 'RETAIN')]);
    expect(byUser(res, 'a').outcome).toBe('unique');
    expect(byUser(res, 'a').points).toBe(byUser(res, 'a').basePoints * 2);
    expect(byUser(res, 'b').outcome).toBe('unique');
  });

  it('halves both players when they clash on the same word', () => {
    const res = resolveSbMpRound([bid('a', 'TRAIN'), bid('b', 'TRAIN')]);
    expect(byUser(res, 'a').outcome).toBe('clash');
    expect(byUser(res, 'b').outcome).toBe('clash');
    const base = byUser(res, 'a').basePoints;
    expect(byUser(res, 'a').points).toBe(Math.floor(base / 2));
  });

  it('detects clashes case-insensitively', () => {
    const res = resolveSbMpRound([bid('a', 'train'), bid('b', 'TRAIN')]);
    expect(byUser(res, 'a').outcome).toBe('clash');
    expect(byUser(res, 'b').outcome).toBe('clash');
  });

  it('handles three players: two clash, one unique', () => {
    const res = resolveSbMpRound([bid('a', 'TRAIN'), bid('b', 'TRAIN'), bid('c', 'RETAIN')]);
    expect(byUser(res, 'a').outcome).toBe('clash');
    expect(byUser(res, 'b').outcome).toBe('clash');
    expect(byUser(res, 'c').outcome).toBe('unique');
  });

  it('scores a pass (null) as none/0', () => {
    const res = resolveSbMpRound([bid('a', null), bid('b', 'RETAIN')]);
    expect(byUser(res, 'a').outcome).toBe('none');
    expect(byUser(res, 'a').points).toBe(0);
  });

  it('scores an invalid bid as none/0 and it does not cause a clash', () => {
    // Both bid TRAIN but a's is invalid → a scores none, b is unique (no valid clash).
    const res = resolveSbMpRound([bid('a', 'TRAIN', false), bid('b', 'TRAIN', true)]);
    expect(byUser(res, 'a').outcome).toBe('none');
    expect(byUser(res, 'a').points).toBe(0);
    expect(byUser(res, 'b').outcome).toBe('unique');
  });

  it('a single player bidding alone is unique (no one to clash with)', () => {
    const res = resolveSbMpRound([bid('a', 'TRAIN')]);
    expect(byUser(res, 'a').outcome).toBe('unique');
  });
});
