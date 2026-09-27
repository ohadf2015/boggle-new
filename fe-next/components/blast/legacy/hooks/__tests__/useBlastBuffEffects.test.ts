/**
 * useBlastBuffEffects — tests that the rewarded-ad pregame buff actually
 * affects gameplay (not just labels).
 *
 *   bomb    → seeds bomb tiles into wave-1 board
 *   shield  → auto-revives once on wave-1 dead-end
 *   combo2x → returns scoreMultiplier=2 (consumed by useBlastWordHandler)
 *
 * Multiplayer + wave>1 scenarios should be no-ops.
 */
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useBlastBuffEffects,
  seedBombTiles,
  BOMB_BUFF_SEED_COUNT,
  SHIELD_BUFF_REVIVE_MOVES,
  COMBO_2X_BUFF_MULTIPLIER,
} from '../useBlastBuffEffects';
import type { BlastTileState } from '@/shared/types/blast';

function makeTile(r: number, c: number): BlastTileState {
  return {
    uid: `${r},${c}`,
    row: r,
    col: c,
    type: 'standard',
    isCleared: false,
    activationEffect: null,
    hitsRemaining: 1,
  };
}

function makeBoard(size = 4): BlastTileState[][] {
  return Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c) => makeTile(r, c)),
  );
}

function makeEngine(overrides: Partial<{ tileStates: BlastTileState[][]; isDeadEnd: boolean; isComplete: boolean }> = {}) {
  let tileStates = overrides.tileStates ?? makeBoard();
  const seedTileStates = vi.fn((updater: (prev: BlastTileState[][]) => BlastTileState[][]) => {
    tileStates = updater(tileStates);
  });
  return {
    grid: [['a','b','c','d'],['e','f','g','h'],['i','j','k','l'],['m','n','o','p']],
    get tileStates() { return tileStates; },
    seedTileStates,
    revive: vi.fn(),
    gameState: { isDeadEnd: overrides.isDeadEnd ?? false, isComplete: overrides.isComplete ?? false },
  };
}

describe('seedBombTiles', () => {
  it('converts exactly N standard tiles to bomb tiles', () => {
    const result = seedBombTiles(makeBoard(4), 3, () => 0.5);
    const bombs = result.flat().filter(t => t.type === 'bomb');
    expect(bombs).toHaveLength(3);
  });

  it('skips cleared tiles and existing specials', () => {
    const board = makeBoard(3);
    board[0][0].isCleared = true;
    board[0][1].type = 'gold';
    const result = seedBombTiles(board, 99, () => 0);
    expect(result[0][0].type).toBe('standard'); // cleared tile untouched
    expect(result[0][1].type).toBe('gold');     // existing special preserved
    const totalBombs = result.flat().filter(t => t.type === 'bomb').length;
    expect(totalBombs).toBe(7); // 9 - 1 cleared - 1 gold
  });

  it('caps at available standard tile count', () => {
    const board = makeBoard(2); // 4 tiles
    const result = seedBombTiles(board, 100, () => 0);
    expect(result.flat().filter(t => t.type === 'bomb')).toHaveLength(4);
  });
});

describe('useBlastBuffEffects — bomb', () => {
  it('seeds BOMB_BUFF_SEED_COUNT bomb tiles on wave 1 SP', () => {
    const engine = makeEngine();
    renderHook(() => useBlastBuffEffects({ buff: 'bomb', waveNumber: 1, isMultiplayer: false, engine }));
    expect(engine.seedTileStates).toHaveBeenCalledTimes(1);
    const bombs = engine.tileStates.flat().filter(t => t.type === 'bomb');
    expect(bombs).toHaveLength(BOMB_BUFF_SEED_COUNT);
  });

  it('does not seed bombs on wave 2+', () => {
    const engine = makeEngine();
    renderHook(() => useBlastBuffEffects({ buff: 'bomb', waveNumber: 2, isMultiplayer: false, engine }));
    expect(engine.seedTileStates).not.toHaveBeenCalled();
  });

  it('does not seed bombs in multiplayer', () => {
    const engine = makeEngine();
    renderHook(() => useBlastBuffEffects({ buff: 'bomb', waveNumber: 1, isMultiplayer: true, engine }));
    expect(engine.seedTileStates).not.toHaveBeenCalled();
  });

  it('does not double-seed on rerender', () => {
    const engine = makeEngine();
    const { rerender } = renderHook(() => useBlastBuffEffects({ buff: 'bomb', waveNumber: 1, isMultiplayer: false, engine }));
    rerender();
    rerender();
    expect(engine.seedTileStates).toHaveBeenCalledTimes(1);
  });
});

describe('useBlastBuffEffects — shield', () => {
  it('auto-revives once when wave-1 SP dead-end fires', () => {
    let isDeadEnd = false;
    const engine = makeEngine();
    Object.defineProperty(engine.gameState, 'isDeadEnd', { get: () => isDeadEnd, configurable: true });

    const { rerender } = renderHook(() => useBlastBuffEffects({ buff: 'shield', waveNumber: 1, isMultiplayer: false, engine }));
    expect(engine.revive).not.toHaveBeenCalled();

    act(() => { isDeadEnd = true; });
    rerender();
    expect(engine.revive).toHaveBeenCalledWith(SHIELD_BUFF_REVIVE_MOVES);
    expect(engine.revive).toHaveBeenCalledTimes(1);
  });

  it('reports shieldConsumed=true after revive fires', () => {
    let isDeadEnd = false;
    const engine = makeEngine();
    Object.defineProperty(engine.gameState, 'isDeadEnd', { get: () => isDeadEnd, configurable: true });

    const { result, rerender } = renderHook(() => useBlastBuffEffects({ buff: 'shield', waveNumber: 1, isMultiplayer: false, engine }));
    expect(result.current.shieldConsumed).toBe(false);

    act(() => { isDeadEnd = true; });
    rerender();
    expect(result.current.shieldConsumed).toBe(true);
  });

  it('does not auto-revive in multiplayer', () => {
    const engine = makeEngine({ isDeadEnd: true });
    renderHook(() => useBlastBuffEffects({ buff: 'shield', waveNumber: 1, isMultiplayer: true, engine }));
    expect(engine.revive).not.toHaveBeenCalled();
  });

  it('does not auto-revive on wave 2+', () => {
    const engine = makeEngine({ isDeadEnd: true });
    renderHook(() => useBlastBuffEffects({ buff: 'shield', waveNumber: 2, isMultiplayer: false, engine }));
    expect(engine.revive).not.toHaveBeenCalled();
  });
});

describe('useBlastBuffEffects — combo2x', () => {
  it('returns scoreMultiplier=COMBO_2X_BUFF_MULTIPLIER on wave 1 SP', () => {
    const engine = makeEngine();
    const { result } = renderHook(() => useBlastBuffEffects({ buff: 'combo2x', waveNumber: 1, isMultiplayer: false, engine }));
    expect(result.current.scoreMultiplier).toBe(COMBO_2X_BUFF_MULTIPLIER);
  });

  it('returns 1 on wave 2+', () => {
    const engine = makeEngine();
    const { result } = renderHook(() => useBlastBuffEffects({ buff: 'combo2x', waveNumber: 2, isMultiplayer: false, engine }));
    expect(result.current.scoreMultiplier).toBe(1);
  });

  it('returns 1 in multiplayer', () => {
    const engine = makeEngine();
    const { result } = renderHook(() => useBlastBuffEffects({ buff: 'combo2x', waveNumber: 1, isMultiplayer: true, engine }));
    expect(result.current.scoreMultiplier).toBe(1);
  });

  it('returns 1 when no buff active', () => {
    const engine = makeEngine();
    const { result } = renderHook(() => useBlastBuffEffects({ buff: null, waveNumber: 1, isMultiplayer: false, engine }));
    expect(result.current.scoreMultiplier).toBe(1);
  });
});

describe('useBlastBuffEffects — buffIntroVisible', () => {
  it('is true on wave-1 SP entry with any buff', () => {
    const engine = makeEngine();
    const { result } = renderHook(() => useBlastBuffEffects({ buff: 'shield', waveNumber: 1, isMultiplayer: false, engine }));
    expect(result.current.buffIntroVisible).toBe(true);
  });

  it('is false when no buff is selected', () => {
    const engine = makeEngine();
    const { result } = renderHook(() => useBlastBuffEffects({ buff: null, waveNumber: 1, isMultiplayer: false, engine }));
    expect(result.current.buffIntroVisible).toBe(false);
  });

  it('is false on wave 2+ even with a buff', () => {
    const engine = makeEngine();
    const { result } = renderHook(() => useBlastBuffEffects({ buff: 'bomb', waveNumber: 2, isMultiplayer: false, engine }));
    expect(result.current.buffIntroVisible).toBe(false);
  });

  it('is false in multiplayer', () => {
    const engine = makeEngine();
    const { result } = renderHook(() => useBlastBuffEffects({ buff: 'combo2x', waveNumber: 1, isMultiplayer: true, engine }));
    expect(result.current.buffIntroVisible).toBe(false);
  });
});
