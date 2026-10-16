import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/analytics/lazyPosthog', () => ({ default: { capture: vi.fn() } }));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));
vi.mock('@/hooks/useTeacherPro', () => ({
  useTeacherPro: () => ({ hasPro: false, loading: false }),
}));

import { ResultsPrimaryActions } from '../ResultsPrimaryActions';
import { isPracticeRound } from '../isPracticeRound';

describe('a bot practice round never asks a free teacher to pay', () => {
  it('Given every player was a bot, Then the round is a practice round', () => {
    expect(isPracticeRound([{ isBot: true }, { isBot: true }])).toBe(true);
  });

  it('Given one real student played, Then it is a real class round', () => {
    expect(isPracticeRound([{ isBot: true }, { isBot: false }])).toBe(false);
  });

  it('Given no player list, Then it is not treated as practice', () => {
    expect(isPracticeRound(undefined)).toBe(false);
    expect(isPracticeRound([])).toBe(false);
  });

  it('Given a free teacher after a practice round, Then the unlock-report ask is hidden', () => {
    render(<ResultsPrimaryActions language="en" t={(k) => k} surface="projector" hideUpgrade />);
    expect(screen.queryByTestId('unlock-report-upgrade-cta')).toBeNull();
  });

  it('Given a free teacher after a real round, Then the unlock-report ask still shows', () => {
    render(<ResultsPrimaryActions language="en" t={(k) => k} surface="projector" />);
    expect(screen.getByTestId('unlock-report-upgrade-cta')).toBeInTheDocument();
  });
});
