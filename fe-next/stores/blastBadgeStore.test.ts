/**
 * Blast Badge Store — zustand persist layer.
 *
 * Store responsibility: track which badge IDs the player has *ever* unlocked
 * across runs. Pure compute stays in blastBadges.ts; this store only diffs
 * incoming "earned this run" IDs against the persisted set.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { useBlastBadgeStore } from './blastBadgeStore';

describe('useBlastBadgeStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useBlastBadgeStore.getState().reset();
  });

  it('starts with no unlocked badges', () => {
    expect(useBlastBadgeStore.getState().unlockedIds).toEqual([]);
  });

  it('unlockBadge adds an id to the persisted set', () => {
    useBlastBadgeStore.getState().unlockBadge('firstBlast');
    expect(useBlastBadgeStore.getState().unlockedIds).toContain('firstBlast');
  });

  it('unlockBadge is idempotent — no duplicates', () => {
    const { unlockBadge } = useBlastBadgeStore.getState();
    unlockBadge('firstBlast');
    unlockBadge('firstBlast');
    expect(useBlastBadgeStore.getState().unlockedIds).toEqual(['firstBlast']);
  });

  it('hasUnlocked returns true only for previously unlocked ids', () => {
    const { unlockBadge, hasUnlocked } = useBlastBadgeStore.getState();
    expect(hasUnlocked('comboKing')).toBe(false);
    unlockBadge('comboKing');
    expect(useBlastBadgeStore.getState().hasUnlocked('comboKing')).toBe(true);
  });

  it('diffNewBadges returns only never-before-seen ids', () => {
    const { unlockBadge, diffNewBadges } = useBlastBadgeStore.getState();
    unlockBadge('firstBlast');
    const fresh = useBlastBadgeStore.getState().diffNewBadges([
      'firstBlast',
      'waveRider',
      'comboChain',
    ]);
    expect(fresh).toEqual(['waveRider', 'comboChain']);
  });

  it('reset clears all unlocked ids', () => {
    const { unlockBadge, reset } = useBlastBadgeStore.getState();
    unlockBadge('firstBlast');
    unlockBadge('highScorer');
    reset();
    expect(useBlastBadgeStore.getState().unlockedIds).toEqual([]);
  });

  it('persists unlocks to localStorage under a stable key', () => {
    useBlastBadgeStore.getState().unlockBadge('marathoner');
    const raw = localStorage.getItem('blast-badges');
    expect(raw).toBeTruthy();
    expect(raw).toContain('marathoner');
  });
});
