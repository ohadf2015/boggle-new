import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { CardPickScreen } from '../CardPickScreen';
import { POWER_CARD_POOL } from '@/lib/word-craft/run/powerCards';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k }),
}));

const cards = POWER_CARD_POOL.slice(0, 3);

describe('CardPickScreen', () => {
  it('renders all three offered cards', () => {
    render(<CardPickScreen cards={cards} onPick={vi.fn()} />);
    cards.forEach((c) => {
      expect(screen.getByText(`wordcraft.run.card.${c.id}.name`)).toBeInTheDocument();
    });
  });

  it('calls onPick with the chosen card id', () => {
    const onPick = vi.fn();
    render(<CardPickScreen cards={cards} onPick={onPick} />);
    fireEvent.click(screen.getByText(`wordcraft.run.card.${cards[1].id}.name`));
    expect(onPick).toHaveBeenCalledWith(cards[1].id);
  });
});
