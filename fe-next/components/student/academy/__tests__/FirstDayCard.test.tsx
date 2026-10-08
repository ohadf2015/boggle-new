import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, fallback?: string | Record<string, string | number>, params?: Record<string, string | number>) => {
      const p = typeof fallback === 'object' ? fallback : params;
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

import { FirstDayCard } from '../FirstDayCard';
import { buildFirstDayGoals } from '../firstDayGoals';

describe('<FirstDayCard>', () => {
  it('given a fresh student, then each goal shows with its progress and nothing is a bare zero wall', () => {
    render(<FirstDayCard goals={buildFirstDayGoals({ hasClass: false, stars: 0, streak: 0 })} hasClass={false} />);
    expect(screen.getByTestId('academy-first-day-join')).toHaveAttribute('data-done', 'false');
    expect(screen.getByTestId('academy-first-day-stars')).toHaveTextContent('student.firstDay.stars:{"count":3}');
    expect(screen.getByTestId('academy-first-day-flame')).toHaveTextContent('student.firstDay.flame');
    expect(screen.getByText('student.firstDay.chestHint')).toBeInTheDocument();
  });

  it('given a student in a class, then the caption says today game starts the class streak', () => {
    render(<FirstDayCard goals={buildFirstDayGoals({ hasClass: true, stars: 1, streak: 0 })} hasClass />);
    expect(screen.getByTestId('academy-first-day-join')).toHaveAttribute('data-done', 'true');
    expect(screen.getByText('student.firstDay.classStreakHint')).toBeInTheDocument();
  });

  it('given every goal met, then the card renders nothing', () => {
    const { container } = render(
      <FirstDayCard goals={buildFirstDayGoals({ hasClass: true, stars: 3, streak: 1 })} hasClass />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
