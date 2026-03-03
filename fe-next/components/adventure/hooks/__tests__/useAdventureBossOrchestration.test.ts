/**
 * useAdventureBossOrchestration Tests
 *
 * Tests for the hook that orchestrates boss-specific concerns:
 * - Boss config from useAdventureBoss
 * - Player health management
 * - Boss effect callbacks (damage, timer penalty, screen shake, scramble)
 */

import { renderHook } from '@testing-library/react';
import { useAdventureBossOrchestration } from '../useAdventureBossOrchestration';
import { useAdventureBoss } from '../useAdventureBoss';
import { usePlayerHealth } from '@/hooks/usePlayerHealth';

jest.mock('../useAdventureBoss');
jest.mock('@/hooks/usePlayerHealth');

const mockUseAdventureBoss = useAdventureBoss as jest.MockedFunction<typeof useAdventureBoss>;
const mockUsePlayerHealth = usePlayerHealth as jest.MockedFunction<typeof usePlayerHealth>;

describe('useAdventureBossOrchestration', () => {
  const mockTakeDamage = jest.fn();
  const mockResetPlayerHealth = jest.fn();
  const mockShake = jest.fn();
  const mockAddTime = jest.fn();

  const mockBossReturn = {
    isBossActive: true,
    bossConfig: { id: 'test-boss', name: 'Test Boss' },
    bossTaunt: null,
    showBossTaunt: false,
    bossHealthState: { currentHP: 100, maxHP: 100, phase: 'active', totalDamageDealt: 0, isActive: true, isDead: false },
    bossHPPercentage: 100,
    isEnraged: false,
    bossState: {},
    showBossIntro: true,
    showBossFireworks: false,
    defeatedBossTier: 'mini' as const,
    checkBossWord: jest.fn(),
    dealBossDamage: jest.fn(),
    triggerBossTaunt: jest.fn(),
    startBossBattle: jest.fn(),
    endBossBattle: jest.fn(),
    resetBossHealth: jest.fn(),
    handleBossIntroStart: jest.fn(),
    handleBossIntroSkip: jest.fn(),
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
    mockUseAdventureBoss.mockReturnValue(mockBossReturn as any);
    mockUsePlayerHealth.mockReturnValue(mockPlayerHealthReturn as any);
  });

  it('should return boss state from useAdventureBoss', () => {
    const { result } = renderHook(() => useAdventureBossOrchestration(defaultProps));

    expect(result.current.isBossActive).toBe(true);
    expect(result.current.bossConfig).toEqual(mockBossReturn.bossConfig);
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

  describe('bossEffectCallbacks', () => {
    it('should deal player damage on boss level', () => {
      const { result } = renderHook(() => useAdventureBossOrchestration(defaultProps));

      result.current.bossEffectCallbacks.onPlayerDamage?.(25);
      expect(mockTakeDamage).toHaveBeenCalledWith(25);
    });

    it('should not deal player damage on non-boss level', () => {
      const { result } = renderHook(() =>
        useAdventureBossOrchestration({ ...defaultProps, isBossLevel: false })
      );

      result.current.bossEffectCallbacks.onPlayerDamage?.(25);
      expect(mockTakeDamage).not.toHaveBeenCalled();
    });

    it('should apply timer penalty as negative addTime', () => {
      const { result } = renderHook(() => useAdventureBossOrchestration(defaultProps));

      result.current.bossEffectCallbacks.onTimerPenalty?.(5);
      expect(mockAddTime).toHaveBeenCalledWith(-5);
    });

    it('should trigger screen shake with given intensity', () => {
      const { result } = renderHook(() => useAdventureBossOrchestration(defaultProps));

      result.current.bossEffectCallbacks.onScreenShake?.(6);
      expect(mockShake).toHaveBeenCalledWith(6);
    });

    it('should use default intensity 4 for screen shake when not specified', () => {
      const { result } = renderHook(() => useAdventureBossOrchestration(defaultProps));

      result.current.bossEffectCallbacks.onScreenShake?.();
      expect(mockShake).toHaveBeenCalledWith(4);
    });

    it('should have onDamageFlash and onScramble callbacks', () => {
      const { result } = renderHook(() => useAdventureBossOrchestration(defaultProps));

      expect(result.current.bossEffectCallbacks.onDamageFlash).toBeInstanceOf(Function);
      expect(result.current.bossEffectCallbacks.onScramble).toBeInstanceOf(Function);

      // Should not throw
      result.current.bossEffectCallbacks.onDamageFlash?.();
      result.current.bossEffectCallbacks.onScramble?.();
    });
  });

  it('should pass through boss intro handlers', () => {
    const { result } = renderHook(() => useAdventureBossOrchestration(defaultProps));

    expect(result.current.handleBossIntroStart).toBe(mockBossReturn.handleBossIntroStart);
    expect(result.current.handleBossIntroSkip).toBe(mockBossReturn.handleBossIntroSkip);
  });

  it('should pass through boss combat functions', () => {
    const { result } = renderHook(() => useAdventureBossOrchestration(defaultProps));

    expect(result.current.checkBossWord).toBe(mockBossReturn.checkBossWord);
    expect(result.current.dealBossDamage).toBe(mockBossReturn.dealBossDamage);
    expect(result.current.triggerBossTaunt).toBe(mockBossReturn.triggerBossTaunt);
    expect(result.current.endBossBattle).toBe(mockBossReturn.endBossBattle);
    expect(result.current.resetBossHealth).toBe(mockBossReturn.resetBossHealth);
  });
});
