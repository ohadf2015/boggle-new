import { describe, it, expect } from 'vitest';
import { getUnlockedTitles, titleLabelKey, resolveDisplayTitle, isTitleUnlocked } from '../playerTitles';

describe('playerTitles', () => {
  it('unlocks level titles up to the current level', () => {
    // Given a level-12 player
    const ids = getUnlockedTitles({ level: 12 }).map(t => t.id);
    // Then the 5 and 10 titles are unlocked, 15 is not
    expect(ids).toEqual(['WORD_SEEKER', 'LETTER_SCOUT']);
  });

  it('adds prestige and achievement titles', () => {
    const ids = getUnlockedTitles({ level: 1, prestigeLevel: 2, achievementKeys: ['RECORD_10'] }).map(t => t.id);
    expect(ids).toEqual(['ASCENDED_ONE', 'TWICE_RISEN', 'RECORD_BREAKER']);
  });

  it('labels level titles with the landing.home.titles table, others under progression', () => {
    expect(titleLabelKey('WORD_SEEKER')).toBe('landing.home.titles.WORD_SEEKER');
    expect(titleLabelKey('NEMESIS')).toBe('progression.titles.NEMESIS');
  });

  it('a chosen title wins; otherwise the level title', () => {
    expect(resolveDisplayTitle({ chosenTitle: 'NEMESIS', level: 12 })).toBe('NEMESIS');
    expect(resolveDisplayTitle({ chosenTitle: null, level: 12 })).toBe('LETTER_SCOUT');
    expect(resolveDisplayTitle({ chosenTitle: null, level: 2 })).toBeNull();
  });

  it('rejects a title the player has not unlocked', () => {
    expect(isTitleUnlocked('ETERNAL_CHAMPION', { level: 12 })).toBe(false);
    expect(isTitleUnlocked('LETTER_SCOUT', { level: 12 })).toBe(true);
  });
});
