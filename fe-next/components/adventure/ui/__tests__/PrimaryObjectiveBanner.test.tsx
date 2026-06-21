/**
 * PrimaryObjectiveBanner — prominent single-goal strip shown beneath the header
 * during gameplay. Closes the mobile clarity gap where objectives were icon-only.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'adventure.objectives.wordCount': 'Find words',
        'adventure.objectives.scoreTarget': 'Reach score',
        'adventure.primaryGoal': 'GOAL',
      };
      return map[key] || key;
    },
    language: 'en',
  }),
}));

vi.mock('@/components/motion/AdaptiveMotion', () => ({
  AdaptiveMotion: {
    div: React.forwardRef(function D({ children, ...p }: any, ref: any) {
      return <div ref={ref} {...p}>{children}</div>;
    }),
  },
}));

import PrimaryObjectiveBanner from '../PrimaryObjectiveBanner';
import type { LevelObjective } from '@/types/adventure';

const obj = (o: Partial<LevelObjective> = {}): LevelObjective => ({
  type: 'wordCount',
  target: 8,
  current: 2,
  ...o,
});

describe('PrimaryObjectiveBanner', () => {
  it('renders nothing when there are no objectives', () => {
    const { container } = render(<PrimaryObjectiveBanner objectives={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows the primary objective label and current/target progress', () => {
    render(
      <PrimaryObjectiveBanner
        objectives={[obj({ type: 'wordCount', current: 2, target: 8, isPrimary: true })]}
      />
    );
    expect(screen.getByText('Find words')).toBeInTheDocument();
    expect(screen.getByTestId('primary-objective-count')).toHaveTextContent('2/8');
  });

  it('features the flagged primary over a secondary objective', () => {
    render(
      <PrimaryObjectiveBanner
        objectives={[
          obj({ type: 'wordCount', current: 1, isPrimary: false }),
          obj({ type: 'scoreTarget', current: 0, target: 500, isPrimary: true }),
        ]}
      />
    );
    expect(screen.getByText('Reach score')).toBeInTheDocument();
  });

  it('renders a progress bar whose width reflects completion', () => {
    render(
      <PrimaryObjectiveBanner
        objectives={[obj({ current: 2, target: 8, isPrimary: true })]}
      />
    );
    const bar = screen.getByTestId('primary-objective-bar');
    expect(bar.getAttribute('style') || '').toContain('width: 25%');
  });

  it('marks the goal complete when reached', () => {
    render(
      <PrimaryObjectiveBanner
        objectives={[obj({ current: 8, target: 8, isPrimary: true })]}
      />
    );
    expect(screen.getByTestId('primary-objective-complete')).toBeInTheDocument();
  });

  it('uses neo-brutalist hard chrome (no blur)', () => {
    const { container } = render(
      <PrimaryObjectiveBanner objectives={[obj({ isPrimary: true })]} />
    );
    const html = container.innerHTML;
    expect(html).not.toContain('backdrop-blur');
    expect(html).not.toMatch(/0 0 \d+px/);
  });
});
