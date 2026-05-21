/**
 * Shiritori room state machine — turn flow, chain/dedupe/dictionary validation,
 * ん-loss, timeout, and elimination → winner. Pure logic (dictionary injected),
 * mirrors wheelRushManager. Spec: docs/2026-05-21-shiritori-mode-spec.md.
 */
import { describe, it, expect } from 'vitest';
import {
  initShiritoriState,
  currentPlayer,
  validateShiritoriWord,
  applyShiritoriWord,
  eliminate,
  type ShiritoriState,
} from '../shiritoriManager';

// Tiny injected dictionary for deterministic tests.
const DICT = new Set(['しりとり', 'りんご', 'ごりら', 'らっぱ', 'ぱん', 'みかん', 'ねこ', 'こま']);
const isWord = (w: string) => DICT.has(w);

const fresh = (players = ['a', 'b'], now = 1_000): ShiritoriState =>
  initShiritoriState(players, now, 15_000);

describe('initShiritoriState', () => {
  it('starts with first player, empty chain, no required head', () => {
    const s = fresh();
    expect(currentPlayer(s)).toBe('a');
    expect(s.chain).toEqual([]);
    expect(s.requiredHead).toBeNull();
    expect(s.finished).toBe(false);
    expect(s.eliminated).toEqual({ a: false, b: false });
    expect(s.turnDeadline).toBe(1_000 + 15_000);
  });
});

describe('validateShiritoriWord', () => {
  it('accepts any dictionary word on the first move (no required head)', () => {
    expect(validateShiritoriWord(fresh(), 'しりとり', isWord)).toEqual({ valid: true });
  });
  it('rejects too-short words', () => {
    expect(validateShiritoriWord(fresh(), 'り', isWord)).toEqual({ valid: false, error: 'too-short' });
  });
  it('rejects non-dictionary words', () => {
    expect(validateShiritoriWord(fresh(), 'ねっこ', isWord)).toEqual({ valid: false, error: 'not-a-word' });
  });
  it('enforces the chain against requiredHead', () => {
    const s = applyShiritoriWord(fresh(), 'しりとり'); // tail り → requiredHead り
    expect(s.requiredHead).toBe('り');
    expect(validateShiritoriWord(s, 'りんご', isWord)).toEqual({ valid: true });
    expect(validateShiritoriWord(s, 'ねこ', isWord)).toEqual({ valid: false, error: 'bad-chain' });
  });
  it('rejects already-used words', () => {
    const s = applyShiritoriWord(fresh(), 'しりとり');
    expect(validateShiritoriWord(s, 'しりとり', isWord)).toEqual({ valid: false, error: 'already-used' });
  });
  it('flags a ん-ending word as valid-but-fatal', () => {
    const s = applyShiritoriWord(fresh(), 'りんご'); // requiredHead ご
    // ごりら→らっぱ→ぱん ; set up requiredHead ぱ then play ぱん? simpler: requiredHead み, play みかん
    const s2 = { ...s, requiredHead: 'み' };
    expect(validateShiritoriWord(s2, 'みかん', isWord)).toEqual({ valid: true, endsGame: true });
  });
});

describe('applyShiritoriWord', () => {
  it('appends to chain, sets requiredHead to the tail, marks used, advances turn', () => {
    const s = applyShiritoriWord(fresh(), 'しりとり', 2_000, 15_000);
    expect(s.chain).toEqual(['しりとり']);
    expect(s.used).toContain('しりとり');
    expect(s.requiredHead).toBe('り');
    expect(currentPlayer(s)).toBe('b'); // advanced from a
    expect(s.turnDeadline).toBe(2_000 + 15_000);
  });
});

describe('eliminate → winner', () => {
  it('eliminating one of two players finishes the game with the other as winner', () => {
    const s = eliminate(fresh(), 'a');
    expect(s.eliminated.a).toBe(true);
    expect(s.finished).toBe(true);
    expect(s.winner).toBe('b');
  });
  it('with 3 players, eliminating one advances to the next alive player, not finished', () => {
    const s = eliminate(fresh(['a', 'b', 'c']), 'a'); // a was current
    expect(s.finished).toBe(false);
    expect(s.eliminated.a).toBe(true);
    expect(currentPlayer(s)).toBe('b');
  });
});
