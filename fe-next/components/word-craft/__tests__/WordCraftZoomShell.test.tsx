import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { WordCraftZoomShell } from '../WordCraftZoomShell';
import { ZOOM_FEEL } from '@/lib/word-craft/zoomFeel';

function pointerDown(target: Element, pointerId: number, x: number, y: number, pointerType = 'touch') {
  fireEvent.pointerDown(target, {
    pointerId,
    clientX: x,
    clientY: y,
    pointerType,
  });
}
function pointerMove(target: Element, pointerId: number, x: number, y: number, pointerType = 'touch') {
  fireEvent.pointerMove(target, {
    pointerId,
    clientX: x,
    clientY: y,
    pointerType,
  });
}
function pointerUp(target: Element, pointerId: number, x: number, y: number, pointerType = 'touch') {
  fireEvent.pointerUp(target, {
    pointerId,
    clientX: x,
    clientY: y,
    pointerType,
  });
}

describe('WordCraftZoomShell', () => {
  it('renders children at 1x by default with no reset button visible', () => {
    render(
      <WordCraftZoomShell>
        <div data-testid="board">child</div>
      </WordCraftZoomShell>,
    );
    expect(screen.getByTestId('board')).toBeInTheDocument();
    expect(screen.queryByLabelText('Reset zoom')).not.toBeInTheDocument();
  });

  it('shows the reset button after a double-tap zoom', () => {
    render(
      <WordCraftZoomShell>
        <div data-testid="board">child</div>
      </WordCraftZoomShell>,
    );
    const region = screen.getByRole('region');
    // Two pointerdowns within the double-tap window with one finger on touch
    // pointer type. Each starts and ends on its own.
    pointerDown(region, 1, 100, 100);
    pointerUp(region, 1, 100, 100);
    pointerDown(region, 2, 100, 100);
    expect(screen.getByLabelText('Reset zoom')).toBeInTheDocument();
  });

  it('returns to 1x when reset button is clicked', () => {
    render(
      <WordCraftZoomShell>
        <div data-testid="board">child</div>
      </WordCraftZoomShell>,
    );
    const region = screen.getByRole('region');
    pointerDown(region, 1, 100, 100);
    pointerUp(region, 1, 100, 100);
    pointerDown(region, 2, 100, 100);
    fireEvent.click(screen.getByLabelText('Reset zoom'));
    expect(screen.queryByLabelText('Reset zoom')).not.toBeInTheDocument();
  });

  it('two-finger pinch increases scale beyond 1x', () => {
    render(
      <WordCraftZoomShell>
        <div data-testid="board">child</div>
      </WordCraftZoomShell>,
    );
    const region = screen.getByRole('region');
    // Two fingers start 100px apart
    pointerDown(region, 10, 100, 200, 'touch');
    pointerDown(region, 11, 200, 200, 'touch');
    // Spread to 200px apart — 2x ratio
    act(() => {
      pointerMove(region, 10, 50, 200, 'touch');
      pointerMove(region, 11, 250, 200, 'touch');
    });
    const reset = screen.queryByLabelText('Reset zoom');
    expect(reset).toBeInTheDocument();
    expect(reset?.textContent).toMatch(/×/); // scale chip rendered
  });

  it('swallows the click that follows a single-finger pan so it does not place a tile', () => {
    const onChildClick = vi.fn();
    render(
      <WordCraftZoomShell>
        <button type="button" data-testid="cell" onClick={onChildClick}>
          cell
        </button>
      </WordCraftZoomShell>,
    );
    const region = screen.getByRole('region');
    const cell = screen.getByTestId('cell');

    // Engage zoom via double-tap so single-finger pan is enabled. Release
    // the second tap pointer too so the next pointerdown counts as a fresh
    // single finger (otherwise the shell would treat it as the second
    // pinch pointer).
    pointerDown(region, 1, 100, 100);
    pointerUp(region, 1, 100, 100);
    pointerDown(region, 2, 100, 100);
    pointerUp(region, 2, 100, 100);

    // Now pan with one finger: pointerdown + pointermove with movementX/Y so
    // the shell registers actual displacement, then pointerup.
    act(() => {
      pointerDown(region, 3, 100, 100, 'touch');
      fireEvent.pointerMove(region, {
        pointerId: 3,
        clientX: 130,
        clientY: 110,
        pointerType: 'touch',
        movementX: 30,
        movementY: 10,
      });
      pointerUp(region, 3, 130, 110, 'touch');
    });

    // Synthetic click on the child cell — must be swallowed by the
    // capture-phase blocker installed on the wrapper.
    fireEvent.click(cell);
    expect(onChildClick).not.toHaveBeenCalled();

    // A *second* click (later) must work again — the blocker is one-shot.
    fireEvent.click(cell);
    expect(onChildClick).toHaveBeenCalledTimes(1);
  });

  it('auto-zooms in when focusCells are supplied (active-play-follows)', () => {
    render(
      <WordCraftZoomShell focusCells={[{ row: 5, col: 5 }]} boardSize={11}>
        <div data-testid="board">child</div>
      </WordCraftZoomShell>,
    );
    // A single focus cell on an 11×11 board is a tiny box → scale climbs
    // toward MAX, which surfaces the reset button.
    expect(screen.getByLabelText('Reset zoom')).toBeInTheDocument();
  });

  it('auto-zoom eases back to 1x when focusCells become empty (turn end)', () => {
    const { rerender } = render(
      <WordCraftZoomShell focusCells={[{ row: 5, col: 5 }]} boardSize={11}>
        <div data-testid="board">child</div>
      </WordCraftZoomShell>,
    );
    expect(screen.getByLabelText('Reset zoom')).toBeInTheDocument();
    rerender(
      <WordCraftZoomShell focusCells={[]} boardSize={11}>
        <div data-testid="board">child</div>
      </WordCraftZoomShell>,
    );
    expect(screen.queryByLabelText('Reset zoom')).not.toBeInTheDocument();
  });

  it('a manual pinch suppresses auto-zoom follow until the turn ends', () => {
    const { rerender } = render(
      <WordCraftZoomShell focusCells={[{ row: 5, col: 5 }]} boardSize={11}>
        <div data-testid="board">child</div>
      </WordCraftZoomShell>,
    );
    const region = screen.getByRole('region');
    // User pinches IN back toward 1× — a deliberate manual override.
    pointerDown(region, 30, 100, 200, 'touch');
    pointerDown(region, 31, 200, 200, 'touch');
    act(() => {
      pointerMove(region, 30, 140, 200, 'touch');
      pointerMove(region, 31, 160, 200, 'touch');
    });
    pointerUp(region, 30, 140, 200, 'touch');
    pointerUp(region, 31, 160, 200, 'touch');
    // Word extends — auto-zoom must NOT re-grab the view.
    rerender(
      <WordCraftZoomShell focusCells={[{ row: 5, col: 5 }, { row: 5, col: 6 }]} boardSize={11}>
        <div data-testid="board">child</div>
      </WordCraftZoomShell>,
    );
    expect(screen.queryByLabelText('Reset zoom')).not.toBeInTheDocument();
  });

  it('renders a vignette overlay that fades in only while zoomed', () => {
    render(
      <WordCraftZoomShell>
        <div data-testid="board">child</div>
      </WordCraftZoomShell>,
    );
    const region = screen.getByRole('region');
    const vignette = region.querySelector('[data-wc-vignette]');
    expect(vignette).not.toBeNull();
    // Hidden at 1×.
    expect(vignette!.className).toMatch(/opacity-0/);
    // Zoom in via double-tap → vignette fades in.
    act(() => {
      pointerDown(region, 1, 100, 100);
      pointerUp(region, 1, 100, 100);
      pointerDown(region, 2, 100, 100);
    });
    expect(vignette!.className).toMatch(/opacity-100/);
  });

  it('marks the board transitioning on a zoom change and clears it on transitionend', () => {
    render(
      <WordCraftZoomShell>
        <div data-testid="board">child</div>
      </WordCraftZoomShell>,
    );
    const region = screen.getByRole('region');
    const boardLayer = region.querySelector('[data-wc-board]') as HTMLElement;
    expect(boardLayer).not.toBeNull();
    expect(boardLayer.getAttribute('data-wc-transitioning')).toBe('false');
    act(() => {
      pointerDown(region, 1, 100, 100);
      pointerUp(region, 1, 100, 100);
      pointerDown(region, 2, 100, 100);
    });
    expect(boardLayer.getAttribute('data-wc-transitioning')).toBe('true');
    act(() => {
      fireEvent.transitionEnd(boardLayer);
    });
    expect(boardLayer.getAttribute('data-wc-transitioning')).toBe('false');
  });

  it('reduced motion: no blur filter is applied to the board while transitioning', () => {
    const original = window.matchMedia;
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('reduced-motion'),
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    try {
      render(
        <WordCraftZoomShell>
          <div data-testid="board">child</div>
        </WordCraftZoomShell>,
      );
      const region = screen.getByRole('region');
      const boardLayer = region.querySelector('[data-wc-board]') as HTMLElement;
      act(() => {
        pointerDown(region, 1, 100, 100);
        pointerUp(region, 1, 100, 100);
        pointerDown(region, 2, 100, 100);
      });
      expect(boardLayer.style.filter).not.toMatch(/blur/);
    } finally {
      window.matchMedia = original;
    }
  });

  it('clamps scale to MAX even with extreme spreads', () => {
    render(
      <WordCraftZoomShell>
        <div data-testid="board">child</div>
      </WordCraftZoomShell>,
    );
    const region = screen.getByRole('region');
    pointerDown(region, 20, 100, 200, 'touch');
    pointerDown(region, 21, 200, 200, 'touch');
    act(() => {
      // Wildly large spread — should clamp at the configured ceiling.
      pointerMove(region, 20, -2000, 200, 'touch');
      pointerMove(region, 21, 2000, 200, 'touch');
    });
    const reset = screen.queryByLabelText('Reset zoom');
    expect(reset).toBeInTheDocument();
    const text = reset?.textContent ?? '';
    const match = text.match(/(\d+(?:\.\d+)?)/);
    const num = match ? parseFloat(match[1]) : 0;
    // Pinch can never exceed ZOOM_FEEL.maxScale (lowered to gentle the zoom).
    expect(num).toBeCloseTo(ZOOM_FEEL.maxScale, 1);
  });
});
