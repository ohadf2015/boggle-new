import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WordTowerWheel } from '../WordTowerWheel';

/**
 * Rage-click regression (PostHog: single letters "T"/"L"/"V" hammered on
 * /en/word-tower and /en/word-craft). A tap carries a few pixels of finger drift.
 * The drag handler used to take that first pointermove, resolve a letter under
 * the pointer and claim pointer capture — which retargets the following click
 * from the button to the container, so the tap silently does nothing and the
 * player taps again. `onMove` now ignores movement below 8px.
 *
 * The gate can only be observed if `document.elementFromPoint` resolves a letter
 * button; jsdom always returns null, which is why a version of this file passed
 * identically with and without the fix. We stub it here so the drag path can
 * actually engage.
 */
describe('WordTowerWheel — a tap with finger drift keeps its click', () => {
  let captured: HTMLElement | null = null;
  const realElementFromPoint = document.elementFromPoint;

  beforeEach(() => {
    captured = null;
    HTMLElement.prototype.setPointerCapture = vi.fn(function (this: HTMLElement) {
      captured = this;
    });
    HTMLElement.prototype.releasePointerCapture = vi.fn();
  });

  afterEach(() => {
    document.elementFromPoint = realElementFromPoint;
    vi.restoreAllMocks();
  });

  function renderWheel() {
    const onSelectTile = vi.fn();
    render(
      <WordTowerWheel
        tray={['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']}
        selected={[]}
        word=""
        placing={false}
        canBuild={false}
        intensity={0.5}
        accentHex="#00ff00"
        dir="ltr"
        t={(key) => key}
        onSelectTile={onSelectTile}
        onSubmit={vi.fn()}
        onDrop={vi.fn()}
      />,
    );
    const container = screen.getByRole('group');
    const letters = Array.from(container.querySelectorAll<HTMLElement>('button[data-wheel-letter]'));
    // Tiles are small, so a few pixels of drift crosses into the NEXT tile —
    // that is precisely what used to engage the drag and eat the tap. x<102 is
    // the tile the finger went down on, anything further is its neighbour.
    document.elementFromPoint = ((x: number) => (x < 102 ? letters[0] : letters[1])) as typeof document.elementFromPoint;
    return { container, letters, onSelectTile };
  }

  it('does not claim pointer capture for drift below the threshold, so the click still fires', () => {
    const { container, letters, onSelectTile } = renderWheel();

    fireEvent.pointerDown(letters[0], { pointerType: 'touch', clientX: 100, clientY: 100, pointerId: 1, isPrimary: true });
    // 5px of drift — a tap, not a drag.
    fireEvent.pointerMove(container, { pointerType: 'touch', clientX: 103, clientY: 104, pointerId: 1 });
    fireEvent.pointerUp(container, { pointerType: 'touch', pointerId: 1 });
    fireEvent.click(letters[0]);

    expect(captured).toBeNull();
    expect(onSelectTile).toHaveBeenCalledWith(0);
  });

  it('still claims capture for a real drag past the threshold', () => {
    const { container, letters } = renderWheel();

    fireEvent.pointerDown(letters[0], { pointerType: 'touch', clientX: 100, clientY: 100, pointerId: 1, isPrimary: true });
    // 30px — an intentional sweep across the wheel.
    fireEvent.pointerMove(container, { pointerType: 'touch', clientX: 130, clientY: 100, pointerId: 1 });

    expect(captured).not.toBeNull();
  });
});
