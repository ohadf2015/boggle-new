import { CHAPTER_QUESTS, getQuestsForChapter, getChapterNumber } from '../questConfig';

describe('questConfig expanded', () => {
  it('should have quests for all 10 worlds', () => {
    for (let worldId = 1; worldId <= 10; worldId++) {
      const worldQuests = CHAPTER_QUESTS.filter(q => q.worldId === worldId);
      expect(worldQuests.length).toBeGreaterThanOrEqual(6); // at least 2 per chapter × 3 chapters
    }
  });

  it('should have quests for all 3 chapters per world', () => {
    for (let worldId = 1; worldId <= 10; worldId++) {
      for (let chapter = 1; chapter <= 3; chapter++) {
        const quests = getQuestsForChapter(worldId, chapter);
        expect(quests.length).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('should have unique quest IDs', () => {
    const ids = CHAPTER_QUESTS.map(q => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('should have valid reward values', () => {
    for (const quest of CHAPTER_QUESTS) {
      expect(quest.reward.coins).toBeGreaterThan(0);
      expect(quest.reward.xp).toBeGreaterThan(0);
      expect(quest.target).toBeGreaterThan(0);
    }
  });

  it('should use varied quest types beyond basic wordCount', () => {
    const allTypes = new Set(CHAPTER_QUESTS.map(q => q.type));
    expect(allTypes.size).toBeGreaterThanOrEqual(5);
    // Worlds with explicit mechanics should have mechanic quests
    for (const worldId of [2, 3, 7, 10]) {
      const worldQuests = CHAPTER_QUESTS.filter(q => q.worldId === worldId);
      const mechanicQuests = worldQuests.filter(q => q.type === 'worldMechanicUse');
      expect(mechanicQuests.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('should scale rewards with world difficulty', () => {
    const w1Quests = CHAPTER_QUESTS.filter(q => q.worldId === 1);
    const w10Quests = CHAPTER_QUESTS.filter(q => q.worldId === 10);
    const w1AvgCoins = w1Quests.reduce((s, q) => s + q.reward.coins, 0) / w1Quests.length;
    const w10AvgCoins = w10Quests.reduce((s, q) => s + q.reward.coins, 0) / w10Quests.length;
    expect(w10AvgCoins).toBeGreaterThan(w1AvgCoins);
  });
});
