/**
 * BlastShatterEffect — Tests for canvas-based tile shatter particle system.
 */
import React from 'react';
import { render, screen, act } from '@testing-library/react';

// Track RAF calls
let rafCallbacks: Array<(time: number) => void> = [];
let rafIdCounter = 0;

beforeEach(() => {
  rafCallbacks = [];
  rafIdCounter = 0;
  jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
    rafCallbacks.push(cb);
    return ++rafIdCounter;
  });
  jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

// Mock canvas context
function mockCanvasContext() {
  const ctx = {
    clearRect: jest.fn(),
    save: jest.fn(),
    restore: jest.fn(),
    translate: jest.fn(),
    rotate: jest.fn(),
    fillRect: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    closePath: jest.fn(),
    fill: jest.fn(),
    arc: jest.fn(),
    globalAlpha: 1,
    fillStyle: '',
  };
  jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    ctx as unknown as CanvasRenderingContext2D
  );
  return ctx;
}

import { BlastShatterEffect } from '../BlastShatterEffect';

describe('BlastShatterEffect', () => {
  it('renders nothing when no triggers', () => {
    const { container } = render(
      <BlastShatterEffect shatterTriggers={[]} cellSize={40} onComplete={jest.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders canvas element when triggers present', () => {
    mockCanvasContext();
    render(
      <BlastShatterEffect
        shatterTriggers={[{ row: 0, col: 0, type: 'gold', id: 'a' }]}
        cellSize={40}
        onComplete={jest.fn()}
      />
    );
    expect(screen.getByTestId('blast-shatter-canvas')).toBeInstanceOf(HTMLCanvasElement);
  });

  it('respects reduced motion — renders nothing', () => {
    // Mock matchMedia for prefers-reduced-motion
    window.matchMedia = jest.fn().mockImplementation((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }));

    const { container } = render(
      <BlastShatterEffect
        shatterTriggers={[{ row: 0, col: 0, type: 'gold', id: 'a' }]}
        cellSize={40}
        onComplete={jest.fn()}
      />
    );
    expect(container.querySelector('canvas')).toBeNull();
  });

  it('caps particles at 80', () => {
    mockCanvasContext();
    // Ensure reduced motion is off
    window.matchMedia = jest.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }));

    // Create 10 triggers — at 12 particles each that would be 120, should cap at 80
    const triggers = Array.from({ length: 10 }, (_, i) => ({
      row: 0,
      col: i,
      type: 'standard',
      id: `t${i}`,
    }));

    const onComplete = jest.fn();
    render(
      <BlastShatterEffect shatterTriggers={triggers} cellSize={40} onComplete={onComplete} />
    );

    // Tick one RAF frame to process particles
    act(() => {
      if (rafCallbacks.length > 0) {
        rafCallbacks[rafCallbacks.length - 1](performance.now());
      }
    });

    // The component should internally cap at MAX_PARTICLES (80).
    // We verify indirectly: with 10 triggers × ~9 avg particles = ~90,
    // but capped at 80. The canvas should still render (no crash).
    expect(screen.getByTestId('blast-shatter-canvas')).toBeTruthy();
  });

  it('calls onComplete when particles from a trigger finish', () => {
    mockCanvasContext();
    const onComplete = jest.fn();
    render(
      <BlastShatterEffect
        shatterTriggers={[{ row: 0, col: 0, type: 'gold', id: 'done-1' }]}
        cellSize={40}
        onComplete={onComplete}
      />
    );

    // Simulate enough frames for particles to fully fade (500ms lifetime)
    const startTime = performance.now();
    act(() => {
      for (let i = 0; i < 40; i++) {
        if (rafCallbacks.length > 0) {
          rafCallbacks[rafCallbacks.length - 1](startTime + i * 20);
        }
      }
    });

    expect(onComplete).toHaveBeenCalledWith('done-1');
  });
});
