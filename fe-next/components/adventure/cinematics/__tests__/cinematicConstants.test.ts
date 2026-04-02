/**
 * Tests for cinematic constants isolation.
 *
 * Verifies that duration frame constants are importable WITHOUT pulling
 * in the Remotion bundle — i.e., they live in a pure-TS constants file.
 */

import {
  VICTORY_DURATION_FRAMES,
  DEFEAT_DURATION_FRAMES,
  WORLD_UNLOCK_DURATION_FRAMES,
} from '../constants';

describe('cinematic constants', () => {
  it('VICTORY_DURATION_FRAMES is a positive number', () => {
    expect(typeof VICTORY_DURATION_FRAMES).toBe('number');
    expect(VICTORY_DURATION_FRAMES).toBeGreaterThan(0);
  });

  it('DEFEAT_DURATION_FRAMES is a positive number', () => {
    expect(typeof DEFEAT_DURATION_FRAMES).toBe('number');
    expect(DEFEAT_DURATION_FRAMES).toBeGreaterThan(0);
  });

  it('WORLD_UNLOCK_DURATION_FRAMES is a positive number', () => {
    expect(typeof WORLD_UNLOCK_DURATION_FRAMES).toBe('number');
    expect(WORLD_UNLOCK_DURATION_FRAMES).toBeGreaterThan(0);
  });

  it('VICTORY_DURATION_FRAMES matches 180 (6 s × 30 fps)', () => {
    expect(VICTORY_DURATION_FRAMES).toBe(180);
  });

  it('DEFEAT_DURATION_FRAMES matches 150 (5 s × 30 fps)', () => {
    expect(DEFEAT_DURATION_FRAMES).toBe(150);
  });

  it('WORLD_UNLOCK_DURATION_FRAMES matches 300 (10 s × 30 fps)', () => {
    expect(WORLD_UNLOCK_DURATION_FRAMES).toBe(300);
  });
});
