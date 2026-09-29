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
vi.mock('@/components/ui/Mascot', () => ({
  __esModule: true,
  Mascot: ({ variant }: { variant: string }) => React.createElement('span', { 'data-testid': 'academy-mascot-art', 'data-variant': variant }),
}));

import { AcademyMascot } from '../AcademyMascot';

describe('<AcademyMascot>', () => {
  it('shows the mood Lexi is in and says the matching line', () => {
    render(
      <AcademyMascot
        mood={{ variant: 'scared', lineKey: 'academy.student.mascotStreakRisk', params: { count: 5 } }}
        reducedMotion
      />,
    );
    expect(screen.getByTestId('academy-mascot-art')).toHaveAttribute('data-variant', 'scared');
    expect(screen.getByTestId('academy-mascot-line')).toHaveTextContent('academy.student.mascotStreakRisk');
  });

  it('announces mood changes politely (a live game starting must reach a screen reader)', () => {
    render(
      <AcademyMascot mood={{ variant: 'celebration', lineKey: 'academy.student.mascotLive' }} reducedMotion />,
    );
    expect(screen.getByTestId('academy-mascot-line')).toHaveAttribute('aria-live', 'polite');
  });

  it('never intercepts taps meant for the islands behind it', () => {
    const { container } = render(
      <AcademyMascot mood={{ variant: 'happy', lineKey: 'academy.student.mascotNext' }} reducedMotion />,
    );
    expect(container.firstChild).toHaveClass('pointer-events-none');
  });
});
