/**
 * useAdventureBossOrchestration Tests (Simplified)
 *
 * Tests for the simplified boss orchestration hook that wraps useAdventureBossNew.
 */

import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAdventureBossOrchestration } from '../useAdventureBossOrchestration';
import { useAdventureBossNew } from '@/hooks/useAdventureBossNew';
import { usePlayerHealth } from '@/hooks/usePlayerHealth';

vi.mock('@/hooks/useAdventureBossNew');
vi.mock('@/hooks/usePlayerHealth');
vi.mock('@/hooks/useBossMechanics', () => ({
  useBossMechanics: vi.fn().mockReturnValue({
    checkWord: (word: string) => ({
      meetsRequirement: word.length >= 5,
      scoreMultiplier: word.length >= 5 ? 1.5 : 1.0,
    }),
    triggerTaunt: vi.fn(),
  }),
}));
vi.mock('@/lib/adventure/bossConfig', () => ({
  getBossConfig: vi.fn().mockReturnValue({ id: 'test-boss' }),
  getBossTaunt: vi.fn().mockReturnValue('taunt_key'),
}));

const mockUseAdventureBossNew = useAdventureBossNew as any;
const mockUsePlayerHealth = usePlayerHealth as any;

describe('useAdventureBossOrchestration', () => {
  const mockTakeDamage = vi.fn();
  const mockResetPlayerHealth = vi.fn();
  const mockShake = vi.fn();
  const mockAddTime = vi.fn();
  const mockDealDamage = vi.fn().mockReturnValue(10);
  const mockStartBattle = vi.fn();
  const mockEndBattle = vi.fn();
  const mockTriggerTaunt = vi.fn();
  const mockReset = vi.fn();

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
    heal: vi.fn(),
  };

  const defaultProps = {
    isBossLevel: true,
    worldId: 1,
    levelNumber: 5,
    showBossIntroConfig: true,
    timeRemaining: 60,
    isPlaying: false,
    startGame: vi.fn(),
    startAIDirector: vi.fn(),
    addTime: mockAddTime,
    shake: mockShake,
  };

  beforeEach(() => {
    vi.clearAllMocks();
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

    it('should call scrambleTiles when onScramble fires', () => {
      const mockScrambleTiles = vi.fn();
      const { result } = renderHook(() =>
        useAdventureBossOrchestration({ ...defaultProps, scrambleTiles: mockScrambleTiles })
      );

      act(() => {
        result.current.bossEffectCallbacks.onScramble?.();
      });

      expect(mockScrambleTiles).toHaveBeenCalledTimes(1);
      expect(mockShake).toHaveBeenCalled();
    });
  });

  describe('handleBossIntroStart', () => {
    it('should hide intro, start battle, start game, and start AI director', () => {
      const startGame = vi.fn();
      const startAIDirector = vi.fn();
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

      result.current.dealBossDamage(10, 2.0);

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

  describe('onLockTiles (ability-system)', () => {
    it('bossEffectCallbacks includes onLockTiles', () => {
      const { result } = renderHook(() => useAdventureBossOrchestration(defaultProps));
      expect(result.current.bossEffectCallbacks.onLockTiles).toBeInstanceOf(Function);
    });

    it('onLockTiles merges indices into lockedTiles', () => {
      vi.useFakeTimers();
      const { result } = renderHook(() => useAdventureBossOrchestration(defaultProps));

      act(() => {
        result.current.bossEffectCallbacks.onLockTiles?.([3, 7], 2000);
      });

      expect(result.current.lockedTiles).toContain(3);
      expect(result.current.lockedTiles).toContain(7);

      act(() => {
        vi.advanceTimersByTime(2001);
      });

      expect(result.current.lockedTiles).not.toContain(3);
      expect(result.current.lockedTiles).not.toContain(7);
      vi.useRealTimers();
    });

    it('state-machine lockedTiles and ability lockedTiles merge without duplicates', () => {
      mockUseAdventureBossNew.mockReturnValue({
        ...mockBossReturn,
        lockedTiles: [0, 3],
      });
      vi.useFakeTimers();
      const { result } = renderHook(() => useAdventureBossOrchestration(defaultProps));

      act(() => {
        result.current.bossEffectCallbacks.onLockTiles?.([3, 9], 2000);
      });

      expect(result.current.lockedTiles).toContain(0);
      expect(result.current.lockedTiles).toContain(3);
      expect(result.current.lockedTiles).toContain(9);
      expect(result.current.lockedTiles.filter((i: number) => i === 3).length).toBe(1);
      vi.useRealTimers();
    });
  });
});
