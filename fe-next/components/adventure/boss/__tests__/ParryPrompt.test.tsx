/**
 * Tests for ParryPrompt + WeaknessBadge — the boss-fight defend/strategy HUD.
 */
import { render, screen } from '@testing-library/react';
import ParryPrompt from '../ParryPrompt';
import WeaknessBadge from '../WeaknessBadge';

const t = (k: string) => k;

describe('ParryPrompt', () => {
  it('shows the defend hint while a telegraph is active', () => {
    render(<ParryPrompt active hintKey="adventure.boss.combat.parry.hint" secondsLeft={2} result={null} t={t} />);
    expect(screen.getByText(/parry\.hint/)).toBeInTheDocument();
  });

  it('renders nothing when inactive and no result', () => {
    const { container } = render(<ParryPrompt active={false} hintKey="k" secondsLeft={0} result={null} t={t} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('announces a successful parry', () => {
    render(<ParryPrompt active={false} hintKey="k" secondsLeft={0} result="parried" t={t} />);
    expect(screen.getByText(/parry\.success/)).toBeInTheDocument();
  });

  it('uses an assertive live region for accessibility', () => {
    render(<ParryPrompt active hintKey="k" secondsLeft={2} result={null} t={t} />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'assertive');
  });
});

describe('WeaknessBadge', () => {
  it('shows the persistent weakness label', () => {
    render(<WeaknessBadge labelKey="adventure.boss.combat.weakness.palindrome" crit={null} t={t} />);
    expect(screen.getByText(/weakness\.palindrome/)).toBeInTheDocument();
  });

  it('shows a WEAKNESS crit popup when a weak hit lands', () => {
    render(
      <WeaknessBadge
        labelKey="adventure.boss.combat.weakness.palindrome"
        crit={{ id: 1, label: 'adventure.boss.combat.weakness.palindrome' }}
        t={t}
      />
    );
    expect(screen.getByText(/adventure\.boss\.combat\.weaknessHit/)).toBeInTheDocument();
  });
});
