/**
 * Tests for PhaserGameAdventure earthquake bridge emission.
 * Verifies that earthquakeState prop triggers GameBridge.emit('effect:earthquake').
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

describe('PhaserGameAdventure - earthquake bridge', () => {
  beforeEach(() => {
    emitSpy.mockClear();
    GameBridge.reset();
  });

  it('should NOT emit effect:earthquake when earthquakeState is idle', () => {
    render(<PhaserGameAdventure {...baseProps} earthquakeState="idle" />);

    const earthquakeCalls = emitSpy.mock.calls.filter(
      ([event]) => event === 'effect:earthquake'
    );
    expect(earthquakeCalls).toHaveLength(0);
  });

  it('should emit effect:earthquake with warning intensity', () => {
    render(<PhaserGameAdventure {...baseProps} earthquakeState="warning" />);

    const earthquakeCalls = emitSpy.mock.calls.filter(
      ([event]) => event === 'effect:earthquake'
    );
    expect(earthquakeCalls.length).toBeGreaterThanOrEqual(1);
    expect(earthquakeCalls[0][1]).toEqual({ intensity: 'warning' });
  });

  it('should emit effect:earthquake with shaking intensity', () => {
    render(<PhaserGameAdventure {...baseProps} earthquakeState="shaking" />);

    const earthquakeCalls = emitSpy.mock.calls.filter(
      ([event]) => event === 'effect:earthquake'
    );
    expect(earthquakeCalls.length).toBeGreaterThanOrEqual(1);
    expect(earthquakeCalls[0][1]).toEqual({ intensity: 'shaking' });
  });

  it('should emit effect:earthquake with fire-round intensity', () => {
    render(<PhaserGameAdventure {...baseProps} earthquakeState="fire-round" />);

    const earthquakeCalls = emitSpy.mock.calls.filter(
      ([event]) => event === 'effect:earthquake'
    );
    expect(earthquakeCalls.length).toBeGreaterThanOrEqual(1);
    expect(earthquakeCalls[0][1]).toEqual({ intensity: 'fire-round' });
  });

  it('should emit again when earthquakeState changes', () => {
    const { rerender } = render(
      <PhaserGameAdventure {...baseProps} earthquakeState="idle" />
    );

    emitSpy.mockClear();

    rerender(<PhaserGameAdventure {...baseProps} earthquakeState="warning" />);

    const earthquakeCalls = emitSpy.mock.calls.filter(
      ([event]) => event === 'effect:earthquake'
    );
    expect(earthquakeCalls.length).toBeGreaterThanOrEqual(1);
    expect(earthquakeCalls[0][1]).toEqual({ intensity: 'warning' });
  });
});
