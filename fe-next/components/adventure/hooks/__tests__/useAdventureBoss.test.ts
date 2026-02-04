/**
 * useAdventureBoss Tests
 *
 * Tests for the boss gameplay management hook.
 */

import { renderHook, act } from '@testing-library/react';
import { useAdventureBoss } from '../useAdventureBoss';
import { useBossMechanics } from '@/hooks/useBossMechanics';
import { useBossHealth } from '@/hooks/useBossHealth';

// Mock the boss hooks
jest.mock('@/hooks/useBossMechanics');
jest.mock('@/hooks/useBossHealth');

const mockUseBossMechanics = useBossMechanics as jest.MockedFunction<typeof useBossMechanics>;
const mockUseBossHealth = useBossHealth as jest.MockedFunction<typeof useBossHealth>;

describe('useAdventureBoss', () => {
  const defaultProps = {
    isBossLevel: true,
    worldId: 1,
    levelNumber: 5,
    showBossIntroConfig: true,
    timeRemaining: 60,
    isPlaying: false,
    onStartGame: jest.fn(),
    onStartAIDirector: jest.fn(),
  };

  const mockBossMechanics = {
    isActive: true,
    boss: { id: 'test-boss', name: 'Test Boss' },
    currentTaunt: null,
    showTaunt: false,
    checkWord: jest.fn(),
    triggerTaunt: jest.fn(),
    bossState: {},
  };

  const mockBossHealth = {
    healthState: { currentHP: 100, maxHP: 100, phase: 'active', totalDamageDealt: 0, isActive: true },
    dealDamage: jest.fn(),
    startBattle: jest.fn(),
    endBattle: jest.fn(),
    resetHealth: jest.fn(),
    hpPercentage: 100,
    isEnraged: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseBossMechanics.mockReturnValue(mockBossMechanics as any);
    mockUseBossHealth.mockReturnValue(mockBossHealth as any);
  });

  describe('initialization', () => {
    it('should initialize with boss intro visible when isBossLevel and showBossIntroConfig true', () => {
      const { result } = renderHook(() => useAdventureBoss(defaultProps));

      expect(result.current.showBossIntro).toBe(true);
      expect(result.current.showBossFireworks).toBe(false);
      expect(result.current.defeatedBossTier).toBe('standard');
    });

    it('should initialize with boss intro hidden when not boss level', () => {
      const { result } = renderHook(() =>
        useAdventureBoss({ ...defaultProps, isBossLevel: false })
      );

      expect(result.current.showBossIntro).toBe(false);
    });

    it('should initialize with boss intro hidden when showBossIntroConfig false', () => {
      const { result } = renderHook(() =>
        useAdventureBoss({ ...defaultProps, showBossIntroConfig: false })
      );

      expect(result.current.showBossIntro).toBe(false);
    });
  });

  describe('handleBossIntroStart', () => {
    it('should hide intro, start battle, and trigger start taunt', () => {
      const onStartGame = jest.fn();
      const onStartAIDirector = jest.fn();
      const { result } = renderHook(() =>
        useAdventureBoss({ ...defaultProps, onStartGame, onStartAIDirector })
      );

      act(() => {
        result.current.handleBossIntroStart();
      });

      expect(result.current.showBossIntro).toBe(false);
      expect(mockBossHealth.startBattle).toHaveBeenCalled();
      expect(onStartGame).toHaveBeenCalled();
      expect(onStartAIDirector).toHaveBeenCalled();
      expect(mockBossMechanics.triggerTaunt).toHaveBeenCalledWith('onStart');
    });

    it('should not start game if already playing', () => {
      const onStartGame = jest.fn();
      const { result } = renderHook(() =>
        useAdventureBoss({ ...defaultProps, isPlaying: true, onStartGame })
      );

      act(() => {
        result.current.handleBossIntroStart();
      });

      expect(onStartGame).not.toHaveBeenCalled();
      expect(mockBossHealth.startBattle).toHaveBeenCalled();
    });
  });

  describe('handleBossIntroSkip', () => {
    it('should hide intro and start battle without start taunt', () => {
      const onStartGame = jest.fn();
      const onStartAIDirector = jest.fn();
      const { result } = renderHook(() =>
        useAdventureBoss({ ...defaultProps, onStartGame, onStartAIDirector })
      );

      act(() => {
        result.current.handleBossIntroSkip();
      });

      expect(result.current.showBossIntro).toBe(false);
      expect(mockBossHealth.startBattle).toHaveBeenCalled();
      expect(onStartGame).toHaveBeenCalled();
      expect(onStartAIDirector).toHaveBeenCalled();
      expect(mockBossMechanics.triggerTaunt).not.toHaveBeenCalled();
    });
  });

  describe('boss defeat detection', () => {
    it('should show fireworks when boss transitions to victory phase (mini boss)', () => {
      jest.useFakeTimers();
      const { result, rerender } = renderHook(() =>
        useAdventureBoss({ ...defaultProps, levelNumber: 5 })
      );

      // Transition to victory
      mockUseBossHealth.mockReturnValue({
        ...mockBossHealth,
        healthState: { ...mockBossHealth.healthState, phase: 'victory' },
      } as any);

      rerender();

      expect(result.current.showBossFireworks).toBe(true);
      expect(result.current.defeatedBossTier).toBe('mini');

      // Verify fireworks hide after duration
      act(() => {
        jest.advanceTimersByTime(3500);
      });

      expect(result.current.showBossFireworks).toBe(false);

      jest.useRealTimers();
    });

    it('should show fireworks for standard boss (level 15)', () => {
      jest.useFakeTimers();
      const { result, rerender } = renderHook(() =>
        useAdventureBoss({ ...defaultProps, levelNumber: 15 })
      );

      mockUseBossHealth.mockReturnValue({
        ...mockBossHealth,
        healthState: { ...mockBossHealth.healthState, phase: 'victory' },
      } as any);

      rerender();

      expect(result.current.defeatedBossTier).toBe('standard');

      act(() => {
        jest.advanceTimersByTime(5500);
      });

      expect(result.current.showBossFireworks).toBe(false);

      jest.useRealTimers();
    });

    it('should show fireworks for elite boss (level 20+)', () => {
      jest.useFakeTimers();
      const { result, rerender } = renderHook(() =>
        useAdventureBoss({ ...defaultProps, levelNumber: 20 })
      );

      mockUseBossHealth.mockReturnValue({
        ...mockBossHealth,
        healthState: { ...mockBossHealth.healthState, phase: 'victory' },
      } as any);

      rerender();

      expect(result.current.defeatedBossTier).toBe('elite');

      act(() => {
        jest.advanceTimersByTime(8500);
      });

      expect(result.current.showBossFireworks).toBe(false);

      jest.useRealTimers();
    });

    it('should cleanup timeout on unmount', () => {
      jest.useFakeTimers();
      const { unmount, rerender } = renderHook(() =>
        useAdventureBoss({ ...defaultProps, levelNumber: 5 })
      );

      mockUseBossHealth.mockReturnValue({
        ...mockBossHealth,
        healthState: { ...mockBossHealth.healthState, phase: 'victory' },
      } as any);

      rerender();

      unmount();

      // Should not throw when advancing timers after unmount
      expect(() => {
        jest.advanceTimersByTime(3500);
      }).not.toThrow();

      jest.useRealTimers();
    });
  });

  describe('low time taunt', () => {
    it('should trigger low time taunt when time drops to 15 seconds', () => {
      const { rerender } = renderHook(
        ({ timeRemaining }) => useAdventureBoss({ ...defaultProps, isPlaying: true, timeRemaining }),
        { initialProps: { timeRemaining: 30 } }
      );

      // Drop time to 15 seconds
      rerender({ timeRemaining: 15 });

      expect(mockBossMechanics.triggerTaunt).toHaveBeenCalledWith('onLowTime');
    });

    it('should not trigger low time taunt when not playing', () => {
      const { rerender } = renderHook(
        ({ timeRemaining }) => useAdventureBoss({ ...defaultProps, isPlaying: false, timeRemaining }),
        { initialProps: { timeRemaining: 30 } }
      );

      rerender({ timeRemaining: 15 });

      expect(mockBossMechanics.triggerTaunt).not.toHaveBeenCalled();
    });

    it('should only trigger low time taunt once per game', () => {
      const { rerender } = renderHook(
        ({ timeRemaining }) => useAdventureBoss({ ...defaultProps, isPlaying: true, timeRemaining }),
        { initialProps: { timeRemaining: 30 } }
      );

      rerender({ timeRemaining: 15 });
      rerender({ timeRemaining: 14 });
      rerender({ timeRemaining: 13 });

      expect(mockBossMechanics.triggerTaunt).toHaveBeenCalledTimes(1);
    });

    it('should reset low time taunt trigger when time goes back above 15', () => {
      const { rerender } = renderHook(
        ({ timeRemaining }) => useAdventureBoss({ ...defaultProps, isPlaying: true, timeRemaining }),
        { initialProps: { timeRemaining: 30 } }
      );

      rerender({ timeRemaining: 15 });
      expect(mockBossMechanics.triggerTaunt).toHaveBeenCalledTimes(1);

      rerender({ timeRemaining: 20 });
      rerender({ timeRemaining: 15 });

      expect(mockBossMechanics.triggerTaunt).toHaveBeenCalledTimes(2);
    });
  });

  describe('function stability', () => {
    it('should return stable function references', () => {
      const { result, rerender } = renderHook(() => useAdventureBoss(defaultProps));

      const firstIntroStart = result.current.handleBossIntroStart;
      const firstIntroSkip = result.current.handleBossIntroSkip;

      rerender();

      expect(result.current.handleBossIntroStart).toBe(firstIntroStart);
      expect(result.current.handleBossIntroSkip).toBe(firstIntroSkip);
    });
  });

  describe('non-boss levels', () => {
    it('should handle non-boss levels gracefully', () => {
      const { result } = renderHook(() =>
        useAdventureBoss({ ...defaultProps, isBossLevel: false, worldId: null })
      );

      expect(result.current.isBossActive).toBe(true); // Still delegates to useBossMechanics
      expect(result.current.showBossIntro).toBe(false);
      expect(result.current.showBossFireworks).toBe(false);
    });
  });
});
