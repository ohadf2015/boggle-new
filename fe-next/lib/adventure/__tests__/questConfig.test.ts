import { getChapterNumber, getQuestsForChapter } from '../questConfig';

describe('questConfig', () => {
  it('getChapterNumber maps to CHAPTER_STRUCTURE [2,2,3]', () => {
    // Chapter 1: levels 1-2
    expect(getChapterNumber(1)).toBe(1);
    expect(getChapterNumber(2)).toBe(1);
    // Chapter 2: levels 3-4
    expect(getChapterNumber(3)).toBe(2);
    expect(getChapterNumber(4)).toBe(2);
    // Chapter 3: levels 5-7
    expect(getChapterNumber(5)).toBe(3);
    expect(getChapterNumber(6)).toBe(3);
    expect(getChapterNumber(7)).toBe(3);
  });

  it('getQuestsForChapter returns 3 quests', () => {
    expect(getQuestsForChapter(1, 1)).toHaveLength(3);
    expect(getQuestsForChapter(1, 2)).toHaveLength(3);
  });
});
