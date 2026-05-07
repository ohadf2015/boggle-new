import { describe, it, expect } from 'vitest';
import { transformAchievementRow } from './achievementTransform';

const baseRow = (overrides = {}) => ({
  current_tier: 'bronze',
  progress_value: 25,
  is_pinned: false,
  achievement_definitions: {
    key: 'word_master',
    category: 'progress',
    icon: '🎓',
    is_secret: false,
    achievement_tiers: [
      { tier: 'bronze',   threshold: 10,  tier_order: 1 },
      { tier: 'silver',   threshold: 50,  tier_order: 2 },
      { tier: 'gold',     threshold: 100, tier_order: 3 },
      { tier: 'platinum', threshold: 200, tier_order: 4 },
    ],
  },
  ...overrides,
});

describe('transformAchievementRow', () => {
  it('sets nextThreshold to the next tier threshold', () => {
    const result = transformAchievementRow(baseRow());
    // bronze → silver threshold = 50
    expect(result.nextThreshold).toBe(50);
  });

  it('calculates percentComplete from progress_value / nextThreshold', () => {
    const result = transformAchievementRow(baseRow()); // 25/50 = 50%
    expect(result.percentComplete).toBe(50);
  });

  it('returns nextThreshold=null and percentComplete=100 for platinum tier', () => {
    const result = transformAchievementRow(baseRow({ current_tier: 'platinum' }));
    expect(result.nextThreshold).toBeNull();
    expect(result.percentComplete).toBe(100);
  });

  it('returns percentComplete=100 when no tiers data available', () => {
    const row = {
      ...baseRow(),
      achievement_definitions: {
        key: 'word_master',
        category: 'progress',
        icon: '🎓',
        is_secret: false,
        achievement_tiers: undefined,
      },
    };
    const result = transformAchievementRow(row);
    expect(result.nextThreshold).toBeNull();
    expect(result.percentComplete).toBe(100);
  });

  it('caps percentComplete at 100 even if progress exceeds threshold', () => {
    const result = transformAchievementRow(baseRow({ progress_value: 999 }));
    expect(result.percentComplete).toBeLessThanOrEqual(100);
  });

  it('maps all scalar fields through', () => {
    const result = transformAchievementRow(baseRow());
    expect(result.achievementKey).toBe('word_master');
    expect(result.currentTier).toBe('bronze');
    expect(result.progressValue).toBe(25);
    expect(result.isPinned).toBe(false);
    expect(result.isSecret).toBe(false);
    expect(result.category).toBe('progress');
    expect(result.icon).toBe('🎓');
  });
});
