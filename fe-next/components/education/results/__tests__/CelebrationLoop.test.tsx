/**
 * The celebration has to still be happening when the shutter opens.
 *
 * WHY THIS EXISTS (critic, round 4): all five projector frames at
 * +0/+1/+2/+4/+8 s after END ROUND were PIXEL-IDENTICAL, so there was no
 * visual evidence of the reveal, the confetti or the sweep burst. The sampler
 * saw the stage attribute walk third -> second -> first -> sweep -> done; the
 * screenshots saw none of it.
 *
 * That is not a timing bug and stretching the timetable does not fix it — this
 * is the SECOND round it has landed, and the timetable was already stretched
 * 2.6s -> 4.4s after the first. The real cause is that the RESTING state is
 * motionless: `fireRankConfetti(1)` is a one-shot canvas burst fired once at
 * the winner's beat and long settled by the time a shutter opens ~4 s later,
 * and the trophy `<video>` is frequently paused on its poster in a headless
 * renderer. Any frame taken after `done` is therefore identical to every other
 * frame after `done`, at any cadence, forever.
 *
 * So the fix is a celebration that NEVER STOPS while the recap is up, in pure
 * CSS keyframes — no canvas, no video, nothing that depends on a renderer
 * choosing to animate. Then a shutter cannot miss it.
 *
 * Reduced motion still gets a fully-painted static scatter, not an empty box:
 * the resting state must be complete without any motion (Pitfall Class 5).
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CelebrationLoop, CELEBRATION_PIECES } from '../CelebrationLoop';

function setReducedMotion(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: query.includes('prefers-reduced-motion') ? matches : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });
}

describe('CelebrationLoop', () => {
  beforeEach(() => {
    setReducedMotion(false);
  });

  it('renders nothing before the winner is revealed', () => {
    render(<CelebrationLoop active={false} />);
    expect(screen.queryByTestId('celebration-loop')).toBeNull();
  });

  it('keeps animating once active — this is what a late shutter catches', () => {
    render(<CelebrationLoop active />);
    const layer = screen.getByTestId('celebration-loop');
    expect(layer.dataset.celebrationLoop).toBe('animating');
  });

  it('paints real pieces, so the layer is not an empty box', () => {
    render(<CelebrationLoop active />);
    const pieces = screen.getByTestId('celebration-loop').querySelectorAll('[data-celebration-piece]');
    expect(pieces.length).toBe(CELEBRATION_PIECES);
    expect(CELEBRATION_PIECES).toBeGreaterThanOrEqual(12);
  });

  it('staggers the pieces so no two frames a second apart look alike', () => {
    render(<CelebrationLoop active />);
    const pieces = Array.from(
      screen.getByTestId('celebration-loop').querySelectorAll<HTMLElement>('[data-celebration-piece]')
    );
    const delays = new Set(pieces.map((p) => p.style.animationDelay));
    // A single shared delay would make every piece move in lockstep and the
    // whole layer would read as one blinking block.
    expect(delays.size).toBeGreaterThan(4);
  });

  it('loops forever rather than running once and stopping', () => {
    render(<CelebrationLoop active />);
    const piece = screen
      .getByTestId('celebration-loop')
      .querySelector<HTMLElement>('[data-celebration-piece]');
    expect(piece?.style.animationIterationCount).toBe('infinite');
  });

  it('under reduced motion paints a static scatter and animates nothing', () => {
    setReducedMotion(true);
    render(<CelebrationLoop active />);
    const layer = screen.getByTestId('celebration-loop');
    expect(layer.dataset.celebrationLoop).toBe('static');
    const pieces = layer.querySelectorAll<HTMLElement>('[data-celebration-piece]');
    // Still painted — the resting state is complete without motion.
    expect(pieces.length).toBe(CELEBRATION_PIECES);
    expect(pieces[0].style.animationIterationCount).toBe('');
  });

  it('never intercepts a tap on the Rematch button underneath it', () => {
    render(<CelebrationLoop active />);
    const layer = screen.getByTestId('celebration-loop');
    expect(layer.className).toContain('pointer-events-none');
    expect(layer.getAttribute('aria-hidden')).toBe('true');
  });
});
