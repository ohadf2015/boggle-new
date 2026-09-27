/**
 * Blast Micro-Achievements — pure compute function tests.
 *
 * Mid-run "juice" achievements that fire during gameplay (not at run-end).
 * Pure reducer: given a snapshot of run state, return the set of micro IDs
 * earned so far. The hook layer computes diffs to surface toasts.
 */
import {
  computeMicroAchievements,
  BLAST_MICRO_ACHIEVEMENTS,
  diffMicroAchievements,
  type BlastMicroId,
  type BlastMicroState,
} from '../blastMicroAchievements';

function makeState(overrides: Partial<BlastMicroState> = {}): BlastMicroState {
  return {
    maxCombo: 0,
    wordsSubmitted: 0,
    longestWordLen: 0,
    biggestSingleClear: 0,
    gemsCollected: 0,
    specialTilesCleared: 0,
    wavesCompleted: 0,
    ...overrides,
  };
}

describe('BLAST_MICRO_ACHIEVEMENTS registry', () => {
  it('exposes a non-empty registry with unique ids', () => {
    expect(BLAST_MICRO_ACHIEVEMENTS.length).toBeGreaterThan(0);
    const ids = BLAST_MICRO_ACHIEVEMENTS.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every micro-achievement has id, icon, labelKey, tier', () => {
    for (const m of BLAST_MICRO_ACHIEVEMENTS) {
      expect(m.id).toBeTruthy();
      expect(m.icon).toBeTruthy();
      expect(m.labelKey).toMatch(/^blast\.micro\./);
      expect(['bronze', 'silver', 'gold', 'legendary']).toContain(m.tier);
    }
  });
});

describe('computeMicroAchievements', () => {
  it('awards firstCombo at maxCombo >= 2', () => {
    expect(computeMicroAchievements(makeState({ maxCombo: 1 }))).not.toContain<BlastMicroId>('firstCombo');
    expect(computeMicroAchievements(makeState({ maxCombo: 2 }))).toContain<BlastMicroId>('firstCombo');
  });

  it('awards tripleChain at maxCombo >= 3', () => {
    expect(computeMicroAchievements(makeState({ maxCombo: 3 }))).toContain('tripleChain');
  });

  it('awards megaChain at maxCombo >= 7', () => {
    expect(computeMicroAchievements(makeState({ maxCombo: 6 }))).not.toContain('megaChain');
    expect(computeMicroAchievements(makeState({ maxCombo: 7 }))).toContain('megaChain');
  });

  it('awards bigWord at longestWordLen >= 6', () => {
    expect(computeMicroAchievements(makeState({ longestWordLen: 5 }))).not.toContain('bigWord');
    expect(computeMicroAchievements(makeState({ longestWordLen: 6 }))).toContain('bigWord');
  });

  it('awards hugeWord at longestWordLen >= 8', () => {
    expect(computeMicroAchievements(makeState({ longestWordLen: 7 }))).not.toContain('hugeWord');
    expect(computeMicroAchievements(makeState({ longestWordLen: 8 }))).toContain('hugeWord');
  });

  it('awards demolisher at biggestSingleClear >= 8', () => {
    expect(computeMicroAchievements(makeState({ biggestSingleClear: 7 }))).not.toContain('demolisher');
    expect(computeMicroAchievements(makeState({ biggestSingleClear: 8 }))).toContain('demolisher');
  });

  it('awards gemHoarder at gemsCollected >= 5', () => {
    expect(computeMicroAchievements(makeState({ gemsCollected: 4 }))).not.toContain('gemHoarder');
    expect(computeMicroAchievements(makeState({ gemsCollected: 5 }))).toContain('gemHoarder');
  });

  it('awards specialist at specialTilesCleared >= 10', () => {
    expect(computeMicroAchievements(makeState({ specialTilesCleared: 9 }))).not.toContain('specialist');
    expect(computeMicroAchievements(makeState({ specialTilesCleared: 10 }))).toContain('specialist');
  });

  it('awards waveClearer at wavesCompleted >= 1', () => {
    expect(computeMicroAchievements(makeState({ wavesCompleted: 1 }))).toContain('waveClearer');
  });

  it('returns empty array for a fresh run', () => {
    expect(computeMicroAchievements(makeState())).toEqual([]);
  });
});

describe('diffMicroAchievements', () => {
  it('returns IDs newly earned this tick', () => {
    const prev = new Set<BlastMicroId>(['firstCombo']);
    const curr = computeMicroAchievements(makeState({ maxCombo: 3, longestWordLen: 6 }));
    const newly = diffMicroAchievements(prev, curr);
    expect(newly).toEqual(expect.arrayContaining(['tripleChain', 'bigWord']));
    expect(newly).not.toContain('firstCombo');
  });

  it('returns empty when nothing new', () => {
    const prev = new Set<BlastMicroId>(['firstCombo']);
    const curr: BlastMicroId[] = ['firstCombo'];
    expect(diffMicroAchievements(prev, curr)).toEqual([]);
  });
});
