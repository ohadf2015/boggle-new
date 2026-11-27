import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, v?: Record<string, unknown>) => (v ? `${k}:${JSON.stringify(v)}` : k), language: 'he' }),
}));
vi.mock('next/dynamic', () => ({ default: () => () => null }));

import ArcadeResults from '../ArcadeResults';

const props = { game: 'catch' as const, headline: 'h', onAgain: vi.fn(), onHub: vi.fn() };

describe('ArcadeResults', () => {
  it('Given a guest, then there is exactly one sign-in prompt', () => {
    render(<ArcadeResults {...props} end={{ score: 50 }} settle={{ state: 'guest' }} best={{ best: 50, previous: 0, verdict: 'new' }} />);
    expect(screen.getAllByText(/signIn/)).toHaveLength(1);
  });

  it('Given one coin in Hebrew, then the singular form is used', () => {
    render(<ArcadeResults {...props} end={{ score: 50 }} settle={{ state: 'done', score: 50, coins: 1 }} best={{ best: 90, previous: 90, verdict: null }} />);
    expect(screen.getByText(/holiday.arcade.coins_one/)).toBeInTheDocument();
  });

  it('Given a new best, then it is celebrated', () => {
    render(<ArcadeResults {...props} end={{ score: 700 }} settle={{ state: 'guest' }} best={{ best: 700, previous: 400, verdict: 'new' }} />);
    expect(screen.getByTestId('arcade-best')).toHaveTextContent('holiday.arcade.newBest');
  });

  it('Given a run within 10% of the best, then it says so close and shows the best', () => {
    render(<ArcadeResults {...props} end={{ score: 930 }} settle={{ state: 'guest' }} best={{ best: 1000, previous: 1000, verdict: 'close' }} />);
    const badge = screen.getByTestId('arcade-best');
    expect(badge).toHaveTextContent('holiday.arcade.soClose');
    expect(badge).toHaveTextContent('"gap":70');
    expect(screen.getByText(/holiday.arcade.bestScore/)).toHaveTextContent('1000');
  });

  it('Given an ordinary run, then the best is shown without a badge', () => {
    render(<ArcadeResults {...props} end={{ score: 300 }} settle={{ state: 'guest' }} best={{ best: 1000, previous: 1000, verdict: null }} />);
    expect(screen.queryByTestId('arcade-best')).toBeNull();
    expect(screen.getByText(/holiday.arcade.bestScore/)).toHaveTextContent('1000');
  });
});

describe('ArcadeResults tie', () => {
  it('Given a run equal to the best, then it says tied instead of zero short', () => {
    render(<ArcadeResults {...props} end={{ score: 800 }} settle={{ state: 'guest' }} best={{ best: 800, previous: 800, verdict: 'tie' }} />);
    expect(screen.getByTestId('arcade-best')).toHaveTextContent('holiday.arcade.tieBest');
  });
});
