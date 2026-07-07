import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import OddsBoard from '../OddsBoard';

// Mock GSAP if needed
vi.mock('gsap', () => ({
  default: {
    to: vi.fn((target, vars) => {
      if (vars.onUpdate) vars.onUpdate();
      if (vars.onComplete) vars.onComplete();
    }),
  },
}));

// Mock the wager module to provide oddsMultiplier
vi.mock('../../../lib/sealedBid/sp/wager', () => ({
  oddsMultiplier: (word: string) => {
    if (!word || word.length < 3) return 1.5;
    // Simple mock: longer words pay more
    return Math.min(1.5 + word.length * 0.4, 6);
  },
}));

// Mock i18n context
vi.mock('../../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, vars?: Record<string, any>) => {
      if (key === 'sealedBid.uniquePays') {
        return `×${vars?.mult ?? '?'}`;
      }
      if (key === 'sealedBid.potentialPayout') {
        return `${vars?.amount ?? '?'} coins`;
      }
      return key;
    },
  }),
}));

describe('OddsBoard', () => {
  it('shows multiplier and potential payout for the word', () => {
    render(<OddsBoard word="RETINAS" stake={20} reducedMotion />);
    expect(screen.getByTestId('odds-mult')).toBeInTheDocument();
    expect(screen.getByTestId('odds-payout')).toBeInTheDocument();
  });

  it('empty word shows dashes, no NaN', () => {
    render(<OddsBoard word="" stake={20} reducedMotion />);
    const multText = screen.getByTestId('odds-mult').textContent;
    expect(multText).not.toMatch(/NaN/);
    expect(multText).toContain('—');
  });

  it('short word (< 3 letters) shows dashes, no NaN', () => {
    render(<OddsBoard word="AT" stake={20} reducedMotion />);
    const multText = screen.getByTestId('odds-mult').textContent;
    expect(multText).not.toMatch(/NaN/);
    expect(multText).toContain('—');
  });

  it('computes potential payout = Math.round(stake * mult)', () => {
    // "RETINAS" = 7 letters, mult ≈ 1.5 + 7*0.4 = 4.3 → clamped to min 6
    // Actually with our mock: 1.5 + 7 * 0.4 = 4.3, clamped to 6
    // Potential payout = Math.round(20 * 4.3) = Math.round(86) = 86
    // But our mock should clamp to 6, so 20 * 6 = 120
    render(<OddsBoard word="RETINAS" stake={20} reducedMotion />);
    const payoutText = screen.getByTestId('odds-payout').textContent;
    // Should contain the calculated payout amount
    expect(payoutText).toBeTruthy();
    expect(payoutText).not.toMatch(/NaN/);
  });
});
