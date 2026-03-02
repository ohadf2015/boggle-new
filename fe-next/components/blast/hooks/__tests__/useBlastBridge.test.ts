/**
 * useBlastBridge — translates React blast state ↔ GameBridge events.
 *
 * Verifies:
 * - Emits blast:grid:update when grid/tileStates/comboLevel change
 * - Emits blast:hint:show when hintPath provided
 * - Emits blast:hint:clear when hintPath becomes null
 * - Emits blast:shake when shakeIntensity changes
 * - Emits blast:wave:transition when waveNumber changes with flag
 * - Forwards word:submit from Phaser → onWordSubmit callback
 * - Forwards word:change from Phaser → onWordChange callback
 * - Forwards blast:anim:complete → onAnimComplete callback
 * - Emits scene:destroy + reset on unmount
 * - Emits initial state on scene:ready
 */

import { renderHook, act } from '@testing-library/react';
import { GameBridge, type PathCellPayload } from '@/lib/phaser/bridge/GameBridge';
import { useBlastBridge, type UseBlastBridgeOptions } from '../useBlastBridge';

// ─── Test data ───────────────────────────────────────────────────────────────

const GRID_4x4: string[][] = [
  ['A', 'B', 'C', 'D'],
  ['E', 'F', 'G', 'H'],
  ['I', 'J', 'K', 'L'],
  ['M', 'N', 'O', 'P'],
];

const TILE_STATES_4x4 = Array.from({ length: 4 }, (_, row) =>
  Array.from({ length: 4 }, (_, col) => ({
    row, col, type: 'standard' as const, isCleared: false,
    activationEffect: null, hitsRemaining: 0,
  }))
);

function defaultProps(overrides: Partial<UseBlastBridgeOptions> = {}): UseBlastBridgeOptions {
  return {
    grid: GRID_4x4,
    tileStates: TILE_STATES_4x4,
    comboLevel: 0,
    hintPath: null,
    waveNumber: 1,
    ...overrides,
  };
}

// ─── Setup / Teardown ────────────────────────────────────────────────────────

beforeEach(() => {
  GameBridge.reset();
  jest.spyOn(GameBridge, 'emit');
});

afterEach(() => {
  jest.restoreAllMocks();
  GameBridge.reset();
});

// ─── React → Phaser: blast:grid:update ───────────────────────────────────────

describe('blast:grid:update', () => {
  it('emits blast:grid:update on mount with initial grid', () => {
    renderHook(() => useBlastBridge(defaultProps()));

    expect(GameBridge.emit).toHaveBeenCalledWith('blast:grid:update', {
      grid: GRID_4x4,
      tileStates: TILE_STATES_4x4,
      comboLevel: 0,
    });
  });

  it('emits blast:grid:update when comboLevel changes', () => {
    const { rerender } = renderHook(
      (props: UseBlastBridgeOptions) => useBlastBridge(props),
      { initialProps: defaultProps({ comboLevel: 0 }) },
    );

    (GameBridge.emit as jest.Mock).mockClear();

    act(() => {
      rerender(defaultProps({ comboLevel: 3 }));
    });

    expect(GameBridge.emit).toHaveBeenCalledWith(
      'blast:grid:update',
      expect.objectContaining({ comboLevel: 3 }),
    );
  });

  it('does not emit blast:grid:update when grid is null', () => {
    renderHook(() => useBlastBridge(defaultProps({ grid: null })));

    expect(GameBridge.emit).not.toHaveBeenCalledWith(
      'blast:grid:update',
      expect.anything(),
    );
  });
});

// ─── React → Phaser: blast:hint:show / blast:hint:clear ──────────────────────

describe('blast:hint:show / blast:hint:clear', () => {
  it('emits blast:hint:show when hintPath is provided', () => {
    const path = [{ row: 0, col: 0 }, { row: 0, col: 1 }];
    renderHook(() => useBlastBridge(defaultProps({ hintPath: path })));

    expect(GameBridge.emit).toHaveBeenCalledWith('blast:hint:show', { path });
  });

  it('emits blast:hint:clear when hintPath becomes null', () => {
    const path = [{ row: 0, col: 0 }];
    const { rerender } = renderHook(
      (props: UseBlastBridgeOptions) => useBlastBridge(props),
      { initialProps: defaultProps({ hintPath: path }) },
    );

    (GameBridge.emit as jest.Mock).mockClear();

    act(() => {
      rerender(defaultProps({ hintPath: null }));
    });

    expect(GameBridge.emit).toHaveBeenCalledWith('blast:hint:clear', undefined);
  });
});

// ─── Phaser → React: word:submit ─────────────────────────────────────────────

describe('word:submit → onWordSubmit', () => {
  it('forwards word:submit from Phaser to onWordSubmit callback', () => {
    const onWordSubmit = jest.fn();
    renderHook(() => useBlastBridge(defaultProps({ onWordSubmit })));

    const path: PathCellPayload[] = [
      { row: 0, col: 0, letter: 'A' },
      { row: 0, col: 1, letter: 'B' },
    ];

    act(() => {
      GameBridge.emit('word:submit', { word: 'AB', path });
    });

    expect(onWordSubmit).toHaveBeenCalledWith('AB', path);
  });

  it('does not crash when onWordSubmit is not provided', () => {
    renderHook(() => useBlastBridge(defaultProps()));

    expect(() => {
      act(() => {
        GameBridge.emit('word:submit', {
          word: 'A',
          path: [{ row: 0, col: 0, letter: 'A' }],
        });
      });
    }).not.toThrow();
  });
});

// ─── Phaser → React: word:change ─────────────────────────────────────────────

describe('word:change → onWordChange', () => {
  it('forwards word:change from Phaser to onWordChange callback', () => {
    const onWordChange = jest.fn();
    renderHook(() => useBlastBridge(defaultProps({ onWordChange })));

    act(() => {
      GameBridge.emit('word:change', {
        word: 'CAT',
        letterCount: 3,
        path: [
          { row: 0, col: 0, letter: 'C' },
          { row: 0, col: 1, letter: 'A' },
          { row: 0, col: 2, letter: 'T' },
        ],
      });
    });

    expect(onWordChange).toHaveBeenCalledWith('CAT', 3);
  });
});

// ─── Phaser → React: blast:anim:complete ─────────────────────────────────────

describe('blast:anim:complete → onAnimComplete', () => {
  it('forwards blast:anim:complete to onAnimComplete callback', () => {
    const onAnimComplete = jest.fn();
    renderHook(() => useBlastBridge(defaultProps({ onAnimComplete })));

    act(() => {
      GameBridge.emit('blast:anim:complete', { phase: 'clear' });
    });

    expect(onAnimComplete).toHaveBeenCalledWith('clear');
  });

  it('forwards gravity phase completion', () => {
    const onAnimComplete = jest.fn();
    renderHook(() => useBlastBridge(defaultProps({ onAnimComplete })));

    act(() => {
      GameBridge.emit('blast:anim:complete', { phase: 'gravity' });
    });

    expect(onAnimComplete).toHaveBeenCalledWith('gravity');
  });
});

// ─── scene:ready → initial state ─────────────────────────────────────────────

describe('scene:ready sends initial state', () => {
  it('emits blast:grid:update when scene:ready fires', () => {
    renderHook(() => useBlastBridge(defaultProps()));
    (GameBridge.emit as jest.Mock).mockClear();

    act(() => {
      GameBridge.emit('scene:ready', undefined);
    });

    expect(GameBridge.emit).toHaveBeenCalledWith('blast:grid:update', {
      grid: GRID_4x4,
      tileStates: TILE_STATES_4x4,
      comboLevel: 0,
    });
  });
});

// ─── Cleanup on unmount ──────────────────────────────────────────────────────

describe('cleanup on unmount', () => {
  it('emits scene:destroy on unmount', () => {
    const { unmount } = renderHook(() => useBlastBridge(defaultProps()));
    (GameBridge.emit as jest.Mock).mockClear();

    act(() => unmount());

    expect(GameBridge.emit).toHaveBeenCalledWith('scene:destroy', undefined);
  });

  it('stops calling onWordSubmit after unmount', () => {
    const onWordSubmit = jest.fn();
    const { unmount } = renderHook(() => useBlastBridge(defaultProps({ onWordSubmit })));

    act(() => unmount());
    onWordSubmit.mockClear();

    act(() => {
      GameBridge.emit('word:submit', {
        word: 'TEST',
        path: [{ row: 0, col: 0, letter: 'T' }],
      });
    });

    expect(onWordSubmit).not.toHaveBeenCalled();
  });

  it('stops calling onAnimComplete after unmount', () => {
    const onAnimComplete = jest.fn();
    const { unmount } = renderHook(() => useBlastBridge(defaultProps({ onAnimComplete })));

    act(() => unmount());
    onAnimComplete.mockClear();

    act(() => {
      GameBridge.emit('blast:anim:complete', { phase: 'clear' });
    });

    expect(onAnimComplete).not.toHaveBeenCalled();
  });
});

// ─── emitBlastEvent helper ───────────────────────────────────────────────────

describe('emitBlastEvent returned helper', () => {
  it('returns emitBlastEvent function for emitting blast-specific events', () => {
    const { result } = renderHook(() => useBlastBridge(defaultProps()));

    expect(result.current.emitBlastEvent).toBeInstanceOf(Function);
  });

  it('emits blast:tiles:clear via emitBlastEvent', () => {
    const { result } = renderHook(() => useBlastBridge(defaultProps()));
    (GameBridge.emit as jest.Mock).mockClear();

    const payload = {
      clearedPositions: [{ row: 0, col: 0 }],
      explosions: [],
      scorePopups: [],
    };

    act(() => {
      result.current.emitBlastEvent('blast:tiles:clear', payload);
    });

    expect(GameBridge.emit).toHaveBeenCalledWith('blast:tiles:clear', payload);
  });

  it('emits blast:gravity:start via emitBlastEvent', () => {
    const { result } = renderHook(() => useBlastBridge(defaultProps()));
    (GameBridge.emit as jest.Mock).mockClear();

    const payload = {
      fallingTiles: [{ row: 2, col: 0, fromRow: 0, fallDistance: 2 }],
      newTiles: [{ row: 0, col: 0, letter: 'X', type: 'standard' }],
    };

    act(() => {
      result.current.emitBlastEvent('blast:gravity:start', payload);
    });

    expect(GameBridge.emit).toHaveBeenCalledWith('blast:gravity:start', payload);
  });

  it('emits blast:shake via emitBlastEvent', () => {
    const { result } = renderHook(() => useBlastBridge(defaultProps()));
    (GameBridge.emit as jest.Mock).mockClear();

    act(() => {
      result.current.emitBlastEvent('blast:shake', { intensity: 'heavy' });
    });

    expect(GameBridge.emit).toHaveBeenCalledWith('blast:shake', { intensity: 'heavy' });
  });

  it('emits blast:wave:transition via emitBlastEvent', () => {
    const { result } = renderHook(() => useBlastBridge(defaultProps()));
    (GameBridge.emit as jest.Mock).mockClear();

    act(() => {
      result.current.emitBlastEvent('blast:wave:transition', { waveNumber: 3 });
    });

    expect(GameBridge.emit).toHaveBeenCalledWith('blast:wave:transition', { waveNumber: 3 });
  });

  it('emits blast:cascade:highlight via emitBlastEvent', () => {
    const { result } = renderHook(() => useBlastBridge(defaultProps()));
    (GameBridge.emit as jest.Mock).mockClear();

    const payload = {
      words: [{ word: 'CAT', path: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }], score: 3, chainLevel: 1 }],
    };

    act(() => {
      result.current.emitBlastEvent('blast:cascade:highlight', payload);
    });

    expect(GameBridge.emit).toHaveBeenCalledWith('blast:cascade:highlight', payload);
  });
});
