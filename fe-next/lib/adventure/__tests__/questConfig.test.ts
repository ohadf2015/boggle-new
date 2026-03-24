import { getChapterNumber, getQuestsForChapter, CHAPTER_QUESTS } from '../questConfig';

describe('questConfig', () => {
  it('getChapterNumber maps to CHAPTER_STRUCTURE [2,2,3]', () => {
    expect(getChapterNumber(1)).toBe(1);
    expect(getChapterNumber(2)).toBe(1);
    expect(getChapterNumber(3)).toBe(2);
    expect(getChapterNumber(4)).toBe(2);
    expect(getChapterNumber(5)).toBe(3);
    expect(getChapterNumber(6)).toBe(3);
    expect(getChapterNumber(7)).toBe(3);
  });

  it('has 90 total quests (10 worlds x 9 quests)', () => {
    expect(CHAPTER_QUESTS).toHaveLength(90);
  });

  it('every world has 3 quests per chapter, 9 total', () => {
    for (let world = 1; world <= 10; world++) {
      for (let chapter = 1; chapter <= 3; chapter++) {
        expect(getQuestsForChapter(world, chapter)).toHaveLength(3);
      }
    }
  });

  it('all quest ids are unique', () => {
    const ids = CHAPTER_QUESTS.map(q => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('World 1 chapter 1 quests have no boss quests (boss is in chapter 3)', () => {
    const w1c1 = getQuestsForChapter(1, 1);
    expect(w1c1[0]).toMatchObject({ id: 'w1c1-words', type: 'wordCountChapter', target: 20, reward: { coins: 100, xp: 50 } });
    expect(w1c1[1]).toMatchObject({ id: 'w1c1-long', type: 'longWordCount', target: 5, reward: { coins: 80, xp: 40 } });
    expect(w1c1[2]).toMatchObject({ id: 'w1c1-perfect', type: 'perfectLevels', target: 1, reward: { coins: 120, xp: 60 } });
    // defeatBossNoHint moved to chapter 3 where the boss actually is
    const w1c1Types = w1c1.map(q => q.type);
    expect(w1c1Types).not.toContain('defeatBossNoHint');
  });

  it('World 1 chapter 2 quests are unchanged', () => {
    const w1c2 = getQuestsForChapter(1, 2);
    expect(w1c2[0]).toMatchObject({ id: 'w1c2-words', type: 'wordCountChapter', target: 30, reward: { coins: 120, xp: 60 } });
    expect(w1c2[1]).toMatchObject({ id: 'w1c2-perfect', type: 'perfectLevels', target: 2, reward: { coins: 180, xp: 90 } });
    expect(w1c2[2]).toMatchObject({ id: 'w1c2-long', type: 'longWordCount', target: 8, reward: { coins: 100, xp: 50 } });
  });

  it('rewards scale up from world 1 to world 10', () => {
    const w1Coins = getQuestsForChapter(1, 1).reduce((sum, q) => sum + q.reward.coins, 0);
    const w10Coins = getQuestsForChapter(10, 1).reduce((sum, q) => sum + q.reward.coins, 0);
    expect(w10Coins).toBeGreaterThan(w1Coins);
  });

  it('each quest has valid structure', () => {
    for (const q of CHAPTER_QUESTS) {
      expect(q.id).toMatch(/^w\d+c\d+-/);
      expect(q.chapterNumber).toBeGreaterThanOrEqual(1);
      expect(q.chapterNumber).toBeLessThanOrEqual(3);
      expect(q.worldId).toBeGreaterThanOrEqual(1);
      expect(q.worldId).toBeLessThanOrEqual(10);
      expect(q.target).toBeGreaterThan(0);
      expect(q.reward.coins).toBeGreaterThan(0);
      expect(q.reward.xp).toBeGreaterThan(0);
      expect(q.titleKey).toBeTruthy();
      expect(q.descriptionKey).toBeTruthy();
    }
  });

  it('bossHighHealth quests only appear in Chapter 3 (where the boss is)', () => {
    for (let world = 1; world <= 10; world++) {
      for (let chapter = 1; chapter <= 2; chapter++) {
        const quests = getQuestsForChapter(world, chapter);
        const bossQuests = quests.filter(q => q.type === 'bossHighHealth');
        expect(bossQuests).toHaveLength(0);
      }
    }
  });

  it('perfectLevels target never exceeds chapter level count', () => {
    // Chapter 1: 2 levels, Chapter 2: 2 levels, Chapter 3: 3 levels
    const CHAPTER_LEVELS = [0, 2, 2, 3]; // index 1-3
    for (const quest of CHAPTER_QUESTS) {
      if (quest.type === 'perfectLevels') {
        const maxLevels = CHAPTER_LEVELS[quest.chapterNumber];
        expect(quest.target).toBeLessThanOrEqual(maxLevels);
      }
    }
  });

  it('flashChallengeMaster target is achievable (max 2 per level × chapter levels)', () => {
    const CHAPTER_LEVELS = [0, 2, 2, 3];
    const MAX_FLASH_PER_LEVEL = 2;
    for (const quest of CHAPTER_QUESTS) {
      if (quest.type === 'flashChallengeMaster') {
        const maxFlash = CHAPTER_LEVELS[quest.chapterNumber] * MAX_FLASH_PER_LEVEL;
        expect(quest.target).toBeLessThanOrEqual(maxFlash);
      }
    }
  });

  it('world-specific quest types match their mechanics', () => {
    const w7Types = getQuestsForChapter(7, 1).map(q => q.type);
    expect(w7Types).toContain('worldMechanicUse');

    const w5Types = getQuestsForChapter(5, 1).map(q => q.type);
    expect(w5Types).toContain('scoreChallenge');
    // bossHighHealth moved to chapter 3 where the boss is
    const w5c3Types = getQuestsForChapter(5, 3).map(q => q.type);
    expect(w5c3Types).toContain('bossHighHealth');

    const w10Types = getQuestsForChapter(10, 3).map(q => q.type);
    expect(w10Types).toContain('worldMechanicUse');
    expect(w10Types).toContain('defeatBossNoHint');
  });
});
