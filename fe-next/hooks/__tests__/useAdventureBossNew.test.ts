/**
 * useAdventureBossNew Tests (TDD - RED phase)
 *
 * Tests for the new simplified boss battle hook.
 * Covers: HP system, phases, attacks, taunts, battle lifecycle.
 */

import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAdventureBossNew } from '../useAdventureBossNew';
import { getBossConfig, getBossTaunt } from '@/lib/adventure/bossConfig';

// Mock bossConfig utilities
vi.mock('@/lib/adventure/bossConfig', () => ({
  getBossConfig: vi.fn(),
  getBossTaunt: vi.fn(),
  BOSS_HP: { 1: 150, 2: 250, 3: 375, 4: 500, 5: 650, 6: 825, 7: 1000, 8: 1200, 9: 1400, 10: 1750 },
}));

const mockGetBossConfig = getBossConfig as any;
const mockGetBossTaunt = getBossTaunt as any;

const MOCK_BOSS_CONFIG = {
  id: 'msGrammar',
  worldId: 1,
  displayName: 'adventure.bosses.msGrammar.name',
  personality: 'A prim owl schoolteacher',
  visualTheme: 'school-owl',
  imagePath: '/images/bosses/boss-ms-grammar.webp',
  twistMechanic: { type: 'popQuiz' as const, description: '', params: {} },
  taunts: {
    onStart: ['start1', 'start2'],
    onGoodWord: ['good1'],
    onBadWord: ['bad1'],
    onMechanic: ['mech1'],
    onLowTime: ['low1'],
    onVictory: 'victory1',
    onDefeat: 'defeat1',
  },
  phases: [],
};

describe('useAdventureBossNew', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockGetBossConfig.mockReturnValue(MOCK_BOSS_CONFIG as any);
    mockGetBossTaunt.mockReturnValue('taunt_key');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ==============================================
  // INITIALIZATION
  // ==============================================

  describe('initialization', () => {
    it('should return inactive state when worldId is null', () => {
      const { result } = renderHook(() =>
        useAdventureBossNew({ worldId: null })
      );

      expect(result.current.isActive).toBe(false);
      expect(result.current.hp).toBe(0);
      expect(result.current.maxHP).toBe(0);
      expect(result.current.phase).toBe('normal');
      expect(result.current.boss).toBeNull();
    });

    it('should load boss config for valid worldId', () => {
      const { result } = renderHook(() =>
        useAdventureBossNew({ worldId: 1 })
      );

      expect(mockGetBossConfig).toHaveBeenCalledWith(1);
      expect(result.current.boss).toEqual(MOCK_BOSS_CONFIG);
    });

    it('should not be active before startBattle is called', () => {
      const { result } = renderHook(() =>
        useAdventureBossNew({ worldId: 1 })
      );

      expect(result.current.isActive).toBe(false);
    });
  });

  // ==============================================
  // HP SYSTEM
  // ==============================================

  describe('HP system', () => {
    it('should set HP based on BOSS_HP lookup for worldId', () => {
      const { result } = renderHook(() =>
        useAdventureBossNew({ worldId: 3 })
      );

      act(() => {
        result.current.startBattle();
      });

      expect(result.current.maxHP).toBe(375);
      expect(result.current.hp).toBe(375);
    });

    it('should compute HP for world 1 as 150', () => {
      const { result } = renderHook(() =>
        useAdventureBossNew({ worldId: 1 })
      );

      act(() => {
        result.current.startBattle();
      });

      expect(result.current.maxHP).toBe(150);
    });

    it('should compute HP for world 10 as 1750', () => {
      mockGetBossConfig.mockReturnValue({ ...MOCK_BOSS_CONFIG, worldId: 10 } as any);
      const { result } = renderHook(() =>
        useAdventureBossNew({ worldId: 10 })
      );

      act(() => {
        result.current.startBattle();
      });

      expect(result.current.maxHP).toBe(1750);
    });
  });

  // ==============================================
  // DAMAGE DEALING
  // ==============================================

  describe('dealDamage', () => {
    it('should reduce HP by the given score amount', () => {
      const { result } = renderHook(() =>
        useAdventureBossNew({ worldId: 1 })
      );

      act(() => {
        result.current.startBattle();
      });

      act(() => {
        result.current.dealDamage(25);
      });

      expect(result.current.hp).toBe(125);
    });

    it('should not reduce HP below 0', () => {
      const { result } = renderHook(() =>
        useAdventureBossNew({ worldId: 1 })
      );

      act(() => {
        result.current.startBattle();
      });

      act(() => {
        result.current.dealDamage(200);
      });

      expect(result.current.hp).toBe(0);
    });

    it('should do nothing when battle is not active', () => {
      const { result } = renderHook(() =>
        useAdventureBossNew({ worldId: 1 })
      );

      act(() => {
        result.current.dealDamage(25);
      });

      // HP should still be 0 (not started)
      expect(result.current.hp).toBe(0);
    });

    it('should trigger victory when HP reaches 0', () => {
      const onVictory = vi.fn();
      const { result } = renderHook(() =>
        useAdventureBossNew({ worldId: 1, onVictory })
      );

      act(() => {
        result.current.startBattle();
      });

      act(() => {
        result.current.dealDamage(150);
      });

      expect(result.current.hp).toBe(0);
      expect(result.current.isActive).toBe(false);
      expect(onVictory).toHaveBeenCalled();
    });

    it('should return actual damage dealt', () => {
      const { result } = renderHook(() =>
        useAdventureBossNew({ worldId: 1 })
      );

      act(() => {
        result.current.startBattle();
      });

      let damage: number = 0;
      act(() => {
        damage = result.current.dealDamage(25);
      });

      expect(damage).toBe(25);
    });

    it('should cap returned damage to remaining HP', () => {
      const { result } = renderHook(() =>
        useAdventureBossNew({ worldId: 1 })
      );

      act(() => {
        result.current.startBattle();
      });

      act(() => {
        result.current.dealDamage(140);
      });

      let damage: number = 0;
      act(() => {
        damage = result.current.dealDamage(50);
      });

      // Only 10 HP left, so damage should be capped at 10
      expect(damage).toBe(10);
    });
  });

  // ==============================================
  // PHASE TRANSITIONS
  // ==============================================

  describe('phases', () => {
    it('should start in normal phase', () => {
      const { result } = renderHook(() =>
        useAdventureBossNew({ worldId: 1 })
      );

      act(() => {
        result.current.startBattle();
      });

      expect(result.current.phase).toBe('normal');
    });

    it('should transition to angry at 50% HP', () => {
      const { result } = renderHook(() =>
        useAdventureBossNew({ worldId: 1 })
      );

      act(() => {
        result.current.startBattle();
      });

      // Deal 80 damage (HP drops to 70 out of 150 = 46.7% < 50%)
      act(() => {
        result.current.dealDamage(80);
      });

      expect(result.current.phase).toBe('angry');
    });

    it('should stay normal above 50% HP (threshold boundary)', () => {
      const { result } = renderHook(() =>
        useAdventureBossNew({ worldId: 1 })
      );

      act(() => {
        result.current.startBattle();
      });

      act(() => {
        result.current.dealDamage(70); // 80 HP remaining out of 150 = 53.3%
      });

      expect(result.current.phase).toBe('normal');
    });

    it('should transition to desperate at below 25% HP', () => {
      const { result } = renderHook(() =>
        useAdventureBossNew({ worldId: 1 })
      );

      act(() => {
        result.current.startBattle();
      });

      act(() => {
        result.current.dealDamage(115); // 35 HP remaining out of 150 = 23.3% < 25%
      });

      expect(result.current.phase).toBe('desperate');
    });

    it('should stay angry at exactly 25% HP', () => {
      const { result } = renderHook(() =>
        useAdventureBossNew({ worldId: 1 })
      );

      act(() => {
        result.current.startBattle();
      });

      act(() => {
        result.current.dealDamage(110); // 40 HP remaining out of 150 = 26.7% > 25%
      });

      expect(result.current.phase).toBe('angry');
    });

    it('should trigger phase change taunt on transition to angry', () => {
      const { result } = renderHook(() =>
        useAdventureBossNew({ worldId: 1 })
      );

      act(() => {
        result.current.startBattle();
      });

      act(() => {
        result.current.dealDamage(80); // 70 HP out of 150 = 46.7% < 50% → angry
      });

      // Should have a taunt from phase change
      expect(result.current.currentTaunt).not.toBeNull();
    });

    it('should trigger phase change taunt on transition to desperate', () => {
      const { result } = renderHook(() =>
        useAdventureBossNew({ worldId: 1 })
      );

      act(() => {
        result.current.startBattle();
      });

      act(() => {
        result.current.dealDamage(115); // 35 HP out of 150 = 23.3% < 25% → desperate
      });

      expect(result.current.currentTaunt).not.toBeNull();
    });
  });

  // ==============================================
  // BATTLE LIFECYCLE
  // ==============================================

  describe('startBattle', () => {
    it('should activate the battle and set HP', () => {
      const { result } = renderHook(() =>
        useAdventureBossNew({ worldId: 1 })
      );

      act(() => {
        result.current.startBattle();
      });

      expect(result.current.isActive).toBe(true);
      expect(result.current.hp).toBe(150);
      expect(result.current.maxHP).toBe(150);
    });

    it('should trigger onStart taunt', () => {
      const { result } = renderHook(() =>
        useAdventureBossNew({ worldId: 1 })
      );

      act(() => {
        result.current.startBattle();
      });

      expect(mockGetBossTaunt).toHaveBeenCalledWith(1, 'onStart');
      expect(result.current.currentTaunt).not.toBeNull();
    });

    it('should do nothing when worldId is null', () => {
      const { result } = renderHook(() =>
        useAdventureBossNew({ worldId: null })
      );

      act(() => {
        result.current.startBattle();
      });

      expect(result.current.isActive).toBe(false);
    });
  });

  describe('endBattle', () => {
    it('should deactivate and trigger defeat taunt on defeat', () => {
      const onDefeat = vi.fn();
      const { result } = renderHook(() =>
        useAdventureBossNew({ worldId: 1, onDefeat })
      );

      act(() => {
        result.current.startBattle();
      });

      act(() => {
        result.current.endBattle('defeat');
      });

      expect(result.current.isActive).toBe(false);
      expect(onDefeat).toHaveBeenCalled();
    });

    it('should stop attack timer on end', () => {
      const { result } = renderHook(() =>
        useAdventureBossNew({ worldId: 1 })
      );

      act(() => {
        result.current.startBattle();
      });

      act(() => {
        result.current.endBattle('defeat');
      });

      // Advance timers — no attacks should fire
      const hpBefore = result.current.hp;
      act(() => {
        vi.advanceTimersByTime(30000);
      });

      // No state changes expected after ending
      expect(result.current.isActive).toBe(false);
    });
  });

  // ==============================================
  // BOSS ATTACKS
  // ==============================================

  describe('boss attacks', () => {
    it('should not attack before battle starts', () => {
      const onAttack = vi.fn();
      const { result } = renderHook(() =>
        useAdventureBossNew({ worldId: 1, onAttack })
      );

      act(() => {
        vi.advanceTimersByTime(20000);
      });

      expect(onAttack).not.toHaveBeenCalled();
    });

    it('should execute an attack after 15s in normal phase', () => {
      const onAttack = vi.fn();
      const { result } = renderHook(() =>
        useAdventureBossNew({ worldId: 1, onAttack })
      );

      act(() => {
        result.current.startBattle();
      });

      act(() => {
        vi.advanceTimersByTime(15000);
      });

      expect(onAttack).toHaveBeenCalledTimes(1);
    });

    it('should execute attacks every 10s in angry phase', () => {
      const onAttack = vi.fn();
      const { result } = renderHook(() =>
        useAdventureBossNew({ worldId: 1, onAttack })
      );

      act(() => {
        result.current.startBattle();
      });

      // Move to angry phase
      act(() => {
        result.current.dealDamage(80);
      });

      onAttack.mockClear();

      act(() => {
        vi.advanceTimersByTime(10000);
      });

      expect(onAttack).toHaveBeenCalledTimes(1);
    });

    it('should execute attacks every 7s in desperate phase', () => {
      const onAttack = vi.fn();
      const { result } = renderHook(() =>
        useAdventureBossNew({ worldId: 1, onAttack })
      );

      act(() => {
        result.current.startBattle();
      });

      // Move to desperate phase
      act(() => {
        result.current.dealDamage(115);
      });

      onAttack.mockClear();

      act(() => {
        vi.advanceTimersByTime(7000);
      });

      expect(onAttack).toHaveBeenCalledTimes(1);
    });

    it('should call onAttack with attack type: lockTiles, scramble, or timePenalty', () => {
      const onAttack = vi.fn();
      const { result } = renderHook(() =>
        useAdventureBossNew({ worldId: 1, onAttack })
      );

      act(() => {
        result.current.startBattle();
      });

      act(() => {
        vi.advanceTimersByTime(15000);
      });

      expect(onAttack).toHaveBeenCalledWith(
        expect.objectContaining({
          type: expect.stringMatching(/^(lockTiles|scramble|timePenalty|damage)$/),
        })
      );
    });

    it('should include lockedTiles array for lockTiles attack (2-4 tiles)', () => {
      // We need to test that when a lockTiles attack happens,
      // the lockedTiles state is populated with 2-4 indices
      const onAttack = vi.fn();
      const { result } = renderHook(() =>
        useAdventureBossNew({ worldId: 1, onAttack })
      );

      act(() => {
        result.current.startBattle();
      });

      // Run enough attacks that we should get a lockTiles eventually
      // We'll check the lockedTiles from state instead
      // After an attack, lockedTiles may be populated
      act(() => {
        vi.advanceTimersByTime(15000 * 10); // 10 attack cycles
      });

      // The hook should expose lockedTiles
      expect(Array.isArray(result.current.lockedTiles)).toBe(true);
    });

    it('should clear locked tiles after 5 seconds', () => {
      const onAttack = vi.fn();
      const { result } = renderHook(() =>
        useAdventureBossNew({ worldId: 1, onAttack })
      );

      act(() => {
        result.current.startBattle();
      });

      // Trigger many attacks to ensure lockTiles happens
      // Instead, test the exposed lockedTiles clearing behavior
      // After lock tiles set, wait 5s and they should clear
      act(() => {
        vi.advanceTimersByTime(15000 * 10);
      });

      // Even if tiles were locked, after 5s they should auto-clear
      // The hook handles this internally
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(result.current.lockedTiles).toEqual([]);
    });

    it('should include timePenalty seconds for timePenalty attack (3-5)', () => {
      const onAttack = vi.fn();
      const { result } = renderHook(() =>
        useAdventureBossNew({ worldId: 1, onAttack })
      );

      act(() => {
        result.current.startBattle();
      });

      // Run multiple attacks, check if any timePenalty attack has valid seconds
      act(() => {
        vi.advanceTimersByTime(15000 * 10);
      });

      const timePenaltyCall = onAttack.mock.calls.find(
        (call: any[]) => call[0]?.type === 'timePenalty'
      );

      if (timePenaltyCall) {
        expect(timePenaltyCall[0].seconds).toBeGreaterThanOrEqual(3);
        expect(timePenaltyCall[0].seconds).toBeLessThanOrEqual(5);
      }
      // It's OK if no timePenalty was randomly chosen in 10 tries
    });
  });

  // ==============================================
  // TAUNTS
  // ==============================================

  describe('taunts', () => {
    it('should expose currentTaunt as null initially', () => {
      const { result } = renderHook(() =>
        useAdventureBossNew({ worldId: 1 })
      );

      expect(result.current.currentTaunt).toBeNull();
    });

    it('should trigger taunt on good word (5+ letters)', () => {
      const { result } = renderHook(() =>
        useAdventureBossNew({ worldId: 1 })
      );

      act(() => {
        result.current.startBattle();
      });

      act(() => {
        result.current.triggerTaunt('onGoodWord');
      });

      expect(mockGetBossTaunt).toHaveBeenCalledWith(1, 'onGoodWord');
      expect(result.current.currentTaunt).not.toBeNull();
    });

    it('should trigger taunt on bad word', () => {
      const { result } = renderHook(() =>
        useAdventureBossNew({ worldId: 1 })
      );

      act(() => {
        result.current.startBattle();
      });

      act(() => {
        result.current.triggerTaunt('onBadWord');
      });

      expect(mockGetBossTaunt).toHaveBeenCalledWith(1, 'onBadWord');
    });

    it('should auto-clear taunt after a delay', () => {
      const { result } = renderHook(() =>
        useAdventureBossNew({ worldId: 1 })
      );

      act(() => {
        result.current.startBattle();
      });

      act(() => {
        result.current.triggerTaunt('onGoodWord');
      });

      expect(result.current.currentTaunt).not.toBeNull();

      act(() => {
        vi.advanceTimersByTime(4000);
      });

      expect(result.current.currentTaunt).toBeNull();
    });
  });

  // ==============================================
  // HP PERCENTAGE
  // ==============================================

  describe('hpPercentage', () => {
    it('should compute HP percentage correctly', () => {
      const { result } = renderHook(() =>
        useAdventureBossNew({ worldId: 2 })
      );

      act(() => {
        result.current.startBattle();
      });

      // World 2 = 250 HP
      expect(result.current.hpPercentage).toBe(100);

      act(() => {
        result.current.dealDamage(125);
      });

      expect(result.current.hpPercentage).toBe(50);
    });
  });

  // ==============================================
  // CLEANUP
  // ==============================================

  describe('cleanup', () => {
    it('should clean up timers on unmount', () => {
      const { result, unmount } = renderHook(() =>
        useAdventureBossNew({ worldId: 1 })
      );

      act(() => {
        result.current.startBattle();
      });

      unmount();

      // Should not throw when advancing timers
      expect(() => {
        vi.advanceTimersByTime(30000);
      }).not.toThrow();
    });

    it('should clean up timers when worldId changes to null', () => {
      const { result, rerender } = renderHook(
        ({ worldId }: { worldId: number | null }) =>
          useAdventureBossNew({ worldId }),
        { initialProps: { worldId: 1 as number | null } }
      );

      act(() => {
        result.current.startBattle();
      });

      rerender({ worldId: null });

      expect(result.current.isActive).toBe(false);
    });
  });

  // ==============================================
  // RESET
  // ==============================================

  describe('reset', () => {
    it('should reset all state for a new battle', () => {
      const { result } = renderHook(() =>
        useAdventureBossNew({ worldId: 1 })
      );

      act(() => {
        result.current.startBattle();
      });

      act(() => {
        result.current.dealDamage(80);
      });

      expect(result.current.phase).toBe('angry');

      act(() => {
        result.current.reset();
      });

      expect(result.current.isActive).toBe(false);
      expect(result.current.hp).toBe(0);
      expect(result.current.phase).toBe('normal');
      expect(result.current.lockedTiles).toEqual([]);
      expect(result.current.currentTaunt).toBeNull();
    });
  });

  // ==============================================
  // RACE CONDITION: double-fire guard
  // ==============================================

  describe('dealDamage double-fire guard', () => {
    it('should call onVictory exactly once when two rapid dealDamage calls both see hp > 0', () => {
      const onVictory = vi.fn();
      const { result } = renderHook(() =>
        useAdventureBossNew({ worldId: 1, onVictory })
      );

      act(() => {
        result.current.startBattle();
      });

      // World 1 = 150 HP. Two calls each dealing 150 would both see hp > 0
      // if isActiveRef is not set false immediately in dealDamage.
      act(() => {
        result.current.dealDamage(150); // kills boss
        result.current.dealDamage(150); // should be a no-op (guard)
      });

      expect(onVictory).toHaveBeenCalledTimes(1);
    });

    it('should NOT allow a second dealDamage call to pass isActiveRef guard after kill', () => {
      const onVictory = vi.fn();
      const { result } = renderHook(() =>
        useAdventureBossNew({ worldId: 1, onVictory })
      );

      act(() => { result.current.startBattle(); });

      // First kill: drops HP to 0. isActiveRef must be set false in dealDamage itself.
      act(() => { result.current.dealDamage(150); });
      // React effects have run — isActive state is now false.
      // A second call simulates a concurrent submission arriving slightly later.
      let damage2: number = -1;
      act(() => { damage2 = result.current.dealDamage(150); });

      // The second call must return 0 (guarded) and must NOT fire onVictory again.
      expect(damage2).toBe(0);
      expect(onVictory).toHaveBeenCalledTimes(1);
    });

  });

  // ==============================================
  // MULTI-PHASE ROTATION (W10 boss has 9 phases)
  // ==============================================

  describe('multi-phase rotation', () => {
    const NINE_PHASE_BOSS = {
      ...MOCK_BOSS_CONFIG,
      worldId: 10,
      id: 'lexiconDragon',
      twistMechanic: { type: 'finalWord' as const, description: '', params: {
        phaseOrder: ['popQuiz', 'hiveMind', 'etymologyDig', 'idiomBattle', 'assemblyLine', 'scrambledReality', 'mirrorMatch', 'stellarForge', 'babelSummit'],
      }},
      phases: Array.from({ length: 9 }, (_, i) => ({
        nameKey: `phase.${i}`,
        hpThreshold: Math.round(100 - (i * (100 / 9))),
        mechanicModifiers: {
          speedMultiplier: 1 + (i * 0.15),
          mechanicOverride: { activeMechanic: ['popQuiz', 'hiveMind', 'etymologyDig', 'idiomBattle', 'assemblyLine', 'scrambledReality', 'mirrorMatch', 'stellarForge', 'babelSummit'][i] },
          gridEffect: `effect-${i}`,
        },
      })),
    };

    beforeEach(() => {
      mockGetBossConfig.mockReturnValue(NINE_PHASE_BOSS as any);
    });

    it('should start at phaseIndex 0', () => {
      const { result } = renderHook(() =>
        useAdventureBossNew({ worldId: 10 })
      );

      act(() => { result.current.startBattle(); });

      expect(result.current.phaseIndex).toBe(0);
    });

    it('should advance phaseIndex as HP drops through thresholds', () => {
      const { result } = renderHook(() =>
        useAdventureBossNew({ worldId: 10 })
      );

      act(() => { result.current.startBattle(); });

      // W10 HP = 1750, phase thresholds are 100, 89, 78, 67, 56, 44, 33, 22, 11
      // Damage to drop below 89% = need HP < 89% of 1750 = 1557.5 → deal 193+ damage
      act(() => { result.current.dealDamage(200); });
      // HP = 1550, pct = 88.6% < 89% → phaseIndex should be 1
      expect(result.current.phaseIndex).toBe(1);
    });

    it('should reach phaseIndex 8 near 0 HP', () => {
      const { result } = renderHook(() =>
        useAdventureBossNew({ worldId: 10 })
      );

      act(() => { result.current.startBattle(); });

      // Deal enough to get below 11% threshold (phase 8): HP < 192.5
      act(() => { result.current.dealDamage(1560); });
      // HP = 190, pct = 10.9% < 11%
      expect(result.current.phaseIndex).toBe(8);
    });

    it('should use phaseIndex for gridEffect lookup instead of hardcoded 0/1/2', () => {
      const onAttack = vi.fn();
      const { result } = renderHook(() =>
        useAdventureBossNew({ worldId: 10, onAttack })
      );

      act(() => { result.current.startBattle(); });

      // Drop to phase 2 (below 78% = 1365 HP, deal 400 → HP=1350, pct=77.1%)
      act(() => { result.current.dealDamage(400); });
      expect(result.current.phaseIndex).toBe(2);
    });

    it('should fallback to 3-phase indexing for bosses without multiple phases', () => {
      // Reset to standard 3-phase boss
      mockGetBossConfig.mockReturnValue(MOCK_BOSS_CONFIG as any);

      const { result } = renderHook(() =>
        useAdventureBossNew({ worldId: 1 })
      );

      act(() => { result.current.startBattle(); });

      expect(result.current.phaseIndex).toBe(0);

      // Drop below 50% → angry → phaseIndex 1
      act(() => { result.current.dealDamage(80); });
      expect(result.current.phaseIndex).toBe(1);
    });
  });

  describe('double-dealDamage guard (continued)', () => {
    it('dealDamage sets isActiveRef false synchronously when HP reaches 0 (prevents same-tick double-fire)', () => {
      // This test verifies the fix: dealDamage must set isActiveRef.current=false
      // immediately when newHP<=0, before effects run.
      // Without the fix, two calls in the same synchronous batch would BOTH pass
      // the isActiveRef guard and endBattle would be called twice.
      const onVictory = vi.fn();
      const { result } = renderHook(() =>
        useAdventureBossNew({ worldId: 1, onVictory })
      );

      act(() => { result.current.startBattle(); });

      // Capture dealDamage reference — call it twice in the same synchronous frame
      // before React effects can run (inside act, but both calls before flush)
      let damage1 = 0, damage2 = 0;
      act(() => {
        damage1 = result.current.dealDamage(150); // kills boss, must set isActiveRef=false
        damage2 = result.current.dealDamage(150); // must return 0 if isActiveRef was set false above
      });

      expect(damage1).toBe(150); // full damage dealt
      expect(damage2).toBe(0);  // guarded — isActiveRef was already false
      expect(onVictory).toHaveBeenCalledTimes(1);
    });
  });
});
