import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('framer-motion', () => {
  const React = require('react');
  const createMotionComponent = (tag: string) =>
    React.forwardRef(function MotionComponent({ children, ...props }: any, ref: any) {
      return React.createElement(tag, { ref, ...props }, children);
    });
  const motion = new Proxy({} as Record<string, any>, {
    get: (_target, prop: string) => createMotionComponent(prop),
  });
  return {
    motion,
    m: motion,
    AnimatePresence: function AnimatePresence({ children }: any) {
      return <>{children}</>;
    },
  };
});

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string, fallback?: string) => fallback ?? key, dir: 'ltr' }),
}));

vi.mock('@/hooks/usePrefersReducedMotion', () => ({
  usePrefersReducedMotion: () => false,
}));

import BoardHandCoach, { resolveCoachPath } from './BoardHandCoach';
import { DIRECTIONS_TUTORIAL_STORAGE_KEY } from '@/lib/tutorial/directionsTutorialStore';

/** A stand-in for the real board: cells tagged the way GridComponent tags them. */
function makeGrid(rows = 4, cols = 4): HTMLDivElement {
  const el = document.createElement('div');
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = document.createElement('div');
      cell.dataset.row = String(r);
      cell.dataset.col = String(c);
      el.appendChild(cell);
    }
  }
  document.body.appendChild(el);
  return el;
}

describe('resolveCoachPath', () => {
  it('uses the real solved path when the board supplied one', () => {
    const path = [
      { row: 2, col: 1 },
      { row: 1, col: 2 },
      { row: 0, col: 3 },
    ];
    expect(resolveCoachPath(path, 4, 4)).toEqual(path);
  });

  // Deliberately NOT solved from the board. Reaching for findAllWords to pick a
  // real demo word would drag in the trie requirement (a depth-15 DFS without one
  // hangs in prod and in vitest) to teach a gesture that needs no valid word.
  it('falls back to a fixed adjacent path when the board has no suggestion', () => {
    expect(resolveCoachPath(null, 4, 4)).toEqual([
      { row: 0, col: 0 },
      { row: 1, col: 0 },
      { row: 0, col: 1 },
    ]);
  });

  it('includes a diagonal step, which is the thing new players miss', () => {
    const [, b, c] = resolveCoachPath(null, 4, 4);
    expect(Math.abs(b.row - c.row)).toBe(1);
    expect(Math.abs(b.col - c.col)).toBe(1);
  });

  it('falls back only when the single-cell path cannot be traced', () => {
    expect(resolveCoachPath([{ row: 0, col: 0 }], 4, 4)).toHaveLength(3);
  });

  it('returns nothing for a board too small to trace on', () => {
    expect(resolveCoachPath(null, 1, 1)).toEqual([]);
  });
});

describe('BoardHandCoach', () => {
  let gridEl: HTMLDivElement;

  beforeEach(() => {
    localStorage.clear();
    gridEl = makeGrid();
  });

  afterEach(() => {
    gridEl.remove();
  });

  it('shows the hand for a first-time player', () => {
    render(<BoardHandCoach gridEl={gridEl} rows={4} cols={4} enabled />);
    expect(screen.getByTestId('board-hand-coach')).toBeInTheDocument();
  });

  it('stays out of the way when disabled', () => {
    render(<BoardHandCoach gridEl={gridEl} rows={4} cols={4} enabled={false} />);
    expect(screen.queryByTestId('board-hand-coach')).not.toBeInTheDocument();
  });

  // The whole point: it demonstrates, it does not block. A player who ignores it
  // and starts dragging must reach the tiles underneath.
  it('never intercepts input meant for the board', () => {
    render(<BoardHandCoach gridEl={gridEl} rows={4} cols={4} enabled />);
    expect(screen.getByTestId('board-hand-coach').className).toContain('pointer-events-none');
  });

  // Same lesson as the player-style modal: persist at SHOW time, not dismiss
  // time, or a reload before dismissal re-pops it forever.
  it('records that it was seen the moment it appears, not when it ends', () => {
    render(<BoardHandCoach gridEl={gridEl} rows={4} cols={4} enabled />);
    expect(localStorage.getItem(DIRECTIONS_TUTORIAL_STORAGE_KEY)).toBeTruthy();
  });

  it('does not return on a later game', () => {
    const { unmount } = render(<BoardHandCoach gridEl={gridEl} rows={4} cols={4} enabled />);
    unmount();

    render(<BoardHandCoach gridEl={gridEl} rows={4} cols={4} enabled />);
    expect(screen.queryByTestId('board-hand-coach')).not.toBeInTheDocument();
  });

  it('gets out of the way as soon as the player touches the board', () => {
    render(<BoardHandCoach gridEl={gridEl} rows={4} cols={4} enabled />);
    expect(screen.getByTestId('board-hand-coach')).toBeInTheDocument();

    act(() => {
      gridEl.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    });

    expect(screen.queryByTestId('board-hand-coach')).not.toBeInTheDocument();
  });

  // A desktop player types instead of dragging and may never touch the board.
  it('gets out of the way when the player uses the keyboard instead', () => {
    render(<BoardHandCoach gridEl={gridEl} rows={4} cols={4} enabled />);
    expect(screen.getByTestId('board-hand-coach')).toBeInTheDocument();

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    });

    expect(screen.queryByTestId('board-hand-coach')).not.toBeInTheDocument();
  });

  // The whole failure this guards against: swapping a 10-second lockout for an
  // animation that never ends. A player who does NOTHING must still get a clean
  // board back. The framer-motion mock renders m.div as a plain div, so the
  // animation's own repeat count is invisible to tests — only the timer is
  // observable, which is exactly why the timer has to exist.
  it('leaves on its own when the player does nothing at all', () => {
    vi.useFakeTimers();
    try {
      render(<BoardHandCoach gridEl={gridEl} rows={4} cols={4} enabled />);
      expect(screen.getByTestId('board-hand-coach')).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(30_000);
      });

      expect(screen.queryByTestId('board-hand-coach')).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('renders nothing before the board element exists', () => {
    render(<BoardHandCoach gridEl={null} rows={4} cols={4} enabled />);
    expect(screen.queryByTestId('board-hand-coach')).not.toBeInTheDocument();
  });

  it('shows no stray hand on a board too small to trace a path on', () => {
    const tiny = makeGrid(1, 1);
    render(<BoardHandCoach gridEl={tiny} rows={1} cols={1} enabled />);
    expect(screen.queryByTestId('board-hand-coach')).not.toBeInTheDocument();
    tiny.remove();
  });
});
