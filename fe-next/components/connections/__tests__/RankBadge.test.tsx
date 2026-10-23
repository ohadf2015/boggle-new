import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import RankBadge from '../RankBadge';
import { rankFor, RANKS } from '@/lib/connections/progress';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, v?: Record<string, unknown>) => (v ? `${k}:${JSON.stringify(v)}` : k),
    language: 'en',
  }),
}));
const fireLevelUp = vi.fn();
vi.mock('@/utils/confettiUtils', () => ({ fireLevelUpConfetti: () => fireLevelUp() }));

describe('RankBadge', () => {
  it('names the rank and the distance to the next one', () => {
    render(<RankBadge standing={rankFor(4)} />);
    expect(screen.getByText('connections.rank.plank')).toBeTruthy();
    const next = screen.getByText(/connections\.rank\.toNext/);
    expect(next.textContent).toContain(`"count":${RANKS[1].min - 4}`);
    expect(next.textContent).toContain('connections.rank.rope');
  });

  it('exposes the bar fill as a progressbar value', () => {
    render(<RankBadge standing={rankFor(5)} />);
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('50');
  });

  it('shows "top rank" with a full bar at the end of the ladder', () => {
    render(<RankBadge standing={rankFor(9999)} />);
    expect(screen.getByText('connections.rank.top')).toBeTruthy();
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('100');
  });

  it('announces a rank-up once and fires confetti', () => {
    render(<RankBadge standing={rankFor(RANKS[1].min)} rankUpId="rope" />);
    expect(screen.getByTestId('rank-up-banner').textContent).toContain('connections.rank.rope');
    expect(fireLevelUp).toHaveBeenCalledTimes(1);
  });

  it('has no banner without a rank-up', () => {
    render(<RankBadge standing={rankFor(1)} />);
    expect(screen.queryByTestId('rank-up-banner')).toBeNull();
  });
});
