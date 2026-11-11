import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));
vi.mock('@/components/animations/LevelUpCelebration', () => ({
  LevelUpCelebration: (p: { level: number; title?: string | null; onDismiss?: () => void }) => (
    <button data-testid="level-up-celebration" data-level={p.level} data-title={p.title ?? ''} onClick={p.onDismiss} />
  ),
}));

import { announceLevelUp, getPendingLevelUp, __resetLevelUpBusForTests } from '@/lib/levelUp/levelUpBus';
import { LEVEL_UNLOCK_LADDER } from '@/lib/avatar/unlocks';
import { LevelUpWatcher } from '../LevelUpWatcher';

function levelWithoutPart(min: number): number {
  const rungs = new Set(LEVEL_UNLOCK_LADDER.map(u => u.level));
  let l = min;
  while (rungs.has(l)) l++;
  return l;
}

describe('LevelUpWatcher', () => {
  beforeEach(() => __resetLevelUpBusForTests());

  it('celebrates a level-up that grants no avatar part, with its title', async () => {
    // Given a level-up crossing a title but no ladder rung
    const lvl = levelWithoutPart(5);
    render(<LevelUpWatcher />);
    act(() => {
      announceLevelUp({ oldLevel: lvl - 1, newLevel: lvl, newTitles: ['WORD_SEEKER'] }, 'single');
    });
    // Then the celebration shows the level and the title
    const el = await screen.findByTestId('level-up-celebration');
    expect(el).toHaveAttribute('data-level', String(lvl));
    expect(el).toHaveAttribute('data-title', 'WORD_SEEKER');
    act(() => el.click());
    expect(getPendingLevelUp()).toBeNull();
  });

  it('leaves part-granting level-ups to the unlock reveal (no double celebration)', async () => {
    const rung = LEVEL_UNLOCK_LADDER[0].level;
    render(<LevelUpWatcher />);
    act(() => {
      announceLevelUp({ oldLevel: rung - 1, newLevel: rung }, 'single');
    });
    await new Promise(r => setTimeout(r, 0));
    expect(screen.queryByTestId('level-up-celebration')).toBeNull();
    expect(getPendingLevelUp()).toBeNull();
  });
});
