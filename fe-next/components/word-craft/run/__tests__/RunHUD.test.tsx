import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { RunHUD } from '../RunHUD';
import { POWER_CARD_POOL } from '@/lib/word-craft/run/powerCards';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, vars?: Record<string, unknown>) => (vars ? `${k}:${JSON.stringify(vars)}` : k) }),
}));

describe('RunHUD', () => {
  it('shows the current round and the score-toward-target meter', () => {
    render(
      <RunHUD round={2} target={120} score={45} runTotal={60} activeCards={[]} tilesRemaining={14} />,
    );
    expect(screen.getByText(/wordcraft\.run\.round/)).toBeInTheDocument();
    // Progress meter renders the score/target together + an accessible progressbar.
    expect(screen.getByText('45/120')).toBeInTheDocument();
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '45');
    expect(bar).toHaveAttribute('aria-valuemax', '120');
  });

  it('renders a chip per active card', () => {
    const cards = POWER_CARD_POOL.slice(0, 2);
    render(
      <RunHUD round={3} target={200} score={10} runTotal={150} activeCards={cards} tilesRemaining={5} />,
    );
    cards.forEach((c) => {
      expect(screen.getByText(`wordcraft.run.card.${c.id}.name`)).toBeInTheDocument();
    });
  });
});
