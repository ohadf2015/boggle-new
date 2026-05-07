/**
 * Case normalisation in useWordHuntMultiplayerBridge.
 *
 * knownLetters must always be uppercase so that a Set treating 'd' and 'D'
 * as distinct entries never produces duplicate wrong-spot chips.
 */
import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── mutable refs so individual tests can override per-selector values ──────
let mockAttempts: Array<{ guess: string; feedback: string[] }> = [];
let mockDiscoveryKnownLetters: string[] = [];
let mockDiscoveryClues: Array<{ position: number; letter: string }> = [];

vi.mock('@/hooks/gameState/store', () => ({
  useWordHuntTargetLength: () => 5,
  useWordHuntTargetCategory: () => null,
  useWordHuntMyLife: () => 3,
  useWordHuntTargetAttempts: () => mockAttempts,
  useWordHuntTargetFound: () => false,
  useWordHuntTargetFoundBy: () => null,
  useWordHuntPlayerLives: () => ({}),
  useWordHuntEliminatedPlayers: () => [],
  useWordHuntDiscoveryClues: () => mockDiscoveryClues,
  useWordHuntKnownLetters: () => mockDiscoveryKnownLetters,
}));

import { useWordHuntMultiplayerBridge } from '../useWordHuntMultiplayerBridge';

beforeEach(() => {
  mockAttempts = [];
  mockDiscoveryKnownLetters = [];
  mockDiscoveryClues = [];
});

describe('useWordHuntMultiplayerBridge — case normalisation', () => {
  it('lowercase guess letters produce uppercase knownLetters', () => {
    mockAttempts = [
      { guess: 'diver', feedback: ['absent', 'present', 'absent', 'absent', 'absent'] },
    ] as never;

    const { result } = renderHook(() => useWordHuntMultiplayerBridge());
    for (const l of result.current.knownLetters) {
      expect(l, `letter '${l}' must be uppercase`).toBe(l.toUpperCase());
    }
    expect(result.current.knownLetters.has('I')).toBe(true);
    expect(result.current.knownLetters.has('i')).toBe(false);
  });

  it('lowercase discoveryKnownLetters are uppercased before merge', () => {
    mockDiscoveryKnownLetters = ['d', 'a'];

    const { result } = renderHook(() => useWordHuntMultiplayerBridge());
    expect(result.current.knownLetters.has('D')).toBe(true);
    expect(result.current.knownLetters.has('A')).toBe(true);
    expect(result.current.knownLetters.has('d')).toBe(false);
    expect(result.current.knownLetters.has('a')).toBe(false);
  });

  it('mixed-case discoveryKnownLetters deduplicate to uppercase', () => {
    mockDiscoveryKnownLetters = ['D', 'd', 'A'];

    const { result } = renderHook(() => useWordHuntMultiplayerBridge());
    expect(result.current.knownLetters.size).toBe(2);
    expect(result.current.knownLetters.has('D')).toBe(true);
    expect(result.current.knownLetters.has('A')).toBe(true);
  });
});
