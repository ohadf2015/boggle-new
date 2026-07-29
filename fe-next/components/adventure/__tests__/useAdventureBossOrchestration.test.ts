// @vitest-environment jsdom
/**
 * useAdventureBossOrchestration Tests
 *
 * TDD tests for the boss orchestration hook.
 * Focus: player death → defeat trigger (Task 2).
 */

import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAdventureBossOrchestration } from '../hooks/useAdventureBossOrchestration';

// Mock heavy dependencies
vi.mock('@/hooks/useAdventureBossNew', () => ({
  useAdventureBossNew: vi.fn(() => ({
    isActive: false,
    hp: 0,
    maxHP: 0,
    hpPercentage: 0,
    phase: 'normal',
    boss: null,
    currentTaunt: null,
    lockedTiles: [],
    startBattle: vi.fn(),
    endBattle: vi.fn(),
    dealDamage: vi.fn(() => 0),
    triggerTaunt: vi.fn(),
    reset: vi.fn(),
  })),
}));

vi.mock('@/hooks/usePlayerHealth', () => ({
  usePlayerHealth: vi.fn((initialHP: number) => {
    let currentHP = initialHP;
    return {
      healthState: { currentHP, maxHP: initialHP },
      takeDamage: vi.fn((amount: number) => { currentHP = Math.max(0, currentHP - amount); }),
      heal: vi.fn(),
      resetHealth: vi.fn(),
    };
  }),
}));

vi.mock('@/hooks/useBossMechanics', () => ({
  useBossMechanics: vi.fn(() => ({
    checkWord: vi.fn(() => ({ valid: true, triggerTaunt: null })),
    advancePhase: vi.fn(),
    triggerTaunt: vi.fn(),
  })),
}));

vi.mock('@/hooks/useHaptics', () => ({
  useHaptics: vi.fn(() => ({ bossHit: vi.fn() })),
}));

vi.mock('@/hooks/usePreviousValue', () => ({
  usePreviousValue: vi.fn(() => undefined),
}));

vi.mock('@/lib/adventure/bossConfig', () => ({
  getBossConfig: vi.fn(() => null),
  getBossTaunt: vi.fn(() => null),
  BOSS_HP: {},
}));

const DEFAULT_PROPS = {
  isBossLevel: true,
  worldId: 1,
  levelNumber: 1,
  showBossIntroConfig: false,
  timeRemaining: 60,
  isPlaying: true,
  startGame: vi.fn(),
  startAIDirector: vi.fn(),
  addTime: vi.fn(),
  shake: vi.fn(),
};

describe('useAdventureBossOrchestration — player death → defeat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls endBossBattle with defeat when playerHealth reaches 0 and boss is active', async () => {
    const { useAdventureBossNew } = await import('@/hooks/useAdventureBossNew');
    const { usePlayerHealth } = await import('@/hooks/usePlayerHealth');

    const mockEndBattle = vi.fn();

    (useAdventureBossNew as ReturnType<typeof vi.fn>).mockReturnValue({
      isActive: true,
      hp: 50,
      maxHP: 100,
      hpPercentage: 50,
      phase: 'normal',
      boss: { id: 'test' },
      currentTaunt: null,
      lockedTiles: [],
      startBattle: vi.fn(),
      endBattle: mockEndBattle,
      dealDamage: vi.fn(() => 0),
      triggerTaunt: vi.fn(),
      reset: vi.fn(),
    });

    // Start with 100 HP
    let currentHP = 100;
    const setHP = vi.fn((newHP: number) => { currentHP = newHP; });
    (usePlayerHealth as ReturnType<typeof vi.fn>).mockReturnValue({
      healthState: { currentHP, maxHP: 100 },
      takeDamage: setHP,
      heal: vi.fn(),
      resetHealth: vi.fn(),
    });

    const { result, rerender } = renderHook(() =>
      useAdventureBossOrchestration(DEFAULT_PROPS)
    );

    // Simulate player HP dropping to 0 by remocking playerHealth and rerendering
    (usePlayerHealth as ReturnType<typeof vi.fn>).mockReturnValue({
      healthState: { currentHP: 0, maxHP: 100 },
      takeDamage: vi.fn(),
      heal: vi.fn(),
      resetHealth: vi.fn(),
    });

    act(() => {
      rerender();
    });

    expect(mockEndBattle).toHaveBeenCalledWith('defeat');
  });

  it('does not call endBossBattle when boss is not active even if player HP is 0', async () => {
    const { useAdventureBossNew } = await import('@/hooks/useAdventureBossNew');
    const { usePlayerHealth } = await import('@/hooks/usePlayerHealth');

    const mockEndBattle = vi.fn();

    (useAdventureBossNew as ReturnType<typeof vi.fn>).mockReturnValue({
      isActive: false,
      hp: 0,
      maxHP: 100,
      hpPercentage: 0,
      phase: 'normal',
      boss: null,
      currentTaunt: null,
      lockedTiles: [],
      startBattle: vi.fn(),
      endBattle: mockEndBattle,
      dealDamage: vi.fn(() => 0),
      triggerTaunt: vi.fn(),
      reset: vi.fn(),
    });

    (usePlayerHealth as ReturnType<typeof vi.fn>).mockReturnValue({
      healthState: { currentHP: 0, maxHP: 100 },
      takeDamage: vi.fn(),
      heal: vi.fn(),
      resetHealth: vi.fn(),
    });

    renderHook(() => useAdventureBossOrchestration(DEFAULT_PROPS));

    expect(mockEndBattle).not.toHaveBeenCalledWith('defeat');
  });
});
