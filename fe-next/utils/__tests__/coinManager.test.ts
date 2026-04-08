/**
 * Tests for coinManager utility
 *
 * Covers: calculateGameReward, calculateDailyReward, calculateComboMilestoneReward,
 * isComboMilestone, constants
 */

import {
  calculateGameReward,
  calculateDailyReward,
  calculateComboMilestoneReward,
  isComboMilestone,
  COIN_EARNING,
  COIN_EARNING_OTHER,
  COMBO_COIN_REWARDS,
  COMBO_MILESTONES,
} from '../coinManager';

describe('coinManager', () => {
  // ==========================================
  // calculateGameReward
  // ==========================================
  describe('calculateGameReward', () => {
    it('applies SINGLEPLAYER_BASE for singleplayer with score > 0', () => {
      const result = calculateGameReward(100, 'singleplayer');
      expect(result.breakdown.base).toBe(COIN_EARNING_OTHER.SINGLEPLAYER_BASE);
    });

    it('applies MULTIPLAYER_BASE for multiplayer with score > 0', () => {
      const result = calculateGameReward(100, 'multiplayer');
      expect(result.breakdown.base).toBe(COIN_EARNING_OTHER.MULTIPLAYER_BASE);
    });

    it('gives 0 base when score is 0', () => {
      const result = calculateGameReward(0, 'singleplayer');
      expect(result.breakdown.base).toBe(0);
      expect(result.total).toBe(0);
    });

    it('calculates scoreBonus as floor(score / SCORE_DIVISOR)', () => {
      // 155 / 10 = 15.5 → floor → 15
      const result = calculateGameReward(155, 'singleplayer');
      expect(result.breakdown.scoreBonus).toBe(15);
    });

    it('floors scoreBonus for non-divisible scores', () => {
      const result = calculateGameReward(7, 'singleplayer');
      expect(result.breakdown.scoreBonus).toBe(0);
    });

    it('gives WIN_BONUS for rank 1 in multiplayer', () => {
      const result = calculateGameReward(50, 'multiplayer', 1, 4);
      expect(result.breakdown.placement).toBe(COIN_EARNING_OTHER.WIN_BONUS);
    });

    it('gives TOP_3_BONUS for rank 2-3 in multiplayer', () => {
      expect(calculateGameReward(50, 'multiplayer', 2, 4).breakdown.placement).toBe(COIN_EARNING_OTHER.TOP_3_BONUS);
      expect(calculateGameReward(50, 'multiplayer', 3, 4).breakdown.placement).toBe(COIN_EARNING_OTHER.TOP_3_BONUS);
    });

    it('gives 0 placement for rank > 3', () => {
      const result = calculateGameReward(50, 'multiplayer', 4, 4);
      expect(result.breakdown.placement).toBe(0);
    });

    it('gives 0 placement when totalPlayers is 1 (no competition)', () => {
      const result = calculateGameReward(50, 'multiplayer', 1, 1);
      expect(result.breakdown.placement).toBe(0);
    });

    it('gives 0 placement when rank/totalPlayers undefined', () => {
      const result = calculateGameReward(50, 'multiplayer');
      expect(result.breakdown.placement).toBe(0);
    });

    it('sums total correctly', () => {
      const result = calculateGameReward(100, 'multiplayer', 1, 4);
      expect(result.total).toBe(
        COIN_EARNING_OTHER.MULTIPLAYER_BASE + 10 + COIN_EARNING_OTHER.WIN_BONUS
      );
    });

    it('handles very large score (total capped at MAX_GAME_REWARD)', () => {
      const result = calculateGameReward(1_000_000, 'singleplayer');
      expect(result.breakdown.scoreBonus).toBe(100_000);
      expect(result.total).toBe(COIN_EARNING_OTHER.MAX_GAME_REWARD);
    });

    it('handles negative score (treated as no base)', () => {
      // score <= 0 → base = 0, scoreBonus = floor(negative / 10) = negative
      const result = calculateGameReward(-10, 'singleplayer');
      expect(result.breakdown.base).toBe(0);
      expect(result.breakdown.scoreBonus).toBe(-1);
    });
  });

  // ==========================================
  // calculateDailyReward
  // ==========================================
  describe('calculateDailyReward', () => {
    it('gives half base when not solved', () => {
      const result = calculateDailyReward(false, 100, 5);
      expect(result.total).toBe(Math.floor(COIN_EARNING.DAILY_BASE / 2));
      expect(result.breakdown.efficiency).toBe(0);
      expect(result.breakdown.streak).toBe(0);
    });

    it('gives full base + efficiency + streak when solved', () => {
      const result = calculateDailyReward(true, 80, 3);
      expect(result.breakdown.base).toBe(COIN_EARNING.DAILY_BASE);
      expect(result.breakdown.efficiency).toBe(Math.floor(80 * COIN_EARNING.EFFICIENCY_MULTIPLIER));
      expect(result.breakdown.streak).toBe(3 * COIN_EARNING.STREAK_BONUS);
    });

    it('does not cap streak bonus (uncapped)', () => {
      const result = calculateDailyReward(true, 0, 100);
      expect(result.breakdown.streak).toBe(100 * COIN_EARNING.STREAK_BONUS);
    });

    it('handles 0 efficiency and 0 streak', () => {
      const result = calculateDailyReward(true, 0, 0);
      expect(result.total).toBe(COIN_EARNING.DAILY_BASE);
    });

    it('floors efficiency bonus', () => {
      // 3 * 0.5 = 1.5 → floor → 1
      const result = calculateDailyReward(true, 3, 0);
      expect(result.breakdown.efficiency).toBe(1);
    });
  });

  // ==========================================
  // calculateComboMilestoneReward
  // ==========================================
  describe('calculateComboMilestoneReward', () => {
    it('returns 0 for combo < 5', () => {
      expect(calculateComboMilestoneReward(0)).toBe(0);
      expect(calculateComboMilestoneReward(4)).toBe(0);
    });

    it('returns MILESTONE_5 for combo 5-9', () => {
      expect(calculateComboMilestoneReward(5)).toBe(COMBO_COIN_REWARDS.MILESTONE_5);
      expect(calculateComboMilestoneReward(9)).toBe(COMBO_COIN_REWARDS.MILESTONE_5);
    });

    it('returns MILESTONE_10 for combo 10-14', () => {
      expect(calculateComboMilestoneReward(10)).toBe(COMBO_COIN_REWARDS.MILESTONE_10);
    });

    it('returns MILESTONE_15 for combo 15-19', () => {
      expect(calculateComboMilestoneReward(15)).toBe(COMBO_COIN_REWARDS.MILESTONE_15);
    });

    it('returns MILESTONE_20 for combo >= 20', () => {
      expect(calculateComboMilestoneReward(20)).toBe(COMBO_COIN_REWARDS.MILESTONE_20);
      expect(calculateComboMilestoneReward(100)).toBe(COMBO_COIN_REWARDS.MILESTONE_20);
    });
  });

  // ==========================================
  // isComboMilestone
  // ==========================================
  describe('isComboMilestone', () => {
    it('returns true for milestone levels', () => {
      for (const m of COMBO_MILESTONES) {
        expect(isComboMilestone(m)).toBe(true);
      }
    });

    it('returns false for non-milestone levels', () => {
      expect(isComboMilestone(0)).toBe(false);
      expect(isComboMilestone(3)).toBe(false);
      expect(isComboMilestone(7)).toBe(false);
      expect(isComboMilestone(12)).toBe(false);
    });
  });

  // ==========================================
  // Constants sanity checks
  // ==========================================
  describe('constants', () => {
    it('SINGLEPLAYER_BASE is 10', () => {
      expect(COIN_EARNING_OTHER.SINGLEPLAYER_BASE).toBe(10);
    });

    it('SCORE_DIVISOR is 10', () => {
      expect(COIN_EARNING_OTHER.SCORE_DIVISOR).toBe(10);
    });

    it('COMBO_MILESTONES are sorted ascending', () => {
      for (let i = 1; i < COMBO_MILESTONES.length; i++) {
        expect(COMBO_MILESTONES[i]).toBeGreaterThan(COMBO_MILESTONES[i - 1]);
      }
    });
  });
});
