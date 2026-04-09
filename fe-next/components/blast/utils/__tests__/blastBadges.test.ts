/**
 * Blast Badges — pure compute function tests.
 *
 * `computeEarnedBadges(results)` is a stateless reducer: given a finished
 * run's stats, return the set of badge IDs earned. No persistence, no
 * "first time" logic — that lives in the store layer.
 */
import { computeEarnedBadges, BLAST_BADGES, type BlastBadgeId } from '../blastBadges';
import type { BlastResultsData } from '../../types';

function makeResults(overrides: Partial<BlastResultsData> = {}): BlastResultsData {
  return {
    finalScore: 0,
    tilesCleared: 0,
    totalTiles: 36,
    clearPercentage: 0,
    wordsFound: [],
    bestWord: '',
    maxCombo: 0,
    stars: 1,
    wavesCompleted: 0,
    waveResults: [],
    ...overrides,
  };
}

describe('BLAST_BADGES registry', () => {
  it('exposes exactly 8 badges with unique ids', () => {
    expect(BLAST_BADGES).toHaveLength(8);
    const ids = BLAST_BADGES.map((b) => b.id);
    expect(new Set(ids).size).toBe(8);
  });

  it('every badge has id, icon, labelKey', () => {
    for (const b of BLAST_BADGES) {
      expect(b.id).toBeTruthy();
      expect(b.icon).toBeTruthy();
      expect(b.labelKey).toMatch(/^blast\.badges\./);
    }
  });
});

describe('computeEarnedBadges', () => {
  it('awards firstBlast for any completed run', () => {
    const earned = computeEarnedBadges(makeResults({ wavesCompleted: 1 }));
    expect(earned).toContain<BlastBadgeId>('firstBlast');
  });

  it('does not award firstBlast if zero waves completed', () => {
    const earned = computeEarnedBadges(makeResults({ wavesCompleted: 0 }));
    expect(earned).not.toContain<BlastBadgeId>('firstBlast');
  });

  it('awards waveRider at 3 waves', () => {
    expect(computeEarnedBadges(makeResults({ wavesCompleted: 2 }))).not.toContain('waveRider');
    expect(computeEarnedBadges(makeResults({ wavesCompleted: 3 }))).toContain('waveRider');
  });

  it('awards marathoner at 5 waves', () => {
    expect(computeEarnedBadges(makeResults({ wavesCompleted: 4 }))).not.toContain('marathoner');
    expect(computeEarnedBadges(makeResults({ wavesCompleted: 5 }))).toContain('marathoner');
  });

  it('awards comboChain at maxCombo 5', () => {
    expect(computeEarnedBadges(makeResults({ maxCombo: 4 }))).not.toContain('comboChain');
    expect(computeEarnedBadges(makeResults({ maxCombo: 5 }))).toContain('comboChain');
  });

  it('awards comboKing at maxCombo 10', () => {
    expect(computeEarnedBadges(makeResults({ maxCombo: 9 }))).not.toContain('comboKing');
    expect(computeEarnedBadges(makeResults({ maxCombo: 10 }))).toContain('comboKing');
  });

  it('awards wordsmith at 20+ words', () => {
    const twenty = Array.from({ length: 20 }, (_, i) => `word${i}`);
    const nineteen = twenty.slice(0, 19);
    expect(computeEarnedBadges(makeResults({ wordsFound: nineteen }))).not.toContain('wordsmith');
    expect(computeEarnedBadges(makeResults({ wordsFound: twenty }))).toContain('wordsmith');
  });

  it('awards clearMaster at clearPercentage >= 90', () => {
    expect(computeEarnedBadges(makeResults({ clearPercentage: 89 }))).not.toContain('clearMaster');
    expect(computeEarnedBadges(makeResults({ clearPercentage: 90 }))).toContain('clearMaster');
  });

  it('awards highScorer at finalScore >= 10000', () => {
    expect(computeEarnedBadges(makeResults({ finalScore: 9999 }))).not.toContain('highScorer');
    expect(computeEarnedBadges(makeResults({ finalScore: 10000 }))).toContain('highScorer');
  });

  it('awards multiple badges in a stellar run', () => {
    const earned = computeEarnedBadges(
      makeResults({
        wavesCompleted: 5,
        maxCombo: 12,
        wordsFound: Array.from({ length: 25 }, (_, i) => `w${i}`),
        clearPercentage: 95,
        finalScore: 15000,
      }),
    );
    expect(earned).toEqual(
      expect.arrayContaining([
        'firstBlast',
        'waveRider',
        'marathoner',
        'comboChain',
        'comboKing',
        'wordsmith',
        'clearMaster',
        'highScorer',
      ]),
    );
    expect(earned).toHaveLength(8);
  });

  it('returns empty array for an empty / failed run', () => {
    expect(computeEarnedBadges(makeResults())).toEqual([]);
  });
});
