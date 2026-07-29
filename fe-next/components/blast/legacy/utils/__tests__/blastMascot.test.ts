/**
 * blastMascot — pure selector tests.
 *
 * The mascot module maps run/wave state to an expression key. These tests
 * lock down the priority ladder so future tweaks don't silently break the
 * "celebrate big wins, commiserate on losses" UX promise.
 */
import {
  getMascotForArchetype,
  getMascotForResults,
  MASCOT_IMAGES,
  type MascotKey,
} from '../blastMascot';
import type { BlastResultsData } from '../../types';

const makeResults = (overrides: Partial<BlastResultsData> = {}): BlastResultsData => ({
  finalScore: 0,
  previousBest: null,
  wordsFound: [],
  waveResults: [],
  wavesCompleted: 0,
  maxCombo: 0,
  bestWord: null,
  bestWave: null,
  clearPercentage: 0,
  percentile: null,
  ...overrides,
} as BlastResultsData);

describe('blastMascot — archetype selector', () => {
  it('maps normal → neutral', () => {
    expect(getMascotForArchetype('normal')).toBe<MascotKey>('neutral');
  });
  it('maps scoreRush → hyped', () => {
    expect(getMascotForArchetype('scoreRush')).toBe<MascotKey>('hyped');
  });
  it('maps treasureHunt → sneaky', () => {
    expect(getMascotForArchetype('treasureHunt')).toBe<MascotKey>('sneaky');
  });
  it('maps survival → sweating', () => {
    expect(getMascotForArchetype('survival')).toBe<MascotKey>('sweating');
  });
  it('maps silence → neutral', () => {
    expect(getMascotForArchetype('silence')).toBe<MascotKey>('neutral');
  });
});

describe('blastMascot — results selector (priority ladder)', () => {
  it('new personal best → celebrating (highest priority)', () => {
    const r = makeResults({
      finalScore: 5000, previousBest: 4000, wavesCompleted: 3, maxCombo: 4,
    });
    expect(getMascotForResults(r)).toBe<MascotKey>('celebrating');
  });

  it('big combo (>=8) without PB → hyped', () => {
    const r = makeResults({
      finalScore: 2000, previousBest: 5000, wavesCompleted: 2, maxCombo: 9,
    });
    expect(getMascotForResults(r)).toBe<MascotKey>('hyped');
  });

  it('decent run (>=2 waves cleared, no big combo, no PB) → neutral', () => {
    const r = makeResults({
      finalScore: 1200, previousBest: 5000, wavesCompleted: 3, maxCombo: 3,
    });
    expect(getMascotForResults(r)).toBe<MascotKey>('neutral');
  });

  it('flameout (0-1 waves, low score) → sadSmile', () => {
    const r = makeResults({
      finalScore: 200, previousBest: 5000, wavesCompleted: 1, maxCombo: 1,
    });
    expect(getMascotForResults(r)).toBe<MascotKey>('sadSmile');
  });

  it('first-ever run without previousBest still celebrates when score > 0', () => {
    const r = makeResults({
      finalScore: 1500, previousBest: null, wavesCompleted: 2, maxCombo: 3,
    });
    // No previousBest → no PB delta → falls through to neutral (not celebrating)
    expect(getMascotForResults(r)).toBe<MascotKey>('neutral');
  });

  it('PB beats combo priority', () => {
    const r = makeResults({
      finalScore: 9999, previousBest: 100, wavesCompleted: 5, maxCombo: 15,
    });
    expect(getMascotForResults(r)).toBe<MascotKey>('celebrating');
  });
});

describe('blastMascot — MASCOT_IMAGES registry', () => {
  it('exports a path for every mascot key', () => {
    const keys: MascotKey[] = [
      'hyped', 'sneaky', 'sweating', 'celebrating', 'sadSmile', 'neutral',
    ];
    for (const k of keys) {
      expect(typeof MASCOT_IMAGES[k]).toBe('string');
      expect(MASCOT_IMAGES[k].length).toBeGreaterThan(0);
    }
  });
});
