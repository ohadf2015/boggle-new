/**
 * Tests for pickRandomMultiplayerMode
 *
 * Quick Play resolves a "random" selection into one of the three live
 * multiplayer modes: classic, blast, or word-hunt.
 *
 * The picker is deterministic given a seeded RNG so tests stay stable.
 */

import { describe, test, expect } from 'vitest';
import { pickRandomMultiplayerMode, MULTIPLAYER_MODES } from '../pickRandomMultiplayerMode';
import type { GameMode } from '@/shared/types/game';

describe('pickRandomMultiplayerMode', () => {
  test('returns a valid multiplayer GameMode', () => {
    const mode = pickRandomMultiplayerMode();
    expect(MULTIPLAYER_MODES).toContain(mode);
  });

  test('returns deterministic result when given a seeded rng', () => {
    // rng = () => 0 always picks the first mode
    const first = pickRandomMultiplayerMode(() => 0);
    expect(first).toBe(MULTIPLAYER_MODES[0]);

    // rng = () => 0.99 picks the last mode
    const last = pickRandomMultiplayerMode(() => 0.99);
    expect(last).toBe(MULTIPLAYER_MODES[MULTIPLAYER_MODES.length - 1]);
  });

  test('middle rng value selects a middle mode', () => {
    // With 3 modes, rng = 0.5 picks index floor(0.5 * 3) = 1
    const mode = pickRandomMultiplayerMode(() => 0.5);
    expect(mode).toBe(MULTIPLAYER_MODES[1]);
  });

  test('respects an exclude list', () => {
    // Exclude all but classic -> always returns classic
    const excluded: GameMode[] = ['blast', 'word-hunt'];
    for (let i = 0; i < 10; i++) {
      const mode = pickRandomMultiplayerMode(Math.random, excluded);
      expect(mode).toBe('classic');
    }
  });

  test('falls back to classic when every mode is excluded', () => {
    const mode = pickRandomMultiplayerMode(Math.random, [
      'classic',
      'blast',
      'word-hunt',
    ]);
    expect(mode).toBe('classic');
  });

  test('MULTIPLAYER_MODES contains exactly the three live modes', () => {
    expect(MULTIPLAYER_MODES).toEqual(['classic', 'blast', 'word-hunt']);
  });
});
