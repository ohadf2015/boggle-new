import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ParticleConfig } from '@/lib/gameEngine/types';

// ─── Mock GameCanvas ────────────────────────────────────────────────
// Bypass real PixiJS init — render children directly, expose a spy engine so
// we can inspect the ambient emitter config the EffectsWorker requests.
const mockEngine = {
  particles: {
    burst: vi.fn(),
    create: vi.fn(() => ({ emit: vi.fn(), destroy: vi.fn() })),
  },
  shake: { light: vi.fn(), medium: vi.fn(), heavy: vi.fn(), shake: vi.fn() },
  flash: { flash: vi.fn(), danger: vi.fn(), gold: vi.fn(), white: vi.fn(), combo: vi.fn() },
  timeDilation: { freeze: vi.fn(), slowDown: vi.fn() },
  width: 400,
  height: 600,
};

vi.mock('@/lib/gameEngine/GameCanvas', () => ({
  GameCanvas: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mock-game-canvas">{children}</div>
  ),
  useGameEngine: () => mockEngine,
}));

import WordWheelEffectsCanvas from '../WordWheelEffectsCanvas';
import { scoreWord } from '@/utils/dailyChallenge/wordWheelScoring';

const baseProps = { width: 400, height: 600, onEffectsConsumed: vi.fn() };

beforeEach(() => {
  for (const group of [mockEngine.shake, mockEngine.flash, mockEngine.timeDilation]) {
    for (const fn of Object.values(group)) fn.mockClear();
  }
});

const play = (points: number) =>
  render(<WordWheelEffectsCanvas {...baseProps} effects={[{ type: 'wordValid', x: 1, y: 1, points }]} />);

describe('WordWheelEffectsCanvas — word reward scales with the wheel score table', () => {
  it('a 4-letter word (30 pts) gets a light reaction, not the long-word hit-stop', () => {
    play(scoreWord('GAIN'));
    expect(mockEngine.shake.heavy).not.toHaveBeenCalled();
    expect(mockEngine.timeDilation.slowDown).not.toHaveBeenCalled();
  });

  it('a 3-letter word (12 pts) never shakes the screen', () => {
    play(scoreWord('ANT'));
    expect(mockEngine.shake.light).not.toHaveBeenCalled();
    expect(mockEngine.shake.medium).not.toHaveBeenCalled();
    expect(mockEngine.shake.heavy).not.toHaveBeenCalled();
  });

  it('a 7-letter word still earns the big celebration', () => {
    play(scoreWord('TOWNISH'));
    expect(mockEngine.shake.heavy).toHaveBeenCalled();
  });

  it('a x2 combo tints the screen softly instead of a full cyan wash', () => {
    render(<WordWheelEffectsCanvas {...baseProps} effects={[{ type: 'combo', x: 1, y: 1, combo: 2 }]} />);
    expect(mockEngine.flash.combo).not.toHaveBeenCalled();
    for (const [opts] of mockEngine.flash.flash.mock.calls) expect(opts.intensity).toBeLessThanOrEqual(0.2);
  });

  it('a rejected word is a gentle nudge, not a red full-screen wash', () => {
    render(<WordWheelEffectsCanvas {...baseProps} effects={[{ type: 'error', x: 1, y: 1 }]} />);
    expect(mockEngine.flash.danger).not.toHaveBeenCalled();
    for (const [opts] of mockEngine.flash.flash.mock.calls) expect(opts.intensity).toBeLessThanOrEqual(0.15);
  });
});
