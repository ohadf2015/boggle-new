/**
 * PhaserGame — React wrapper integration tests.
 *
 * Strategy: mock next/dynamic (PhaserCanvas never runs in Jest),
 * use real GameBridge (pure JS), verify that:
 *   - React props → bridge emits
 *   - Bridge emits → React callbacks
 *   - Cleanup resets the bridge on unmount
 */

import React from 'react';
import { render, act, renderHook } from '@testing-library/react';
import { GameBridge, type PathCellPayload } from '@/lib/phaser/bridge/GameBridge';

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Replace next/dynamic with identity — returns whatever the loader resolves to.
// PhaserCanvas becomes a plain div so no Phaser.Game is created.
jest.mock('next/dynamic', () => ({
  __esModule: true,
  default: () => {
    const Stub = () => <div data-testid="phaser-canvas-stub" />;
    Stub.displayName = 'PhaserCanvasStub';
    return Stub;
  },
}));

jest.mock('@/contexts/AccessibilityContext', () => ({
  useAccessibility: () => ({
    settings: {
      disableFireRoundLights: false,
      disableEarthquakeEffects: false,
      reduceMotion: false,
      disableHaptics: false,
      useLargeLetters: false,
    },
    shouldReduceMotion: false,
    hapticsEnabled: true,
    largeLettersEnabled: false,
  }),
}));

jest.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({
    isLowEnd: false,
    targetFPS: 60,
    throttleMs: 16,
    enableComplexAnimations: true,
    enableGlowEffects: true,
    reduceParticles: false,
    maxParticles: 20,
    prefersReducedMotion: false,
    isSlowConnection: false,
    isMobile: false,
  }),
}));

// ─── Import component after mocks ─────────────────────────────────────────────

import { PhaserGame } from '../PhaserGame';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const GRID_4X4 = [
  ['A', 'B', 'C', 'D'],
  ['E', 'F', 'G', 'H'],
  ['I', 'J', 'K', 'L'],
  ['M', 'N', 'O', 'P'],
];

function renderPhaserGame(props: Partial<React.ComponentProps<typeof PhaserGame>> = {}) {
  return render(
    <PhaserGame
      grid={GRID_4X4}
      comboLevel={0}
      fireRoundActive={false}
      {...props}
    />
  );
}

beforeEach(() => {
  GameBridge.reset();
  jest.spyOn(GameBridge, 'emit');
});

afterEach(() => {
  jest.restoreAllMocks();
  GameBridge.reset();
});

// ─── Rendering ────────────────────────────────────────────────────────────────

describe('PhaserGame rendering', () => {
  it('renders a wrapper div with data-testid', () => {
    const { getByTestId } = renderPhaserGame();
    expect(getByTestId('phaser-game')).toBeInTheDocument();
  });

  it('renders the PhaserCanvas stub', () => {
    const { getByTestId } = renderPhaserGame();
    expect(getByTestId('phaser-canvas-stub')).toBeInTheDocument();
  });
});

// ─── React → Bridge: grid:update ─────────────────────────────────────────────

describe('grid:update bridge event', () => {
  it('emits grid:update on mount with initial grid', () => {
    renderPhaserGame({ grid: GRID_4X4, comboLevel: 0, fireRoundActive: false });
    expect(GameBridge.emit).toHaveBeenCalledWith('grid:update', {
      grid: GRID_4X4,
      comboLevel: 0,
      fireRoundActive: false,
    });
  });

  it('emits grid:update when comboLevel changes', () => {
    const { rerender } = renderPhaserGame({ comboLevel: 0 });
    jest.clearAllMocks();

    act(() => {
      rerender(
        <PhaserGame grid={GRID_4X4} comboLevel={3} fireRoundActive={false} />
      );
    });

    expect(GameBridge.emit).toHaveBeenCalledWith('grid:update', expect.objectContaining({
      comboLevel: 3,
    }));
  });

  it('emits grid:update when fireRoundActive changes', () => {
    const { rerender } = renderPhaserGame({ fireRoundActive: false });
    jest.clearAllMocks();

    act(() => {
      rerender(
        <PhaserGame grid={GRID_4X4} comboLevel={0} fireRoundActive={true} />
      );
    });

    expect(GameBridge.emit).toHaveBeenCalledWith('grid:update', expect.objectContaining({
      fireRoundActive: true,
    }));
  });
});

// ─── React → Bridge: accessibility:update ────────────────────────────────────

describe('accessibility:update bridge event', () => {
  it('emits accessibility:update on mount', () => {
    renderPhaserGame();
    expect(GameBridge.emit).toHaveBeenCalledWith(
      'accessibility:update',
      expect.objectContaining({
        reduceMotion: false,
        disableFireRoundLights: false,
        disableEarthquakeEffects: false,
        isLowEnd: false,
      })
    );
  });
});

// ─── Bridge → React: word:submit ─────────────────────────────────────────────

describe('word:submit bridge → callback', () => {
  it('calls onWordSubmit when bridge emits word:submit', () => {
    const onWordSubmit = jest.fn();
    renderPhaserGame({ onWordSubmit });

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
    renderPhaserGame({ onWordSubmit: undefined });

    const path: PathCellPayload[] = [{ row: 0, col: 0, letter: 'A' }];

    expect(() => {
      act(() => {
        GameBridge.emit('word:submit', { word: 'A', path });
      });
    }).not.toThrow();
  });
});

// ─── Bridge → React: word:change ─────────────────────────────────────────────

describe('word:change bridge → callback', () => {
  it('calls onWordChange when bridge emits word:change', () => {
    const onWordChange = jest.fn();
    renderPhaserGame({ onWordChange });

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

// ─── Cleanup ─────────────────────────────────────────────────────────────────

describe('cleanup on unmount', () => {
  it('emits scene:destroy on unmount', () => {
    const { unmount } = renderPhaserGame();
    jest.clearAllMocks();

    act(() => unmount());

    expect(GameBridge.emit).toHaveBeenCalledWith('scene:destroy', undefined);
  });

  it('stops calling onWordSubmit after unmount', () => {
    const onWordSubmit = jest.fn();
    const { unmount } = renderPhaserGame({ onWordSubmit });

    act(() => unmount());
    jest.clearAllMocks();

    act(() => {
      GameBridge.emit('word:submit', {
        word: 'TEST',
        path: [{ row: 0, col: 0, letter: 'T' }],
      });
    });

    expect(onWordSubmit).not.toHaveBeenCalled();
  });
});
