import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));
vi.mock('next/image', () => ({
  __esModule: true,
  default: ({ fill: _f, priority: _p, unoptimized: _u, ...p }: Record<string, unknown>) => React.createElement('img', p as never),
}));
vi.mock('@/components/Avatar', () => ({ default: () => <span data-testid="avatar" /> }));

import { AcademyHud } from '../AcademyHud';

const base = {
  userId: 'u1',
  name: 'Maya',
  totalXp: 0,
  streak: 0,
  stars: 0,
  isGuest: false,
  onSignOut: () => {},
  reducedMotion: true,
};

describe('<AcademyHud> streak flame', () => {
  it('sleeps when there is no streak to lose', () => {
    render(<AcademyHud {...base} streak={0} />);
    expect(screen.getByTestId('academy-streak-flame')).toHaveAttribute('data-state', 'none');
  });

  it('glows calmly on an alive streak', () => {
    render(<AcademyHud {...base} streak={4} />);
    expect(screen.getByTestId('academy-streak-flame')).toHaveAttribute('data-state', 'calm');
  });

  it('burns hot when the streak dies tonight', () => {
    render(<AcademyHud {...base} streak={4} streakAtRisk />);
    expect(screen.getByTestId('academy-streak-flame')).toHaveAttribute('data-state', 'at-risk');
  });

  it('says so out loud — a visual-only warning is no warning', () => {
    render(<AcademyHud {...base} streak={4} streakAtRisk />);
    expect(screen.getByTestId('academy-streak-flame')).toHaveAttribute('aria-label', 'academy.student.streakAtRiskAria');
  });
});
