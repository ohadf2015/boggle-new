/**
 * useAdventureGameInit Tests
 *
 * Tests for the hook that consolidates initialization of:
 * adaptive difficulty, AI director, XP, currency, skills, achievements, combo
 */

import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAdventureGameInit } from '../useAdventureGameInit';
import { useAdaptiveDifficulty } from '@/hooks/useAdaptiveDifficulty';
import { useAIDirector } from '@/hooks/useAIDirector';
import { useAdventureXp } from '@/hooks/useAdventureXp';
import { useAdventureCurrency } from '@/hooks/useAdventureCurrency';
import { useSkillPoints } from '@/hooks/useSkillPoints';
import { useSkillEffects } from '@/hooks/useSkillEffects';
import { useAdventureAchievements } from '@/hooks/useAdventureAchievements';
import { useComboMilestone } from '@/hooks/useComboMilestone';
import { registerAllAbilities } from '@/lib/adventure/abilities';
import { showAchievementToast } from '@/components/achievements/AchievementToast';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'test-user-id' } }),
}));
vi.mock('@/contexts/ProgressionContext', () => ({
  useProgressionData: () => ({ progression: { xp: 0, gold: 0, upgrades: {} } }),
}));
vi.mock('@/hooks/useUpgradeEffects', () => ({
  useUpgradeEffects: () => ({
    bonusTimeSeconds: 0,
    comboScoreMultiplier: 1,
    startingHints: 0,
    reviveCount: 0,
    hintRechargeMultiplier: 1,
    bossDamageMultiplier: 1,
    blockFirstAttack: false,
    scrambleImmunity: false,
    bossHealPerWord: 0,
    longWordGoldBonus: 0,
  }),
}));
vi.mock('@/hooks/useAdaptiveDifficulty');
vi.mock('@/hooks/useAIDirector');
vi.mock('@/hooks/useAdventureXp');
vi.mock('@/hooks/useAdventureCurrency');
vi.mock('@/hooks/useSkillPoints');
vi.mock('@/hooks/useSkillEffects');
vi.mock('@/hooks/useAdventureAchievements');
vi.mock('@/hooks/useComboMilestone');
vi.mock('@/lib/adventure/abilities');
vi.mock('@/components/achievements/AchievementToast');
vi.mock('@/lib/adventure/weeklyModifiers', () => ({
  getWeeklyModifiers: () => [],
  applyModifiers: (config: any) => config,
}));
// runeSystem removed — useAdventureGameInit uses inline defaults now

const mockUseAdaptiveDifficulty = useAdaptiveDifficulty as any;
const mockUseAIDirector = useAIDirector as any;
const mockUseAdventureXp = useAdventureXp as any;
const mockUseAdventureCurrency = useAdventureCurrency as any;
const mockUseSkillPoints = useSkillPoints as any;
const mockUseSkillEffects = useSkillEffects as any;
const mockUseAdventureAchievements = useAdventureAchievements as any;
const mockUseComboMilestone = useComboMilestone as any;

describe('useAdventureGameInit', () => {
  const defaultProps = {
    world: 1,
    level: 3,
    timerSeconds: 120,
  };

  const mockAdaptiveDifficulty = {
    tier: 'medium' as const,
    adjustedConfig: { timerSeconds: 120, gridSize: 5, objectives: [{ type: 'score', target: 100 }], world: 1, level: 3, minWordLength: 3 },
    hintData: { level: 'none' as const, highlightTiles: [] },
    powerUpCooldownMultiplier: 1,
    recordCompletion: vi.fn(),
  };

  const mockAIDirector = {
    intensityAdjustments: { hintEscalationRate: 1, difficultyModifier: 0 },
    flowState: 'normal' as const,
    startSession: vi.fn(),
    endSession: vi.fn(),
    recordWord: vi.fn(),
    handleTransition: vi.fn(),
    isBossBattle: false,
  };

  const mockXp = {
    totalXp: 0,
    currentLevel: 1,
    xpProgress: 0,
    awardXp: vi.fn().mockReturnValue({ leveledUp: false }),
    pendingUpdate: null,
    acknowledgePersistence: vi.fn(),
  };

  const mockCurrency = {
    gold: 0,
    upgrades: {},
    addGold: vi.fn(),
    purchase: vi.fn(),
    getUpgradeEffect: vi.fn().mockReturnValue({ multiplier: 1 }),
    pendingUpdate: null,
    acknowledgePersistence: vi.fn(),
  };

  const mockSkillEffectsVal = {
    bossDamageMultiplier: 1,
    comboMultiplierBonus: 0,
    getLongWordDamageMultiplier: vi.fn().mockReturnValue(1),
  };

  const mockAchievements = {
    earnAchievement: vi.fn().mockReturnValue(true),
    getCount: vi.fn().mockReturnValue(0),
  };

  const mockComboMilestone = {
    currentMilestone: null,
    checkMilestone: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAdaptiveDifficulty.mockReturnValue(mockAdaptiveDifficulty as any);
    mockUseAIDirector.mockReturnValue(mockAIDirector as any);
    mockUseAdventureXp.mockReturnValue(mockXp as any);
    mockUseAdventureCurrency.mockReturnValue(mockCurrency as any);
    mockUseSkillPoints.mockReturnValue(undefined as any);
    mockUseSkillEffects.mockReturnValue(mockSkillEffectsVal as any);
    mockUseAdventureAchievements.mockReturnValue(mockAchievements as any);
    mockUseComboMilestone.mockReturnValue(mockComboMilestone as any);
  });

  it('should register all abilities on mount', () => {
    renderHook(() => useAdventureGameInit(defaultProps));
    expect(registerAllAbilities).toHaveBeenCalledTimes(1);
  });

  it('should return adaptive difficulty data', () => {
    const { result } = renderHook(() => useAdventureGameInit(defaultProps));
    expect(result.current.tier).toBe('medium');
    expect(result.current.hintData).toEqual(mockAdaptiveDifficulty.hintData);
    expect(result.current.recordCompletion).toBe(mockAdaptiveDifficulty.recordCompletion);
  });

  it('should compute adjustedLevelConfig with upgrade time bonus', () => {
    // bonusTimeSeconds from useUpgradeEffects is 0 by default (mocked above)
    const { result } = renderHook(() => useAdventureGameInit(defaultProps));
    // base 120 + 0 bonus = 120
    expect(result.current.adjustedLevelConfig.timerSeconds).toBe(120);
  });

  it('should return upgrade bonuses from useUpgradeEffects', () => {
    const { result } = renderHook(() => useAdventureGameInit(defaultProps));
    // timeBonus is hardcoded to 1 (handled via bonusTimeSeconds)
    expect(result.current.upgradeBonuses.timeBonus).toBe(1);
    // scoreBonus comes from upgradeEffects.comboScoreMultiplier (mocked as 1)
    expect(result.current.upgradeBonuses.scoreBonus).toBe(1);
    // xpBonus is hardcoded to 1
    expect(result.current.upgradeBonuses.xpBonus).toBe(1);
  });

  it('should return AI director controls', () => {
    const { result } = renderHook(() => useAdventureGameInit(defaultProps));
    expect(result.current.startAIDirector).toBe(mockAIDirector.startSession);
    expect(result.current.endAIDirector).toBe(mockAIDirector.endSession);
    expect(result.current.recordAIWord).toBe(mockAIDirector.recordWord);
    expect(result.current.handleAITransition).toBe(mockAIDirector.handleTransition);
  });

  it('should return XP and currency state', () => {
    const { result } = renderHook(() => useAdventureGameInit(defaultProps));
    expect(result.current.currentLevel).toBe(1);
    expect(result.current.awardXp).toBe(mockXp.awardXp);
    expect(result.current.addGold).toBe(mockCurrency.addGold);
  });

  it('should return skill effects', () => {
    const { result } = renderHook(() => useAdventureGameInit(defaultProps));
    expect(result.current.skillEffects).toBe(mockSkillEffectsVal);
  });

  it('should return combo milestone data', () => {
    const { result } = renderHook(() => useAdventureGameInit(defaultProps));
    expect(result.current.currentMilestone).toBeNull();
    expect(result.current.checkMilestone).toBe(mockComboMilestone.checkMilestone);
  });

  describe('handleEarnAchievement', () => {
    it('should call earnAchievement and show toast when new', () => {
      mockAchievements.earnAchievement.mockReturnValue(true);
      mockAchievements.getCount.mockReturnValue(0);

      const { result } = renderHook(() => useAdventureGameInit(defaultProps));
      const isNew = result.current.handleEarnAchievement('FIRST_WORD' as any);

      expect(isNew).toBe(true);
      expect(mockAchievements.earnAchievement).toHaveBeenCalledWith('FIRST_WORD');
      expect(showAchievementToast).toHaveBeenCalled();
    });

    it('should not show toast when achievement not new/upgraded', () => {
      mockAchievements.earnAchievement.mockReturnValue(false);

      const { result } = renderHook(() => useAdventureGameInit(defaultProps));
      const isNew = result.current.handleEarnAchievement('FIRST_WORD' as any);

      expect(isNew).toBe(false);
      expect(showAchievementToast).not.toHaveBeenCalled();
    });
  });

  it('should compute adjusted inactivity threshold from AI director', () => {
    mockUseAIDirector.mockReturnValue({
      ...mockAIDirector,
      intensityAdjustments: { hintEscalationRate: 2, difficultyModifier: 0 },
    } as any);

    const { result } = renderHook(() => useAdventureGameInit(defaultProps));
    // base 15000 / 2 = 7500
    expect(result.current.adjustedInactivityThresholdMs).toBe(7500);
  });
});
