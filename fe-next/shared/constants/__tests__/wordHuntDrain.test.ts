import { describe, it, expect } from 'vitest';
import {
  getDrainRate,
  HUNT_DRAIN_PHASE_1_RATE,
  HUNT_DRAIN_PHASE_1_DURATION,
  HUNT_DRAIN_PHASE_2_RATE,
  HUNT_DRAIN_PHASE_2_DURATION,
  HUNT_DRAIN_PHASE_3_RATE,
} from '../wordHuntMultiplayerConstants';

describe('getDrainRate', () => {
  it('returns phase 1 rate at 0 seconds (start of game)', () => {
    expect(getDrainRate(0)).toBe(HUNT_DRAIN_PHASE_1_RATE);
  });

  it('returns phase 1 rate at 15 seconds (mid discovery)', () => {
    expect(getDrainRate(15)).toBe(HUNT_DRAIN_PHASE_1_RATE);
  });

  it('returns phase 1 rate at 29 seconds (end of phase 1)', () => {
    expect(getDrainRate(29)).toBe(HUNT_DRAIN_PHASE_1_RATE);
  });

  it('returns phase 2 rate at 30 seconds (start of standard phase)', () => {
    expect(getDrainRate(30)).toBe(HUNT_DRAIN_PHASE_2_RATE);
  });

  it('returns phase 2 rate at 45 seconds (mid standard)', () => {
    expect(getDrainRate(45)).toBe(HUNT_DRAIN_PHASE_2_RATE);
  });

  it('returns phase 2 rate at 59 seconds (end of phase 2)', () => {
    expect(getDrainRate(59)).toBe(HUNT_DRAIN_PHASE_2_RATE);
  });

  it('returns phase 3 rate at 60 seconds (start of panic)', () => {
    expect(getDrainRate(60)).toBe(HUNT_DRAIN_PHASE_3_RATE);
  });

  it('returns phase 3 rate at 90 seconds (deep panic)', () => {
    expect(getDrainRate(90)).toBe(HUNT_DRAIN_PHASE_3_RATE);
  });

  it('returns phase 3 rate at 300 seconds (extended game)', () => {
    expect(getDrainRate(300)).toBe(HUNT_DRAIN_PHASE_3_RATE);
  });
});

describe('drain phase constants', () => {
  it('phase 1 rate is gentler than original constant', () => {
    expect(HUNT_DRAIN_PHASE_1_RATE).toBe(0.8);
  });

  it('phase 2 rate matches original feel', () => {
    expect(HUNT_DRAIN_PHASE_2_RATE).toBe(1.2);
  });

  it('phase 3 rate is aggressive', () => {
    expect(HUNT_DRAIN_PHASE_3_RATE).toBe(2.0);
  });

  it('phase 1 lasts 30 seconds', () => {
    expect(HUNT_DRAIN_PHASE_1_DURATION).toBe(30);
  });

  it('phase 2 lasts 30 seconds', () => {
    expect(HUNT_DRAIN_PHASE_2_DURATION).toBe(30);
  });
});
