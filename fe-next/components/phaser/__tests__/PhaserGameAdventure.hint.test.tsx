/**
 * Tests for PhaserGameAdventure hint cells bridge emission.
 * Verifies that hintCells prop triggers persistent selection:highlight events
 * and that duplicate emissions are suppressed (reference-stability fix).
 */
import React from 'react';
import { render } from '@testing-library/react';
import { GameBridge } from '@/lib/phaser/bridge/GameBridge';

// Mock dependencies
jest.mock('next/dynamic', () => () => {
  const MockCanvas = () => <div data-testid="phaser-canvas-adventure" />;
  MockCanvas.displayName = 'MockPhaserCanvasAdventure';
  return MockCanvas;
});

jest.mock('@/contexts/AccessibilityContext', () => ({
  useAccessibility: () => ({
    settings: {
      disableFireRoundLights: false,
      disableEarthquakeEffects: false,
    },
    shouldReduceMotion: false,
  }),
}));

jest.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({ isLowEnd: false }),
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ dir: 'ltr' }),
}));

// Spy on GameBridge.emit
const emitSpy = jest.spyOn(GameBridge, 'emit');

import { PhaserGameAdventure } from '../PhaserGameAdventure';

const baseProps = {
  grid: [['A', 'B'], ['C', 'D']],
  comboLevel: 0,
  fireRoundActive: false,
};

describe('PhaserGameAdventure - hint highlight bridge', () => {
  beforeEach(() => {
    emitSpy.mockClear();
    GameBridge.reset();
  });

  it('should emit selection:highlight with cells when hintCells is provided', () => {
    const hintCells = [{ row: 0, col: 1 }, { row: 1, col: 0 }];
    render(<PhaserGameAdventure {...baseProps} hintCells={hintCells} />);

    const highlightCalls = emitSpy.mock.calls.filter(
      ([event]) => event === 'selection:highlight'
    );
    expect(highlightCalls.length).toBeGreaterThanOrEqual(1);

    const lastCall = highlightCalls[highlightCalls.length - 1];
    expect(lastCall[1]).toEqual({
      cells: [
        { row: 0, col: 1, letter: '' },
        { row: 1, col: 0, letter: '' },
      ],
    });
  });

  it('should NOT emit selection:highlight when hintCells is empty', () => {
    render(<PhaserGameAdventure {...baseProps} hintCells={[]} />);

    const highlightCalls = emitSpy.mock.calls.filter(
      ([event]) => event === 'selection:highlight'
    );
    // No emission for empty initial hint cells
    expect(highlightCalls.length).toBe(0);
  });

  it('should emit clear (empty cells) when hintCells goes from populated to empty', () => {
    const hintCells = [{ row: 0, col: 0 }];
    const { rerender } = render(
      <PhaserGameAdventure {...baseProps} hintCells={hintCells} />
    );

    emitSpy.mockClear();

    // Clear hint
    rerender(<PhaserGameAdventure {...baseProps} hintCells={[]} />);

    const highlightCalls = emitSpy.mock.calls.filter(
      ([event]) => event === 'selection:highlight'
    );
    expect(highlightCalls.length).toBe(1);
    expect(highlightCalls[0][1]).toEqual({ cells: [] });
  });

  it('should NOT re-emit when hintCells has same values but new reference', () => {
    const { rerender } = render(
      <PhaserGameAdventure
        {...baseProps}
        hintCells={[{ row: 0, col: 1 }]}
      />
    );

    emitSpy.mockClear();

    // Re-render with same cell values but new array reference (simulates .map() in parent)
    rerender(
      <PhaserGameAdventure
        {...baseProps}
        hintCells={[{ row: 0, col: 1 }]}
      />
    );

    const highlightCalls = emitSpy.mock.calls.filter(
      ([event]) => event === 'selection:highlight'
    );
    // Should NOT fire again — key is identical ("0,1")
    expect(highlightCalls.length).toBe(0);
  });

  it('should emit when hint cells actually change', () => {
    const { rerender } = render(
      <PhaserGameAdventure
        {...baseProps}
        hintCells={[{ row: 0, col: 0 }]}
      />
    );

    emitSpy.mockClear();

    // Different cells
    rerender(
      <PhaserGameAdventure
        {...baseProps}
        hintCells={[{ row: 1, col: 1 }]}
      />
    );

    const highlightCalls = emitSpy.mock.calls.filter(
      ([event]) => event === 'selection:highlight'
    );
    expect(highlightCalls.length).toBe(1);
    expect(highlightCalls[0][1]).toEqual({
      cells: [{ row: 1, col: 1, letter: '' }],
    });
  });
});
