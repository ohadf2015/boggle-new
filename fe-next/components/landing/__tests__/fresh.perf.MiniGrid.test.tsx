/**
 * Piece D (perf): MiniGrid (the self-tracing FTUE board) and QuickStartStep
 * drop framer-motion for CSS keyframes. Every consumer test mocks MiniGrid, so
 * this file is the only guard on the real board's behaviour: the auto-trace
 * schedule, drag tracing, the start hint and the reset on a new word.
 */
import React from 'react';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { render, screen, fireEvent, act } from '@testing-library/react';
import MiniGrid from '@/components/onboarding/MiniGrid';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en', dir: 'ltr' }),
}));

const ONBOARDING = path.resolve(__dirname, '..', '..', 'onboarding');
const LETTERS = [
  ['C', 'A', 'T'],
  ['X', 'Y', 'Z'],
  ['Q', 'R', 'S'],
];
const PATH = [
  { row: 0, col: 0 },
  { row: 0, col: 1 },
  { row: 0, col: 2 },
];

// happy-dom has no layout: give the board a 300px box so hit-testing works.
// gap 8 → cell (300-16)/3 ≈ 94.7, stride ≈ 102.7.
function cellCenter(row: number, col: number) {
  const cell = (300 - 16) / 3;
  return { clientX: col * (cell + 8) + cell / 2, clientY: row * (cell + 8) + cell / 2 };
}

function mockBoardRect() {
  const board = screen.getByTestId('mini-grid-board');
  board.getBoundingClientRect = () =>
    ({ left: 0, top: 0, right: 300, bottom: 300, width: 300, height: 300, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
  return board;
}

const selectedCount = () =>
  screen.getAllByTestId(/^mini-grid-cell-/).filter((c) => c.getAttribute('data-selected') === 'true').length;

describe('MiniGrid without framer-motion', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('shouldNotImportFramerMotionInTheFtueBoardOrQuickStart', () => {
    const files = ['MiniGrid.tsx', 'MiniGridCell.tsx', 'MiniGridWordBar.tsx', 'QuickStartStep.tsx']
      .map((f) => path.join(ONBOARDING, f))
      .filter((f) => existsSync(f));
    expect(files.length).toBe(4);
    for (const f of files) {
      expect(readFileSync(f, 'utf8'), path.basename(f)).not.toMatch(/from ['"](framer-motion|motion\/react)['"]/);
    }
  });

  it('shouldGateEveryKeyframeBehindReducedMotion', () => {
    const css = readFileSync(path.join(ONBOARDING, 'MiniGrid.module.css'), 'utf8');
    expect(css).toContain('@media (prefers-reduced-motion: no-preference)');
    // No animation declared outside the no-preference block.
    const outside = css.split('@media (prefers-reduced-motion: no-preference)')[0];
    expect(outside).not.toMatch(/animation\s*:/);
  });

  it('shouldShowEveryLetterAtRest', () => {
    render(<MiniGrid size={3} letters={LETTERS} demoWord="CAT" demoPath={PATH} onDemoComplete={() => {}} />);
    expect(screen.getAllByTestId(/^mini-grid-cell-/)).toHaveLength(9);
    expect(screen.getByTestId('mini-grid-cell-1-1')).toHaveTextContent('Y');
    expect(screen.getByTestId('mini-grid-word-bar')).toBeInTheDocument();
    expect(screen.getByTestId('mini-grid-count')).toHaveTextContent('0/3');
  });

  it('shouldAutoTraceOnTheOriginalScheduleThenHandOff', () => {
    // GIVEN an auto-tracing board
    const onAutoTraceComplete = vi.fn();
    render(
      <MiniGrid
        size={3}
        letters={LETTERS}
        demoWord="CAT"
        demoPath={PATH}
        autoTrace
        onAutoTraceComplete={onAutoTraceComplete}
        onDemoComplete={() => {}}
      />
    );
    expect(selectedCount()).toBe(0);
    // WHEN the schedule runs (600 + i*450)
    act(() => vi.advanceTimersByTime(600));
    expect(selectedCount()).toBe(1);
    expect(screen.getByTestId('mini-grid-letter-0').getAttribute('data-filled')).toBe('true');
    act(() => vi.advanceTimersByTime(450));
    expect(selectedCount()).toBe(2);
    expect(screen.getByTestId('mini-grid-path')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(450));
    expect(selectedCount()).toBe(3);
    expect(screen.getByTestId('mini-grid-count')).toHaveTextContent('3/3');
    // THEN at 600 + len*450 + 800 (= 2750ms) it clears and hands off
    act(() => vi.advanceTimersByTime(1249));
    expect(selectedCount()).toBe(3);
    expect(onAutoTraceComplete).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(selectedCount()).toBe(0);
    expect(onAutoTraceComplete).toHaveBeenCalledTimes(1);
  });

  it('shouldStillAutoTraceUnderStrictModeDoubleEffects', () => {
    // Dev renders in StrictMode: effects mount, clean up, and mount again. The
    // trace must survive that (the cleanup clears the first timer set).
    render(
      <React.StrictMode>
        <MiniGrid size={3} letters={LETTERS} demoWord="CAT" demoPath={PATH} autoTrace onDemoComplete={() => {}} />
      </React.StrictMode>
    );
    act(() => vi.advanceTimersByTime(1500));
    expect(selectedCount()).toBe(3);
  });

  it('shouldCompleteADragTraceAndReportAfter1200ms', () => {
    const onDemoComplete = vi.fn();
    render(<MiniGrid size={3} letters={LETTERS} demoWord="CAT" demoPath={PATH} onDemoComplete={onDemoComplete} />);
    const board = mockBoardRect();
    fireEvent.mouseDown(board, cellCenter(0, 0));
    fireEvent.mouseMove(board, cellCenter(0, 1));
    fireEvent.mouseMove(board, cellCenter(0, 2));
    fireEvent.mouseUp(board);
    expect(selectedCount()).toBe(3);
    expect(screen.getByTestId('mini-grid-success')).toBeInTheDocument();
    expect(onDemoComplete).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1200));
    expect(onDemoComplete).toHaveBeenCalledTimes(1);
  });

  it('shouldIgnoreACellThatIsNotTheNextStep', () => {
    render(<MiniGrid size={3} letters={LETTERS} demoWord="CAT" demoPath={PATH} onDemoComplete={() => {}} />);
    const board = mockBoardRect();
    fireEvent.mouseDown(board, cellCenter(2, 2));
    expect(selectedCount()).toBe(0);
    fireEvent.mouseMove(board, cellCenter(0, 0));
    expect(selectedCount()).toBe(1);
    fireEvent.mouseMove(board, cellCenter(1, 1));
    expect(selectedCount()).toBe(1);
  });

  it('shouldShowTheStartHintAfter2sWhenNotAutoTracing', () => {
    render(<MiniGrid size={3} letters={LETTERS} demoWord="CAT" demoPath={PATH} onDemoComplete={() => {}} />);
    expect(screen.queryByText('onboarding.welcome.startHere')).toBeNull();
    // The next expected cell is marked as the hint straight away.
    expect(screen.getByTestId('mini-grid-cell-0-0').getAttribute('data-hint')).toBe('true');
    act(() => vi.advanceTimersByTime(2000));
    expect(screen.getByText('onboarding.welcome.startHere')).toBeInTheDocument();
  });

  it('shouldResetWhenTheTargetWordChanges', () => {
    const { rerender } = render(
      <MiniGrid size={3} letters={LETTERS} demoWord="CAT" demoPath={PATH} onDemoComplete={() => {}} />
    );
    const board = mockBoardRect();
    fireEvent.mouseDown(board, cellCenter(0, 0));
    expect(selectedCount()).toBe(1);
    rerender(
      <MiniGrid
        size={3}
        letters={LETTERS}
        demoWord="XYZ"
        demoPath={[{ row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 }]}
        onDemoComplete={() => {}}
      />
    );
    expect(selectedCount()).toBe(0);
    expect(screen.getByTestId('mini-grid-letter-0')).toHaveTextContent('X');
  });
});
