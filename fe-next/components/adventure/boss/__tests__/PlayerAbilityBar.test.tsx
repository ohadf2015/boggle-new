/**
 * Tests for PlayerAbilityBar — the player's RPG moveset bar in boss fights.
 */
import { render, screen, fireEvent } from '@testing-library/react';
import PlayerAbilityBar from '../PlayerAbilityBar';
import { PLAYER_ABILITIES } from '@/lib/adventure/combat/playerAbilities';

const t = (k: string) => k; // identity translator

function slots(canCast: boolean) {
  return PLAYER_ABILITIES.map(def => ({ def, canCast }));
}

describe('PlayerAbilityBar', () => {
  it('renders all three ability buttons', () => {
    render(<PlayerAbilityBar abilities={slots(true)} charge={6} maxCharge={6} onCast={() => {}} t={t} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(3);
  });

  it('disables an ability that cannot be cast', () => {
    render(<PlayerAbilityBar abilities={slots(false)} charge={0} maxCharge={6} onCast={() => {}} t={t} />);
    for (const b of screen.getAllByRole('button')) {
      expect(b).toBeDisabled();
    }
  });

  it('calls onCast with the ability id when a castable button is clicked', () => {
    const onCast = vi.fn();
    render(<PlayerAbilityBar abilities={slots(true)} charge={6} maxCharge={6} onCast={onCast} t={t} />);
    fireEvent.click(screen.getAllByRole('button')[0]);
    expect(onCast).toHaveBeenCalledWith(PLAYER_ABILITIES[0].id);
  });

  it('does not call onCast for a disabled ability', () => {
    const onCast = vi.fn();
    render(<PlayerAbilityBar abilities={slots(false)} charge={0} maxCharge={6} onCast={onCast} t={t} />);
    fireEvent.click(screen.getAllByRole('button')[0]);
    expect(onCast).not.toHaveBeenCalled();
  });

  it('exposes an accessible label per ability', () => {
    render(<PlayerAbilityBar abilities={slots(true)} charge={6} maxCharge={6} onCast={() => {}} t={t} />);
    expect(screen.getByLabelText(/smite\.name/)).toBeInTheDocument();
  });
});
