/**
 * useAdventureBossOrchestration Tests (Simplified)
 *
 * Tests for the simplified boss orchestration hook that wraps useAdventureBossNew.
 */

import { renderHook, act } from '@testing-library/react';
import { useAdventureBossOrchestration } from '../useAdventureBossOrchestration';
import { useAdventureBossNew } from '@/hooks/useAdventureBossNew';
import { usePlayerHealth } from '@/hooks/usePlayerHealth';

jest.mock('@/hooks/useAdventureBossNew');
jest.mock('@/hooks/usePlayerHealth');
jest.mock('@/lib/adventure/bossConfig', () => ({
  getBossConfig: jest.fn().mockReturnValue({ id: 'test-boss' }),
  getBossTaunt: jest.fn().mockReturnValue('taunt_key'),
}));

const mockUseAdventureBossNew = useAdventureBossNew as jest.MockedFunction<typeof useAdventureBossNew>;
const mockUsePlayerHealth = usePlayerHealth as jest.MockedFunction<typeof usePlayerHealth>;

describe('useAdventureBossOrchestration', () => {
  const mockTakeDamage = jest.fn();
  const mockResetPlayerHealth = jest.fn();
  const mockShake = jest.fn();
  const mockAddTime = jest.fn();
  const mockDealDamage = jest.fn().mockReturnValue(10);
  const mockStartBattle = jest.fn();
  const mockEndBattle = jest.fn();
  const mockTriggerTaunt = jest.fn();
  const mockReset = jest.fn();

  const mockBossReturn = {
    isActive: true,
    hp: 100,
    maxHP: 100,
    hpPercentage: 100,
    phase: 'normal' as const,
    boss: { id: 'test-boss', name: 'Test Boss' },
    currentTaunt: null,
    lockedTiles: [],
    startBattle: mockStartBattle,
    endBattle: mockEndBattle,
    dealDamage: mockDealDamage,
    triggerTaunt: mockTriggerTaunt,
    reset: mockReset,
  };

  const mockPlayerHealthReturn = {
    healthState: { currentHP: 100, maxHP: 100, isDead: false, isActive: true },
    takeDamage: mockTakeDamage,
    resetHealth: mockResetPlayerHealth,
    heal: jest.fn(),
  };

  const defaultProps = {
    isBossLevel: true,
    worldId: 1,
    levelNumber: 5,
    showBossIntroConfig: true,
    timeRemaining: 60,
    isPlaying: false,
    startGame: jest.fn(),
    startAIDirector: jest.fn(),
    addTime: mockAddTime,
    shake: mockShake,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAdventureBossNew.mockReturnValue(mockBossReturn as any);
    mockUsePlayerHealth.mockReturnValue(mockPlayerHealthReturn as any);
  });

  it('should return boss state from useAdventureBossNew', () => {
    const { result } = renderHook(() => useAdventureBossOrchestration(defaultProps));

    expect(result.current.isBossActive).toBe(true);
    expect(result.current.bossConfig).toEqual(mockBossReturn.boss);
    expect(result.current.showBossIntro).toBe(true);
  });

  it('should return player health state', () => {
    const { result } = renderHook(() => useAdventureBossOrchestration(defaultProps));

    expect(result.current.playerHealthState).toEqual(mockPlayerHealthReturn.healthState);
    expect(result.current.resetPlayerHealth).toBe(mockResetPlayerHealth);
  });

  it('should initialize player health with 100 HP for boss levels', () => {
    renderHook(() => useAdventureBossOrchestration(defaultProps));
    expect(mockUsePlayerHealth).toHaveBeenCalledWith(100);
  });

  it('should initialize player health with 0 HP for non-boss levels', () => {
    renderHook(() =>
      useAdventureBossOrchestration({ ...defaultProps, isBossLevel: false })
    );
    expect(mockUsePlayerHealth).toHaveBeenCalledWith(0);
  });

  it('should pass null worldId to boss hook for non-boss levels', () => {
    renderHook(() =>
      useAdventureBossOrchestration({ ...defaultProps, isBossLevel: false })
    );
    expect(mockUseAdventureBossNew).toHaveBeenCalledWith(
      expect.objectContaining({ worldId: null })
    );
  });

  it('should expose new boss state fields', () => {
    const { result } = renderHook(() => useAdventureBossOrchestration(defaultProps));

    expect(result.current.bossPhase).toBe('normal');
    expect(result.current.bossCurrentHP).toBe(100);
    expect(result.current.bossMaxHP).toBe(100);
    expect(result.current.lockedTiles).toEqual([]);
  });

  describe('bossEffectCallbacks', () => {
    it('should have onDamageFlash and onScramble callbacks', () => {
      const { result } = renderHook(() => useAdventureBossOrchestration(defaultProps));

      expect(result.current.bossEffectCallbacks.onDamageFlash).toBeInstanceOf(Function);
      expect(result.current.bossEffectCallbacks.onScramble).toBeInstanceOf(Function);

      // Should not throw
      result.current.bossEffectCallbacks.onDamageFlash?.();
      result.current.bossEffectCallbacks.onScramble?.();
    });
  });

  describe('handleBossIntroStart', () => {
    it('should hide intro, start battle, start game, and start AI director', () => {
      const startGame = jest.fn();
      const startAIDirector = jest.fn();
      const { result } = renderHook(() =>
        useAdventureBossOrchestration({ ...defaultProps, startGame, startAIDirector })
      );

      act(() => {
        result.current.handleBossIntroStart();
      });

      expect(result.current.showBossIntro).toBe(false);
      expect(mockStartBattle).toHaveBeenCalled();
      expect(startGame).toHaveBeenCalled();
      expect(startAIDirector).toHaveBeenCalled();
    });
  });

  describe('dealBossDamage', () => {
    it('should multiply base damage by mechanic multiplier and call dealDamage', () => {
      const { result } = renderHook(() => useAdventureBossOrchestration(defaultProps));

      result.current.dealBossDamage(10, 3, 2.0, 0.5);

      // 10 * 2.0 = 20
      expect(mockDealDamage).toHaveBeenCalledWith(20);
    });
  });

  describe('checkBossWord', () => {
    it('should return bonus for words with 5+ letters', () => {
      const { result } = renderHook(() => useAdventureBossOrchestration(defaultProps));

      const goodResult = result.current.checkBossWord('hello');
      expect(goodResult.meetsRequirement).toBe(true);
      expect(goodResult.scoreMultiplier).toBe(1.5);
    });

    it('should return no bonus for words under 5 letters', () => {
      const { result } = renderHook(() => useAdventureBossOrchestration(defaultProps));

      const badResult = result.current.checkBossWord('hi');
      expect(badResult.meetsRequirement).toBe(false);
      expect(badResult.scoreMultiplier).toBe(1.0);
    });
  });

  describe('bossHealthState compatibility', () => {
    it('should expose health state in old format', () => {
      const { result } = renderHook(() => useAdventureBossOrchestration(defaultProps));

      expect(result.current.bossHealthState).toEqual(
        expect.objectContaining({
          currentHP: 100,
          maxHP: 100,
          isActive: true,
        })
      );
    });
  });
});
