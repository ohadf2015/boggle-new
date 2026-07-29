import {
  createBossRushState,
  advanceBossRush,
  getBossRushReward,
  type BossRushState,
  type BossRushDifficulty,
} from '../bossRush';

describe('bossRush', () => {
  describe('createBossRushState', () => {
    it('should create initial state with 5 bosses (normal)', () => {
      const state = createBossRushState();
      expect(state.totalBosses).toBe(5);
      expect(state.currentBossIndex).toBe(0);
      expect(state.defeatedCount).toBe(0);
      expect(state.isComplete).toBe(false);
      expect(state.difficulty).toBe('normal');
    });

    it('should include boss IDs for each world boss', () => {
      const state = createBossRushState();
      expect(state.bossSequence.length).toBe(5);
      expect(state.bossSequence[0]).toBeDefined();
    });

    it('should create hard difficulty with 5 bosses from harder worlds', () => {
      const state = createBossRushState('hard');
      expect(state.totalBosses).toBe(5);
      expect(state.bossSequence).toEqual([3, 5, 6, 8, 10]);
      expect(state.difficulty).toBe('hard');
    });

    it('should create legendary difficulty with all 10 bosses', () => {
      const state = createBossRushState('legendary');
      expect(state.totalBosses).toBe(10);
      expect(state.bossSequence).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
      expect(state.difficulty).toBe('legendary');
    });
  });

  describe('advanceBossRush', () => {
    it('should advance to next boss after victory', () => {
      const state = createBossRushState();
      const next = advanceBossRush(state, 'victory');
      expect(next.currentBossIndex).toBe(1);
      expect(next.defeatedCount).toBe(1);
    });

    it('should end rush on defeat', () => {
      const state = createBossRushState();
      const next = advanceBossRush(state, 'defeat');
      expect(next.isComplete).toBe(true);
      expect(next.defeatedCount).toBe(0);
    });

    it('should complete rush after all bosses defeated', () => {
      let state = createBossRushState();
      for (let i = 0; i < state.totalBosses; i++) {
        state = advanceBossRush(state, 'victory');
      }
      expect(state.isComplete).toBe(true);
      expect(state.defeatedCount).toBe(5);
    });
  });

  describe('getBossRushReward', () => {
    it('should return 0 for 0 bosses defeated', () => {
      const reward = getBossRushReward(0);
      expect(reward.gold).toBe(0);
    });

    it('should scale rewards with bosses defeated', () => {
      const r1 = getBossRushReward(1);
      const r3 = getBossRushReward(3);
      expect(r3.gold).toBeGreaterThan(r1.gold);
    });

    it('should give bonus for full clear (normal)', () => {
      const r4 = getBossRushReward(4);
      const r5 = getBossRushReward(5);
      expect(r5.gold).toBeGreaterThan(r4.gold * 1.3);
    });

    it('should give 1.5x rewards for hard difficulty', () => {
      const normalReward = getBossRushReward(3, 'normal');
      const hardReward = getBossRushReward(3, 'hard');
      expect(hardReward.gold).toBe(Math.floor(normalReward.gold * 1.5));
    });

    it('should give 2.5x rewards for legendary difficulty', () => {
      const normalReward = getBossRushReward(3, 'normal');
      const legendaryReward = getBossRushReward(3, 'legendary');
      expect(legendaryReward.gold).toBe(Math.floor(normalReward.gold * 2.5));
    });

    it('should give full clear bonus based on difficulty total bosses', () => {
      // Normal full clear at 5
      const r5Normal = getBossRushReward(5, 'normal');
      const r4Normal = getBossRushReward(4, 'normal');
      expect(r5Normal.gold).toBeGreaterThan(r4Normal.gold * 1.3);

      // Legendary full clear requires 10
      const r5Legendary = getBossRushReward(5, 'legendary');
      // 5 bosses in legendary is NOT a full clear, so no bonus
      const baseGold5 = 5 * 50 + 4 * 25;
      expect(r5Legendary.gold).toBe(Math.floor(baseGold5 * 2.5));
    });

    it('should include rune fragments for 3+ bosses', () => {
      expect(getBossRushReward(2).runeFragments).toBe(0);
      expect(getBossRushReward(3).runeFragments).toBeGreaterThan(0);
    });
  });
});
