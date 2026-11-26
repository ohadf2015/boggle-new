import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { PowerCardView } from '../PowerCardView';
import { POWER_CARD_POOL } from '@/lib/word-craft/run/powerCards';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k }),
}));

const card = POWER_CARD_POOL.find((c) => c.id === 'vowelPower')!;
const legendaryCard = POWER_CARD_POOL.find((c) => c.rarity === 'legendary')!;

describe('PowerCardView', () => {
  it('renders the card name and description from i18n keys', () => {
    render(<PowerCardView card={card} />);
    expect(screen.getByText('wordcraft.run.card.vowelPower.name')).toBeInTheDocument();
    expect(screen.getByText('wordcraft.run.card.vowelPower.desc')).toBeInTheDocument();
  });

  it('pulses the legendary pick so a rare drop feels special, reduced-motion safe', () => {
    render(<PowerCardView card={legendaryCard} onSelect={vi.fn()} />);
    const button = screen.getByRole('button');
    expect(button.className).toContain('animate-pulse');
    expect(button.className).toContain('motion-reduce:animate-none');
  });

  it('does not pulse a common card', () => {
    render(<PowerCardView card={card} onSelect={vi.fn()} />);
    expect(screen.getByRole('button').className).not.toContain('animate-pulse');
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
