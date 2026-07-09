import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import SealedBidTable from '../SealedBidTable';

vi.mock('gsap', () => ({
  default: {
    to: vi.fn((target, vars) => {
      if (vars?.onUpdate) vars.onUpdate();
      if (vars?.onComplete) vars.onComplete();
    }),
    fromTo: vi.fn(),
  },
}));

vi.mock('../../../lib/sealedBid/sp/wager', () => ({
  oddsMultiplier: (word: string) => (word && word.length >= 3 ? 2.5 : 1.5),
}));

vi.mock('../../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, vars?: Record<string, unknown>) => {
      if (key === 'sealedBid.uniquePays') return `×${vars?.mult ?? '?'}`;
      if (key === 'sealedBid.potentialPayout') return `win ${vars?.amount ?? '?'}`;
      if (key === 'sealedBid.yourWord') return 'Your word';
      if (key === 'sealedBid.tapHint') return 'Tap letters';
      if (key === 'sealedBid.currentStake') return 'Stake';
      if (key === 'sealedBid.chips') return 'chips';
      if (key === 'sealedBid.needWord') return 'Build a word first';
      if (key === 'sealedBid.needStake') return 'Set a stake';
      if (key === 'sealedBid.lockBid') return 'Lock bid';
      if (key === 'sealedBid.pass') return 'Pass';
      if (key === 'sealedBid.allIn') return 'All in';
      if (key === 'sealedBid.clear') return 'Clear';
      return key;
    },
  }),
}));

vi.mock('../../daily/WordWheelPixiRing', () => ({ default: () => null }));

describe('SealedBidTable (indicative casino play surface)', () => {
  const base = {
    letters: ['C', 'A', 'T', 'S', 'R', 'E', 'N'],
    word: '',
    stake: 0,
    balance: 100,
    onWordChange: vi.fn(),
    onWordSubmit: vi.fn(),
    onStakeChange: vi.fn(),
    onLock: vi.fn(),
    onPass: vi.fn(),
    reducedMotion: true,
    dir: 'ltr' as const,
  };

  it('shows word empty prompt when no word built', () => {
    render(<SealedBidTable {...base} />);
    expect(screen.getByTestId('sb-word-display')).toHaveTextContent(/tap letters|your word/i);
  });

  it('shows built word in the pot strip', () => {
    render(<SealedBidTable {...base} word="CATS" stake={10} />);
    expect(screen.getByTestId('sb-word-display')).toHaveTextContent('CATS');
  });

  it('shows odds/payout only when word length ≥ 3', () => {
    const { rerender } = render(<SealedBidTable {...base} word="CA" stake={10} />);
    expect(screen.queryByTestId('odds-mult')).not.toBeInTheDocument();

    rerender(<SealedBidTable {...base} word="CAT" stake={10} />);
    expect(screen.getByTestId('odds-mult')).toBeInTheDocument();
    expect(screen.getByTestId('odds-payout')).toBeInTheDocument();
  });

  it('disables lock without word or stake and exposes reason', () => {
    const { rerender } = render(<SealedBidTable {...base} word="" stake={0} />);
    const lock = screen.getByTestId('sb-lock');
    expect(lock).toBeDisabled();
    expect(screen.getByTestId('sb-lock-hint')).toBeInTheDocument();

    rerender(<SealedBidTable {...base} word="CAT" stake={0} />);
    expect(screen.getByTestId('sb-lock')).toBeDisabled();
    expect(screen.getByTestId('sb-lock-hint')).toHaveTextContent(/stake/i);

    rerender(<SealedBidTable {...base} word="CAT" stake={15} />);
    expect(screen.getByTestId('sb-lock')).not.toBeDisabled();
    expect(screen.queryByTestId('sb-lock-hint')).not.toBeInTheDocument();
  });

  it('renders felt play surface and single stake readout (no balance dupe)', () => {
    render(<SealedBidTable {...base} word="CAT" stake={20} balance={80} />);
    expect(screen.getByTestId('sb-felt')).toBeInTheDocument();
    expect(screen.getByTestId('sb-stake-pot')).toHaveTextContent('20');
    // Balance lives in page HUD only — tray must not re-show it
    expect(screen.queryByText(/balance/i)).not.toBeInTheDocument();
  });

  it('marks primary lock as dominant action', () => {
    render(<SealedBidTable {...base} word="CAT" stake={10} />);
    const lock = screen.getByTestId('sb-lock');
    expect(lock.className).toMatch(/bg-neo-lime|neo-lime/);
  });
});
