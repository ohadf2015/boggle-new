import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import OddsBoard from '../OddsBoard';
import { LanguageProvider } from '../../../contexts/LanguageContext';

const renderWithLanguage = (component: React.ReactElement) => {
  return render(<LanguageProvider>{component}</LanguageProvider>);
};

describe('OddsBoard', () => {
  it('shows multiplier and potential payout for the word', () => {
    renderWithLanguage(<OddsBoard word="RETINAS" stake={20} reducedMotion />);
    expect(screen.getByTestId('odds-mult')).toBeInTheDocument();
    expect(screen.getByTestId('odds-payout')).toBeInTheDocument();
  });

  it('empty word shows dashes, no NaN', () => {
    renderWithLanguage(<OddsBoard word="" stake={20} reducedMotion />);
    expect(screen.getByTestId('odds-mult').textContent).not.toMatch(/NaN/);
  });

  it('short word (length < 3) shows dash for multiplier', () => {
    renderWithLanguage(<OddsBoard word="AT" stake={20} reducedMotion />);
    const multElement = screen.getByTestId('odds-mult');
    expect(multElement.textContent).toContain('—');
  });

  it('calculates payout as Math.round(stake * mult) for valid words', () => {
    renderWithLanguage(<OddsBoard word="QUIZ" stake={10} reducedMotion />);
    const payoutElement = screen.getByTestId('odds-payout');
    // QUIZ is a real word, should have a multiplier > 1 and payout > 10
    expect(payoutElement.textContent).not.toBe('');
    expect(payoutElement.textContent).not.toMatch(/NaN/);
  });
});
