import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, fallback?: unknown, params?: Record<string, unknown>) => {
      const p = typeof fallback === 'object' ? (fallback as Record<string, unknown>) : params;
      return p ? `${key}:${JSON.stringify(p)}` : key;
    },
    language: 'en',
    dir: 'ltr',
  }),
}));
vi.mock('next/image', () => ({
  __esModule: true,
  default: ({ fill: _f, priority: _p, unoptimized: _u, ...p }: Record<string, unknown>) => React.createElement('img', p as never),
}));
vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => <a href={href} {...rest}>{children}</a>,
}));
vi.mock('@/lib/analytics/lazyPosthog', () => ({ default: { capture: vi.fn() } }));
vi.mock('@/lib/education/telemetry', () => ({ trackEduAssignmentOverdue: vi.fn(), trackEduAssignmentReminderShown: vi.fn() }));

import { HubTopCards } from '../HubTopCards';
import { buildFirstDayGoals } from '../firstDayGoals';

const WARMUP = { assignmentId: 'A1', lessonId: 'L1', title: 'Planets', href: '/en/student/lessons/L1?mode=blitz', words: ['planet', 'orbit', 'comet'] };
const base = { classroomId: 'c1', chestOpen: true, streak: 3, streakDoneToday: false, due: null };
const dayOne = buildFirstDayGoals({ hasClass: true, stars: 0, streak: 0 });
const dayTwo = buildFirstDayGoals({ hasClass: true, stars: 5, streak: 1 });

describe('<HubTopCards>', () => {
  it('Given day one and no warm-up, Then the first-day goals show', () => {
    render(<HubTopCards {...base} goals={dayOne} warmup={null} />);
    expect(screen.getByTestId('academy-first-day')).toBeInTheDocument();
    expect(screen.queryByTestId('academy-today')).toBeNull();
  });

  it('Given day one is done, Then a Today card replaces it with warm-up, chest and streak', () => {
    render(<HubTopCards {...base} goals={dayTwo} warmup={null} />);
    expect(screen.queryByTestId('academy-first-day')).toBeNull();
    const today = screen.getByTestId('academy-today');
    expect(within(today).getByTestId('academy-today-warmup')).toHaveAttribute('data-done', 'true');
    expect(within(today).getByTestId('academy-today-chest')).toHaveAttribute('data-done', 'false');
    expect(within(today).getByTestId('academy-today-streak')).toHaveTextContent('"count":3');
  });

  it('Given a warm-up, Then it leads as one tap into the game-like drill with the review words, even on day one', () => {
    render(<HubTopCards {...base} goals={dayOne} warmup={WARMUP} />);
    const cta = screen.getByTestId('academy-warmup-cta');
    expect(cta).toHaveAttribute('href', WARMUP.href);
    expect(cta).toHaveTextContent('planet');
    expect(cta).toHaveTextContent('comet');
    expect(screen.queryByTestId('academy-first-day')).toBeNull();
  });

  it('Given a due-soon card for the warm-up homework, Then that one card opens the warm-up drill and no second CTA stacks on it', () => {
    render(
      <HubTopCards {...base} goals={dayTwo} warmup={WARMUP} due={{ assignmentId: 'A1', title: 'Planets', href: '/en/student/lessons/L1', dueDate: '2026-10-30T10:00:00Z', kind: 'due_soon' }} />
    );
    expect(screen.getByTestId('assignment-due-card')).toHaveAttribute('href', WARMUP.href);
    expect(screen.queryByTestId('academy-warmup-cta')).toBeNull();
    expect(screen.getByTestId('academy-today-warmup')).toHaveAttribute('data-done', 'false');
  });
});
