import { getChapterNumber, getQuestsForChapter } from '../questConfig';

describe('questConfig', () => {
  it('getChapterNumber groups correctly', () => {
    expect(getChapterNumber(1)).toBe(1);
    expect(getChapterNumber(5)).toBe(1);
    expect(getChapterNumber(6)).toBe(2);
    expect(getChapterNumber(10)).toBe(2);
  });

  it('getQuestsForChapter returns 3 quests', () => {
    expect(getQuestsForChapter(1, 1)).toHaveLength(3);
    expect(getQuestsForChapter(1, 2)).toHaveLength(3);
  });
});
