import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MissGapStreakFlame } from '../MissGapStreakFlame';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
vi.mock('next/image', () => ({
  __esModule: true,
  // eslint-disable-next-line @next/next/no-img-element -- test double for next/image
  default: ({ unoptimized: _u, ...p }: Record<string, unknown>) => <img alt="" {...(p as object)} />,
}));

describe('MissGapStreakFlame pill', () => {
  it('shows the tiered flame in the pill', () => {
    render(<MissGapStreakFlame streak={7} />);
    const pill = screen.getByTestId('miss-gap-streak-pill');
    expect(pill.querySelector('[data-testid="streak-flame"]')).toHaveAttribute('data-tier', 'blue');
    expect(screen.getByTestId('miss-gap-streak-pill-count')).toHaveTextContent('7');
  });

  it('stays hidden at zero', () => {
    render(<MissGapStreakFlame streak={0} />);
    expect(screen.queryByTestId('miss-gap-streak-pill')).toBeNull();
    expect(screen.queryByTestId('streak-flame')).toBeNull();
  });
});
