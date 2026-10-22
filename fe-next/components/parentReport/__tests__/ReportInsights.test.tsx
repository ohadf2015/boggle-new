import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { ReportInsights } from '../ReportInsights';
import { buildStudentInsights } from '@/lib/education/studentInsights';
import { translateKey } from '@/lib/i18n/serverTranslate';
import { interpolate } from '@/components/education/lobby/eduText';

const NOW = new Date('2026-10-21T12:00:00Z');
const tFor = (locale: string) => (key: string, params?: Record<string, string | number>) =>
  interpolate(translateKey(key, locale), params);

const rich = buildStudentInsights({
  progressRows: [
    {
      total_xp: 300,
      words_mastered: ['tree', 'rain'],
      words_attempted: {
        tree: { correct: 3, attempts: 3, lastAttemptAt: '2026-10-19T00:00:00Z' },
        sun: { correct: 0, attempts: 4 },
        moon: { correct: 1, attempts: 3 },
      },
      completed_at: '2026-10-01T00:00:00Z',
      current_streak: 3,
      longest_streak: 6,
    },
  ],
  sessionRows: [
    { completed_at: '2026-10-20T10:00:00Z', words_attempted: 10, words_correct: 8, time_spent_seconds: 0, duration_seconds: 600 },
    { completed_at: '2026-10-19T10:00:00Z', words_attempted: 10, words_correct: 6, time_spent_seconds: 0, duration_seconds: 300 },
    { completed_at: '2026-10-11T10:00:00Z', words_attempted: 10, words_correct: 5, time_spent_seconds: 0, duration_seconds: 300 },
  ],
  now: NOW,
});

const empty = buildStudentInsights({ progressRows: [], sessionRows: [], now: NOW });

describe('ReportInsights', () => {
  it('shows headline stats, the week comparison, weak words, wins, an insight and a home activity', () => {
    render(<ReportInsights insights={rich} name="Ana" t={tFor('en')} />);
    expect(screen.getByTestId('report-headline').textContent).toContain('2'); // mastered
    expect(screen.getByTestId('report-headline').textContent).toContain('15'); // minutes this week
    const week = screen.getByTestId('report-week');
    expect(within(week).getAllByRole('row').length).toBeGreaterThanOrEqual(4);
    expect(screen.getByTestId('report-practice').textContent).toContain('sun');
    expect(screen.getByTestId('report-wins').textContent).toContain('tree');
    expect(screen.getByTestId('report-insight').textContent).toContain('Ana');
    expect(screen.getByTestId('report-activity').textContent).toContain('sun');
  });

  it('hides sections that have no data instead of showing empty boxes', () => {
    render(<ReportInsights insights={empty} name="Ana" t={tFor('en')} />);
    expect(screen.queryByTestId('report-week')).toBeNull();
    expect(screen.queryByTestId('report-practice')).toBeNull();
    expect(screen.queryByTestId('report-wins')).toBeNull();
    expect(screen.getByTestId('report-insight').textContent).toContain('Ana');
    expect(screen.getByTestId('report-headline').textContent).not.toMatch(/null|NaN|undefined/);
  });

  it('hides the streak tile when no streak was ever recorded, instead of showing "0 · best 0"', () => {
    render(<ReportInsights insights={empty} name="Ana" t={tFor('en')} />);
    expect(screen.queryByText('Day streak')).toBeNull();
    render(<ReportInsights insights={rich} name="Ana" t={tFor('en')} />);
    expect(screen.getByText('Day streak')).toBeInTheDocument();
  });

  it.each(['en', 'he', 'sv', 'ja', 'es', 'ru'])('renders every label in %s with no raw keys or unfilled placeholders', (locale) => {
    const { container } = render(<ReportInsights insights={rich} name="Ana" t={tFor(locale)} />);
    expect(container.textContent).not.toMatch(/parentReport\.|\{\w+\}/);
  });

  it('isolates student words and numbers from the page direction (RTL safe)', () => {
    const { container } = render(<ReportInsights insights={rich} name="Ana" t={tFor('he')} />);
    expect(container.querySelectorAll('bdi').length).toBeGreaterThan(0);
    expect(container.querySelector('[dir="ltr"]')).not.toBeNull();
  });

  it('lets a lone word list and an odd last stat tile use the full row instead of leaving a hole', () => {
    const onlyWeak = { ...rich, recentWins: [], longestStreak: 0, currentStreak: 0 };
    render(<ReportInsights insights={onlyWeak} name="Ana" t={tFor('en')} />);
    expect(screen.getByTestId('report-practice').parentElement?.className).not.toContain('grid-cols-2');
    const tiles = screen.getByTestId('report-headline').children;
    expect(tiles).toHaveLength(3);
    expect(tiles[2].className).toContain('col-span-2');
  });
});

