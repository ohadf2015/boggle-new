import {
  createBossRushState,
  advanceBossRush,
  getBossRushReward,
  type BossRushState,
} from '../bossRush';

describe('bossRush', () => {
  describe('createBossRushState', () => {
    it('should create initial state with 5 bosses', () => {
      const state = createBossRushState();
      expect(state.totalBosses).toBe(5);
      expect(state.currentBossIndex).toBe(0);
      expect(state.defeatedCount).toBe(0);
      expect(state.isComplete).toBe(false);
    });

    it('should include boss IDs for each world boss', () => {
      const state = createBossRushState();
      expect(state.bossSequence.length).toBe(5);
      expect(state.bossSequence[0]).toBeDefined();
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

    it('should give bonus for full clear', () => {
      const r4 = getBossRushReward(4);
      const r5 = getBossRushReward(5);
      // Full clear bonus should make 5 significantly more than 4
      expect(r5.gold).toBeGreaterThan(r4.gold * 1.3);
    });

    it('should include rune fragments for 3+ bosses', () => {
      expect(getBossRushReward(2).runeFragments).toBe(0);
      expect(getBossRushReward(3).runeFragments).toBeGreaterThan(0);
    });
  });
});
