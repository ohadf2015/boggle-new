import { describe, it, expect, vi, beforeEach } from 'vitest';

const capture = vi.hoisted(() => vi.fn());
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: capture }));

import {
  announceLevelUp,
  getPendingLevelUp,
  consumeLevelUp,
  subscribeLevelUp,
  registerRevealHost,
  hasRevealHost,
  settleLevelUp,
  celebratedThrough,
  __resetLevelUpBusForTests,
} from '../levelUpBus';

describe('levelUpBus — every level-up, once', () => {
  beforeEach(() => {
    capture.mockClear();
    __resetLevelUpBusForTests();
  });

  it('records a level-up and fires level_up with level + source', () => {
    // Given a game that took the player from 8 to 9
    announceLevelUp({ oldLevel: 8, newLevel: 9 }, 'single');
    // Then it is pending and tracked once
    expect(getPendingLevelUp()).toMatchObject({ oldLevel: 8, newLevel: 9, source: 'single' });
    expect(capture).toHaveBeenCalledWith('level_up', { level: 9, source: 'single', levels_gained: 1 });
  });

  it('dedupes the same level announced twice (StrictMode, socket + http)', () => {
    announceLevelUp({ oldLevel: 8, newLevel: 9 }, 'multiplayer');
    announceLevelUp({ oldLevel: 8, newLevel: 9 }, 'multiplayer');
    expect(capture).toHaveBeenCalledTimes(1);
  });

  it('ignores payloads that are not a level-up', () => {
    announceLevelUp({ oldLevel: 9, newLevel: 9 }, 'daily');
    announceLevelUp(null, 'daily');
    expect(getPendingLevelUp()).toBeNull();
    expect(capture).not.toHaveBeenCalled();
  });

  it('carries the new title and notifies subscribers', () => {
    const listener = vi.fn();
    subscribeLevelUp(listener);
    announceLevelUp({ oldLevel: 9, newLevel: 10, newTitles: ['LETTER_SCOUT'] }, 'multiplayer');
    expect(listener).toHaveBeenCalled();
    expect(getPendingLevelUp()?.title).toBe('LETTER_SCOUT');
  });

  it('derives the title from the level ladder when the payload has none', () => {
    announceLevelUp({ oldLevel: 4, newLevel: 5 }, 'single');
    expect(getPendingLevelUp()?.title).toBe('WORD_SEEKER');
  });

  it('consume clears the pending celebration', () => {
    announceLevelUp({ oldLevel: 1, newLevel: 2 }, 'single');
    consumeLevelUp();
    expect(getPendingLevelUp()).toBeNull();
  });
});

describe('levelUpBus — celebration or reveal, never both, never neither', () => {
  beforeEach(() => {
    capture.mockClear();
    __resetLevelUpBusForTests();
  });

  it('Given a new level-up, Then it waits undecided until a watcher settles it', () => {
    announceLevelUp({ oldLevel: 1, newLevel: 2 }, 'quickPlay');
    expect(getPendingLevelUp()?.display).toBe('undecided');
  });

  it('Given no reveal host, When a level unlocks a part, Then the celebration shows', () => {
    announceLevelUp({ oldLevel: 1, newLevel: 2 }, 'quickPlay');
    expect(settleLevelUp()).toBe('celebrate');
    expect(getPendingLevelUp()?.display).toBe('celebrate');
    expect(celebratedThrough()).toBe(2);
  });

  it('Given a mounted reveal host, When a level unlocks a part, Then the reveal owns it and nothing stays pending', () => {
    registerRevealHost();
    announceLevelUp({ oldLevel: 1, newLevel: 2 }, 'single');
    expect(settleLevelUp()).toBe('reveal');
    expect(getPendingLevelUp()).toBeNull();
    expect(celebratedThrough()).toBe(0);
  });

  it('Given a mounted reveal host, When a level unlocks nothing, Then the celebration shows', () => {
    registerRevealHost();
    announceLevelUp({ oldLevel: 10, newLevel: 11 }, 'single');
    expect(settleLevelUp()).toBe('celebrate');
  });

  it('Given a host that unmounted, When a level unlocks a part, Then the celebration shows', () => {
    const release = registerRevealHost();
    expect(hasRevealHost()).toBe(true);
    release();
    release();
    expect(hasRevealHost()).toBe(false);
    announceLevelUp({ oldLevel: 1, newLevel: 2 }, 'blast');
    expect(settleLevelUp()).toBe('celebrate');
  });

  it('settling twice or with nothing pending changes nothing', () => {
    expect(settleLevelUp()).toBeNull();
    announceLevelUp({ oldLevel: 1, newLevel: 2 }, 'blast');
    settleLevelUp();
    const first = getPendingLevelUp();
    expect(settleLevelUp()).toBe('celebrate');
    expect(getPendingLevelUp()).toBe(first);
  });

  it('notifies subscribers when a host registers, so a watcher re-reads', () => {
    const listener = vi.fn();
    subscribeLevelUp(listener);
    registerRevealHost();
    expect(listener).toHaveBeenCalled();
  });
});
