import { describe, it, expect } from 'vitest';
import { getQuestArt } from '../questArt';
import type { QuestConditionType } from '@/shared/dailyQuestPool';

const ALL_TYPES: QuestConditionType[] = [
  'longWord', 'score', 'wordsInGame', 'combo', 'mpWin',
  'beatHuman', 'towerMetres', 'towerFloors', 'puzzlesSolved', 'playMode',
];

describe('getQuestArt', () => {
  it('given a quest with a mode, when resolved, then the mode sticker wins over the type', () => {
    expect(getQuestArt({ type: 'playMode', mode: 'brain' }).art).toBe('/quests/brain.webp');
    expect(getQuestArt({ type: 'towerMetres', mode: 'word-tower-daily' }).art).toBe('/quests/tower.webp');
    expect(getQuestArt({ type: 'puzzlesSolved', mode: 'connections-daily' }).art).toBe('/quests/chain.webp');
    expect(getQuestArt({ type: 'playMode', mode: 'word-hunt' }).art).toBe('/quests/magnifier.webp');
  });

  it('given no mode, when resolved, then the type picks the sticker', () => {
    expect(getQuestArt({ type: 'longWord' }).art).toBe('/quests/tape.webp');
    expect(getQuestArt({ type: 'wordsInGame' }).art).toBe('/quests/bolt.webp');
    expect(getQuestArt({ type: 'towerFloors' }).art).toBe('/quests/bricks.webp');
    expect(getQuestArt({ type: 'combo' }).art).toBe('/quests/fireball.webp');
    expect(getQuestArt({ type: 'mpWin' }).art).toBe('/quests/crown.webp');
    expect(getQuestArt({ type: 'beatHuman' }).art).toBe('/quests/swords.webp');
  });

  it('given every condition type, when resolved, then each has art and full accent classes', () => {
    for (const type of ALL_TYPES) {
      const { art, accent } = getQuestArt({ type });
      expect(art).toMatch(/^\/quests\/[a-z]+\.webp$/);
      expect(accent.bg).toMatch(/^bg-neo-[a-z]+$/);
      expect(accent.text).toMatch(/^text-neo-[a-z]+$/);
      expect(accent.border).toMatch(/^border-neo-[a-z]+$/);
    }
  });

  it('given a typical day of three different types, when resolved, then accents differ', () => {
    const accents = (['longWord', 'mpWin', 'playMode'] as const).map((type) => getQuestArt({ type }).accent.bg);
    expect(new Set(accents).size).toBe(3);
  });
});
