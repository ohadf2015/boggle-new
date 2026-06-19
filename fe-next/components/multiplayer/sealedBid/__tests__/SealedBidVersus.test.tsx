/**
 * SealedBidVersus — render glue over the tested useSealedBidGame hook. We mock
 * the hook to drive each phase and assert the view renders the right surface
 * (loading, bidding rack + lock, reveal outcomes, game over).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, dir: 'ltr' }),
}));

const submitBid = vi.fn();
let mockState: Record<string, unknown>;
vi.mock('../useSealedBidGame', () => ({
  useSealedBidGame: () => ({ ...mockState, submitBid }),
}));

import { SealedBidVersus } from '../SealedBidVersus';

const base = {
  rack: 'TRAINED', index: 0, totalRounds: 5, phase: 'bidding',
  scores: { me: 0, bob: 0 }, results: null, myLock: null, lockProgress: null,
  roundDeadline: null, winner: null, ready: true,
};

describe('SealedBidVersus', () => {
  beforeEach(() => { submitBid.mockClear(); mockState = { ...base }; });

  it('shows a waiting state before init', () => {
    mockState = { ...base, ready: false };
    render(<SealedBidVersus socket={null} username="me" />);
    expect(screen.getByText('sealedBid.mp.waiting')).toBeInTheDocument();
  });

  it('renders the rack and a disabled lock until a 3+ letter word is built', () => {
    render(<SealedBidVersus socket={null} username="me" />);
    // 7 rack tiles
    expect(screen.getByLabelText('T')).toBeInTheDocument();
    const lock = screen.getByText('sealedBid.mp.lock');
    expect(lock).toBeDisabled();
  });

  it('locks a bid built from rack taps', () => {
    render(<SealedBidVersus socket={null} username="me" />);
    fireEvent.click(screen.getByLabelText('T'));
    fireEvent.click(screen.getByLabelText('R'));
    fireEvent.click(screen.getByLabelText('A'));
    fireEvent.click(screen.getByText('sealedBid.mp.lock'));
    expect(submitBid).toHaveBeenCalledWith('TRA');
  });

  it('shows lock-confirmation once my bid is locked', () => {
    mockState = { ...base, myLock: { word: 'TRAIN', valid: true }, lockProgress: { locked: 1, total: 2 } };
    render(<SealedBidVersus socket={null} username="me" />);
    expect(screen.getByText('sealedBid.mp.locked')).toBeInTheDocument();
  });

  it('renders reveal outcomes', () => {
    mockState = {
      ...base, phase: 'revealed',
      results: [{ username: 'me', word: 'RETAIN', outcome: 'unique', basePoints: 6, points: 12 }],
      scores: { me: 12, bob: 0 },
    };
    render(<SealedBidVersus socket={null} username="me" />);
    expect(screen.getByText(/sealedBid.mp.outcome.unique/)).toBeInTheDocument();
  });

  it('renders the win banner on game over', () => {
    mockState = { ...base, phase: 'done', winner: 'me' };
    render(<SealedBidVersus socket={null} username="me" />);
    expect(screen.getByText('sealedBid.mp.youWin')).toBeInTheDocument();
  });
});
