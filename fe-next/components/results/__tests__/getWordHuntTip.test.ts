import { getWordHuntTip } from '../getWordHuntTip';

describe('getWordHuntTip', () => {
  const baseStats = {
    score: 50,
    survived: true,
    lifeRemaining: 80,
    discoveryWords: 10,
    foundTarget: true,
    isFirstFinder: false,
    totalPlayers: 4,
    rank: 2,
    validWordCount: 8,
    invalidWordCount: 2,
    avgWordLength: 4.5,
    longestWordLength: 7,
  };

  describe('guess-efficiency insights (attemptsToFind known)', () => {
    it('does NOT punish a fast 1-guess solver — reassures + nudges to farm', () => {
      const tip = getWordHuntTip({ ...baseStats, attemptsToFind: 1, validWordCount: 1 });
      expect(tip.key).toBe('wordHuntTips.fastSolveFarmMore');
      expect(tip.params?.attempts).toBe(1);
    });

    it('teaches the core loop when the target was solved blind (0 words)', () => {
      const tip = getWordHuntTip({ ...baseStats, attemptsToFind: 2, validWordCount: 0 });
      expect(tip.key).toBe('wordHuntTips.spellWordsFirst');
    });

    it('nudges slow solvers to trust the clues sooner', () => {
      const tip = getWordHuntTip({ ...baseStats, attemptsToFind: 6, validWordCount: 9 });
      expect(tip.key).toBe('wordHuntTips.trustCluesSooner');
      expect(tip.params?.attempts).toBe(6);
    });

    it('falls through to legacy tips when attemptsToFind is absent', () => {
      const tip = getWordHuntTip({ ...baseStats });
      expect(tip.key).not.toBe('wordHuntTips.fastSolveFarmMore');
    });
  });

  describe('eliminated players', () => {
    it('tells players with few words to find more words to stay alive', () => {
      const tip = getWordHuntTip({
        ...baseStats, survived: false, lifeRemaining: 0, validWordCount: 2, invalidWordCount: 1,
      });
      expect(tip.key).toBe('wordHuntTips.needMoreWords');
      expect(tip.params?.count).toBe(2);
    });

    it('flags accuracy problem when many invalid words drain life', () => {
      const tip = getWordHuntTip({
        ...baseStats, survived: false, lifeRemaining: 0,
        validWordCount: 5, invalidWordCount: 8,
      });
      expect(tip.key).toBe('wordHuntTips.accuracyDrainsLife');
      expect(tip.params?.accuracy).toBe(38);
      expect(tip.params?.invalid).toBe(8);
    });

    it('suggests longer words when avg length is short', () => {
      const tip = getWordHuntTip({
        ...baseStats, survived: false, lifeRemaining: 0,
        validWordCount: 6, invalidWordCount: 1, avgWordLength: 3.2,
      });
      expect(tip.key).toBe('wordHuntTips.longerWordsSurvive');
      expect(tip.params?.avg).toBe(3.2);
    });

    it('gives general survival tip when stats are decent', () => {
      const tip = getWordHuntTip({
        ...baseStats, survived: false, lifeRemaining: 0,
        validWordCount: 8, invalidWordCount: 2, avgWordLength: 4.5,
      });
      expect(tip.key).toBe('wordHuntTips.shortWordsBetweenGuesses');
    });
  });

  describe('winners', () => {
    it('gives first finder a concrete next-level push', () => {
      const tip = getWordHuntTip({ ...baseStats, rank: 1, isFirstFinder: true });
      expect(tip.key).toBe('wordHuntTips.firstFinderPush');
      expect(tip.params?.words).toBe(8);
    });

    it('tells winner with short avg to aim longer', () => {
      const tip = getWordHuntTip({ ...baseStats, rank: 1, avgWordLength: 3.8 });
      expect(tip.key).toBe('wordHuntTips.winnerLongerWords');
      expect(tip.params?.avg).toBe(3.8);
    });

    it('tells winner with good length to find more words', () => {
      const tip = getWordHuntTip({ ...baseStats, rank: 1, avgWordLength: 5.0 });
      expect(tip.key).toBe('wordHuntTips.winnerMoreWords');
      expect(tip.params?.count).toBe(8);
    });
  });

  describe('survived but not winner', () => {
    it('flags low accuracy when too many invalid words', () => {
      const tip = getWordHuntTip({
        ...baseStats, rank: 3, validWordCount: 4, invalidWordCount: 5,
      });
      expect(tip.key).toBe('wordHuntTips.tooManyInvalid');
      expect(tip.params?.accuracy).toBe(44);
    });

    it('warns about life management when barely survived', () => {
      const tip = getWordHuntTip({ ...baseStats, rank: 2, lifeRemaining: 10 });
      expect(tip.key).toBe('wordHuntTips.lifeManagement');
      expect(tip.params?.life).toBe(10);
    });

    it('suggests pushing word length when avg is short', () => {
      const tip = getWordHuntTip({
        ...baseStats, rank: 2, avgWordLength: 3.5, longestWordLength: 5,
      });
      expect(tip.key).toBe('wordHuntTips.pushWordLength');
      expect(tip.params?.avg).toBe(3.5);
      expect(tip.params?.longest).toBe(5);
    });

    it('suggests scanning for more words when volume is low', () => {
      const tip = getWordHuntTip({
        ...baseStats, rank: 3, validWordCount: 3, avgWordLength: 5.0,
      });
      expect(tip.key).toBe('wordHuntTips.scanMoreWords');
      expect(tip.params?.count).toBe(3);
    });

    it('tells solid performers to push for first with their rank', () => {
      const tip = getWordHuntTip({ ...baseStats, rank: 2 });
      expect(tip.key).toBe('wordHuntTips.pushForFirst');
      expect(tip.params?.rank).toBe(2);
    });
  });
});
