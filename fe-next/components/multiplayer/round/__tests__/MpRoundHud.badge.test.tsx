import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MpRoundHud } from '../MpRoundHud';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

const PROPS = {
  remainingTime: 90,
  totalTime: 180,
  score: 120,
  gain: null,
  rank: 2,
  total: 5,
  comboLevel: 3,
  timerColor: 'cyan' as const,
  onExit: () => {},
};

describe('MpRoundHud badge slot', () => {
  it('Given no badge (every public game), Then the combo meter sits beside the score as before', () => {
    render(<MpRoundHud {...PROPS} />);
    expect(screen.getByTestId('mp-combo-meter')).toHaveAttribute('data-level', '3');
  });

  it('Given a badge, Then it takes the combo meter\'s place beside the score', () => {
    render(<MpRoundHud {...PROPS} hudBadge={<span data-testid="flame" />} />);
    expect(screen.getByTestId('flame')).toBeInTheDocument();
    expect(screen.queryByTestId('mp-combo-meter')).toBeNull();
  });
});
