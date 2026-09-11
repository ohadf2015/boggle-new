import { render, screen } from '@testing-library/react';
import { DuelComboMeter } from '../DuelComboMeter';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
}));

vi.mock('framer-motion', () => ({
  m: { div: ({ children, ...props }: any) => <div {...props}>{children}</div> },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('DuelComboMeter', () => {
  it('renders cold with no chain and never disappears', () => {
    render(<DuelComboMeter streak={0} bonus={0} />);

    const meter = screen.getByTestId('duel-combo-meter');
    expect(meter).toBeInTheDocument();
    expect(meter).toHaveAttribute('data-tier', 'none');
    expect(meter).toHaveAttribute('data-streak', '0');
  });

  it('shows the streak count once a chain exists', () => {
    render(<DuelComboMeter streak={3} bonus={2} />);

    expect(screen.getByTestId('duel-combo-meter')).toHaveAttribute('data-tier', 'spark');
    expect(screen.getByTestId('duel-combo-streak')).toHaveTextContent('3');
  });

  it('shows the additive bonus the server paid, not a multiplier', () => {
    render(<DuelComboMeter streak={4} bonus={6} />);

    const bonus = screen.getByTestId('duel-combo-bonus');
    expect(bonus).toHaveTextContent('6');
    expect(bonus.textContent).not.toContain('x');
  });

  it('hides the bonus chip when the word paid no bonus', () => {
    render(<DuelComboMeter streak={1} bonus={0} />);
    expect(screen.queryByTestId('duel-combo-bonus')).not.toBeInTheDocument();
  });

  it('escalates the tier attribute with the streak', () => {
    const { rerender } = render(<DuelComboMeter streak={4} bonus={2} />);
    expect(screen.getByTestId('duel-combo-meter')).toHaveAttribute('data-tier', 'blaze');

    rerender(<DuelComboMeter streak={10} bonus={10} />);
    expect(screen.getByTestId('duel-combo-meter')).toHaveAttribute('data-tier', 'supernova');
  });

  it('exposes the fill as a percentage width that is capped at 100', () => {
    render(<DuelComboMeter streak={99} bonus={10} />);
    const fill = screen.getByTestId('duel-combo-fill');
    expect(fill).toHaveStyle({ width: '100%' });
  });

  it('is announced politely for screen readers', () => {
    render(<DuelComboMeter streak={5} bonus={8} />);
    expect(screen.getByTestId('duel-combo-meter')).toHaveAttribute('aria-live', 'polite');
  });
});
