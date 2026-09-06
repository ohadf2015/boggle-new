/**
 * ClassReportSection — the word x student report under the free
 * "Last class game" card. Every string goes through t(), so tests see raw keys.
 */
import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ClassReportSection } from '../ClassReportSection';
import type { RecentClassroomGame, LastGamePlayer } from '@/lib/supabase/analyticsLastGame';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));

function player(
  studentId: string,
  name: string,
  found: string[],
  missed: string[],
  score = 100
): LastGamePlayer {
  const total = found.length + missed.length;
  return {
    studentId,
    name,
    score,
    lessonWordsFound: found,
    lessonWordsMissed: missed,
    accuracyPct: total > 0 ? Math.round((found.length / total) * 100) : 0,
  };
}

function game(over: Partial<RecentClassroomGame> = {}): RecentClassroomGame {
  return {
    gameCode: 'G2',
    gameMode: 'classic',
    playedAt: '2026-09-04T10:00:00Z',
    lessonIds: ['lesson-1'],
    players: [
      player('s1', 'Alice', ['cat', 'dog'], ['fox'], 120),
      player('s2', 'Bob', ['cat'], ['dog', 'fox'], 60),
    ],
    missedWords: [
      { word: 'fox', missedBy: 2, total: 2, pct: 100 },
      { word: 'dog', missedBy: 1, total: 2, pct: 50 },
      { word: 'cat', missedBy: 0, total: 2, pct: 0 },
    ],
    totalLessonWords: 3,
    wordsNobodyFound: ['fox'],
    coveragePct: 67,
    averageAccuracyPct: 50,
    participation: { played: 2, roster: 3 },
    absentStudents: [],
    ...over,
  };
}

const olderGame = game({
  gameCode: 'G1',
  playedAt: '2026-09-01T10:00:00Z',
  missedWords: [
    { word: 'fox', missedBy: 2, total: 2, pct: 100 },
    { word: 'dog', missedBy: 2, total: 2, pct: 100 },
    { word: 'cat', missedBy: 2, total: 2, pct: 100 },
  ],
});

beforeEach(() => {
  vi.clearAllMocks();
});

// ============================================
// GRID
// ============================================

describe('ClassReportSection — word x student grid', () => {
  it('renders one row per lesson word, worst-missed first', () => {
    render(<ClassReportSection game={game()} games={[game()]} />);

    const rows = screen.getAllByTestId('report-row');
    expect(rows.map((r) => r.getAttribute('data-word'))).toEqual(['fox', 'dog', 'cat']);
  });

  it('renders one column per student, including students who did not play', () => {
    render(
      <ClassReportSection
        game={game({ absentStudents: [{ studentId: 's3', name: 'Cleo' }] })}
        games={[game()]}
      />
    );

    const headers = screen.getAllByTestId('report-student-header');
    expect(headers.map((h) => h.textContent)).toEqual(
      expect.arrayContaining([expect.stringContaining('Alice'), expect.stringContaining('Cleo')])
    );
  });

  it('gives every cell a symbol, not colour alone', () => {
    render(<ClassReportSection game={game()} games={[game()]} />);

    const dogRow = screen.getAllByTestId('report-row').find((r) => r.dataset.word === 'dog')!;
    const cells = within(dogRow).getAllByTestId('report-cell');
    expect(cells.map((c) => c.dataset.state)).toEqual(['found', 'missed']);
    for (const cell of cells) expect(cell.textContent?.trim()).not.toBe('');
    expect(cells[0].textContent).not.toBe(cells[1].textContent);
  });

  it('gives every cell an accessible name naming the student, the word and the state', () => {
    render(<ClassReportSection game={game()} games={[game()]} />);

    const dogRow = screen.getAllByTestId('report-row').find((r) => r.dataset.word === 'dog')!;
    const label = within(dogRow).getAllByTestId('report-cell')[1].getAttribute('aria-label') ?? '';
    expect(label).toContain('Bob');
    expect(label).toContain('dog');
  });

  it('shows the class miss % on each row and the accuracy on each column', () => {
    render(<ClassReportSection game={game()} games={[game()]} />);

    const dogRow = screen.getAllByTestId('report-row').find((r) => r.dataset.word === 'dog')!;
    expect(within(dogRow).getByTestId('report-row-total')).toHaveTextContent('50%');
    expect(screen.getAllByTestId('report-column-total').map((c) => c.textContent)).toEqual([
      '67%',
      '33%',
    ]);
  });

  it('scrolls the grid inside its own container, never the page', () => {
    render(<ClassReportSection game={game()} games={[game()]} />);

    const scroller = screen.getByTestId('report-grid-scroll');
    expect(scroller.className).toContain('overflow-x-auto');
    expect(scroller.className).toContain('print:overflow-visible');
  });

  it('uses logical inline classes so the frozen word column flips under RTL', () => {
    render(<ClassReportSection game={game()} games={[game()]} />);

    const wordHeader = screen.getAllByTestId('report-row')[0].querySelector('th')!;
    expect(wordHeader.className).toContain('start-0');
    expect(wordHeader.className).not.toMatch(/\bleft-0\b/);
  });

  it('says a quiz report can include words the quiz never asked', () => {
    render(<ClassReportSection game={game({ gameMode: 'vocab-quiz' })} games={[game()]} />);

    expect(screen.getByTestId('report-quiz-caveat')).toBeInTheDocument();
  });

  it('omits that caveat for a board game', () => {
    render(<ClassReportSection game={game()} games={[game()]} />);

    expect(screen.queryByTestId('report-quiz-caveat')).not.toBeInTheDocument();
  });

  it('shows an empty state with a next action when nobody played', () => {
    render(
      <ClassReportSection
        game={game({ players: [], missedWords: [], absentStudents: [] })}
        games={[]}
      />
    );

    expect(screen.getByTestId('report-empty')).toBeInTheDocument();
  });
});

// ============================================
// TREND
// ============================================

describe('ClassReportSection — class-wide trend', () => {
  it('tells the teacher to play again when only one game exists', () => {
    render(<ClassReportSection game={game()} games={[game()]} />);

    expect(screen.getByTestId('report-trend-empty')).toBeInTheDocument();
    expect(screen.queryByTestId('report-trend-word')).not.toBeInTheDocument();
  });

  it('draws a bar per game per word once two games exist', () => {
    render(<ClassReportSection game={game()} games={[game(), olderGame]} />);

    const words = screen.getAllByTestId('report-trend-word');
    expect(words.length).toBeGreaterThan(0);
    expect(within(words[0]).getAllByTestId('report-trend-bar')).toHaveLength(2);
  });

  it('marks an improving word as improved and a flat word as unchanged', () => {
    render(<ClassReportSection game={game()} games={[game(), olderGame]} />);

    const cat = screen.getAllByTestId('report-trend-word').find((w) => w.dataset.word === 'cat')!;
    expect(cat.dataset.direction).toBe('improved');
    const fox = screen.getAllByTestId('report-trend-word').find((w) => w.dataset.word === 'fox')!;
    expect(fox.dataset.direction).toBe('flat');
  });
});

// ============================================
// DRILL-DOWN
// ============================================

describe('ClassReportSection — student drill-down', () => {
  it('opens a panel with that student\'s missed words when the column is clicked', () => {
    render(<ClassReportSection game={game()} games={[game()]} />);

    fireEvent.click(screen.getAllByTestId('report-student-header')[1]);

    const panel = screen.getByTestId('report-drilldown');
    expect(panel).toHaveTextContent('Bob');
    expect(within(panel).getAllByTestId('drilldown-word').map((w) => w.textContent)).toEqual([
      'fox',
      'dog',
    ]);
  });

  it('names a suggested practice type for the drill', () => {
    render(<ClassReportSection game={game()} games={[game()]} />);

    fireEvent.click(screen.getAllByTestId('report-student-header')[1]);

    expect(screen.getByTestId('drilldown-practice')).toHaveTextContent(
      'teacher.classReport.practice.flashcard'
    );
  });

  it('hands that student\'s words to the practice-assignment path', () => {
    const onCreateReviewLesson = vi.fn();
    render(
      <ClassReportSection game={game()} games={[game()]} onCreateReviewLesson={onCreateReviewLesson} />
    );

    fireEvent.click(screen.getAllByTestId('report-student-header')[1]);
    fireEvent.click(screen.getByTestId('drilldown-assign'));

    expect(onCreateReviewLesson).toHaveBeenCalledWith(['fox', 'dog']);
  });

  it('offers catching an absent student up instead of a drill', () => {
    render(
      <ClassReportSection
        game={game({ absentStudents: [{ studentId: 's3', name: 'Cleo' }] })}
        games={[game()]}
      />
    );

    fireEvent.click(screen.getAllByTestId('report-student-header')[2]);

    expect(screen.getByTestId('drilldown-practice')).toHaveTextContent(
      'teacher.classReport.practice.absent'
    );
    expect(screen.queryByTestId('drilldown-assign')).not.toBeInTheDocument();
  });

  it('closes the panel again', () => {
    render(<ClassReportSection game={game()} games={[game()]} />);

    fireEvent.click(screen.getAllByTestId('report-student-header')[1]);
    fireEvent.click(screen.getByTestId('drilldown-close'));

    expect(screen.queryByTestId('report-drilldown')).not.toBeInTheDocument();
  });
});

// ============================================
// COPY / PRINT
// ============================================

describe('ClassReportSection — copy and print', () => {
  it('copies a plain-text summary to the clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

    render(<ClassReportSection game={game()} games={[game()]} />);
    fireEvent.click(screen.getByTestId('report-copy'));

    expect(writeText).toHaveBeenCalledTimes(1);
    const text = writeText.mock.calls[0][0] as string;
    expect(text).toContain('fox');
    expect(text).toContain('Bob');
    expect(text.indexOf('fox')).toBeLessThan(text.indexOf('dog'));
  });

  it('does not throw when the browser has no clipboard', () => {
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });

    render(<ClassReportSection game={game()} games={[game()]} />);

    expect(() => fireEvent.click(screen.getByTestId('report-copy'))).not.toThrow();
    expect(screen.getByTestId('report-copy-fallback')).toBeInTheDocument();
  });

  it('offers a print action for the grid', () => {
    render(<ClassReportSection game={game()} games={[game()]} />);

    expect(screen.getByTestId('report-print')).toBeInTheDocument();
  });

  it('prints the report alone, not the whole dashboard around it', () => {
    // The report is mounted deep inside the teacher dashboard, so a bare
    // window.print() would carry the nav, the tabs and the Pro section onto
    // the page. The print rules must hide everything outside this section.
    render(<ClassReportSection game={game()} games={[game()]} />);

    const section = screen.getByTestId('class-report');
    expect(section).toHaveAttribute('data-print-root');

    const style = document.querySelector('style[data-class-report-print]');
    expect(style).not.toBeNull();
    const css = style?.textContent ?? '';
    expect(css).toContain('@media print');
    expect(css).toContain('[data-print-root]');
    // `visibility` keeps table layout intact where `display: none` would not.
    expect(css).toContain('visibility');
  });

  it('calls window.print when the print button is pressed', () => {
    const print = vi.fn();
    Object.defineProperty(window, 'print', { value: print, configurable: true });

    render(<ClassReportSection game={game()} games={[game()]} />);
    fireEvent.click(screen.getByTestId('report-print'));

    expect(print).toHaveBeenCalledTimes(1);
  });
});
