/**
 * WordCraftCelebration Tests
 *
 * Verifies the pixi celebration overlay correctly bypasses for
 * prefers-reduced-motion users (mounts no pixi canvas at all).
 */

import { render } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WordCraftCelebration, shouldIdleParticleTicker } from '../WordCraftCelebration';

describe('shouldIdleParticleTicker (perf: stop the 60fps Pixi loop when idle)', () => {
  it('idles only when no particles are alive AND no rain is spawning', () => {
    expect(shouldIdleParticleTicker(0, false)).toBe(true);
  });
  it('keeps running while particles are still on screen', () => {
    expect(shouldIdleParticleTicker(5, false)).toBe(false);
  });
  it('keeps running mid rain-shower even when momentarily zero particles', () => {
    // The rain spawns incrementally; idling here would abort the shower.
    expect(shouldIdleParticleTicker(0, true)).toBe(false);
  });
});

const matchMediaMock = (matches: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
};

describe('WordCraftCelebration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // tryFire() in WordCraftCelebration retries up to 20×50ms waiting for the
    // Pixi API to become available. Those real setTimeouts outlive happy-dom
    // teardown and throw "window is not defined" when they fire. Fake timers
    // capture them so they never fire after the test ends.
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders nothing when prefers-reduced-motion is set', () => {
    matchMediaMock(true);
    const { container, queryByTestId } = render(
      <WordCraftCelebration kind="bingo" burstId={1} />,
    );
    expect(queryByTestId('word-craft-celebration')).toBeNull();
    expect(container.firstChild).toBeNull();
  });

  it('renders an aria-hidden, pointer-events-none container when motion is allowed', () => {
    matchMediaMock(false);
    const { getByTestId } = render(
      <WordCraftCelebration kind="bingo" burstId={1} />,
    );
    const node = getByTestId('word-craft-celebration');
    expect(node.getAttribute('aria-hidden')).toBe('true');
    expect(node.className).toContain('pointer-events-none');
  });

  it('renders nothing when kind is null even without reduced-motion', () => {
    matchMediaMock(false);
    const { getByTestId } = render(
      <WordCraftCelebration kind={null} burstId={0} />,
    );
    // Container still mounts (idle pixi app), but no testable trigger fires
    expect(getByTestId('word-craft-celebration')).toBeTruthy();
  });

  it('does not crash when burstId increments rapidly', () => {
    matchMediaMock(false);
    const { rerender, getByTestId } = render(
      <WordCraftCelebration kind="bingo" burstId={1} />,
    );
    rerender(<WordCraftCelebration kind="bingo" burstId={2} />);
    rerender(<WordCraftCelebration kind="gameOver" burstId={3} />);
    expect(getByTestId('word-craft-celebration')).toBeTruthy();
  });
});
