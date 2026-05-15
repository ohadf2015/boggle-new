import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { PowerCardView } from '../PowerCardView';
import { POWER_CARD_POOL } from '@/lib/word-craft/run/powerCards';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k }),
}));

const card = POWER_CARD_POOL.find((c) => c.id === 'vowelPower')!;

describe('PowerCardView', () => {
  it('renders the card name and description from i18n keys', () => {
    render(<PowerCardView card={card} />);
    expect(screen.getByText('wordcraft.run.card.vowelPower.name')).toBeInTheDocument();
    expect(screen.getByText('wordcraft.run.card.vowelPower.desc')).toBeInTheDocument();
  });

  it('calls onSelect with the card id when clicked', () => {
    const onSelect = vi.fn();
    render(<PowerCardView card={card} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onSelect).toHaveBeenCalledWith('vowelPower');
  });

  it('does not render a button when onSelect is omitted', () => {
    render(<PowerCardView card={card} />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});
