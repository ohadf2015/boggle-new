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
    expect(screen.getByText('sealedBidMp.waiting')).toBeInTheDocument();
  });

  it('renders the rack and a disabled lock until a 3+ letter word is built', () => {
    render(<SealedBidVersus socket={null} username="me" />);
    // Casino felt shell shared with solo
    expect(screen.getByTestId('sb-versus-felt')).toBeInTheDocument();
    // 7 rack tiles
    expect(screen.getByLabelText('T')).toBeInTheDocument();
    const lock = screen.getByText('sealedBidMp.lock');
    expect(lock).toBeDisabled();
  });

  it('locks a bid built from rack taps', () => {
    render(<SealedBidVersus socket={null} username="me" />);
    fireEvent.click(screen.getByLabelText('T'));
    fireEvent.click(screen.getByLabelText('R'));
    fireEvent.click(screen.getByLabelText('A'));
    fireEvent.click(screen.getByText('sealedBidMp.lock'));
    expect(submitBid).toHaveBeenCalledWith('TRA');
  });

  it('shows lock-confirmation once my bid is locked', () => {
    mockState = { ...base, myLock: { word: 'TRAIN', valid: true }, lockProgress: { locked: 1, total: 2 } };
    render(<SealedBidVersus socket={null} username="me" />);
    expect(screen.getByText('sealedBidMp.locked')).toBeInTheDocument();
  });

  it('renders reveal outcomes', () => {
    mockState = {
      ...base, phase: 'revealed',
      results: [{ username: 'me', word: 'RETAIN', outcome: 'unique', basePoints: 6, points: 12 }],
      scores: { me: 12, bob: 0 },
    };
    render(<SealedBidVersus socket={null} username="me" />);
    expect(screen.getByText(/sealedBidMp.outcome.unique/)).toBeInTheDocument();
  });

  it('renders the win banner on game over', () => {
    mockState = { ...base, phase: 'done', winner: 'me' };
    render(<SealedBidVersus socket={null} username="me" />);
    expect(screen.getByText('sealedBidMp.youWin')).toBeInTheDocument();
  });

  it('renders round + scores inside a desktop sidebar so wide viewports use the width', () => {
    render(<SealedBidVersus socket={null} username="me" />);
    const sidebar = screen.getByTestId('sb-standings-rail');
    expect(sidebar).toBeTruthy();
    expect(sidebar).toHaveTextContent('sealedBidMp.round');
  });

  it('positions exit button at logical start-3 (RTL-safe, not left-3) when onQuit provided', () => {
    render(<SealedBidVersus socket={null} username="me" onQuit={() => {}} />);
    const container = screen.getByTestId('sb-exit-container');
    expect(container.className).toContain('start-3');
    expect(container.className).not.toContain('left-3');
  });

  it('uses DirectionalIcon (mirror) for backspace so it flips in RTL', () => {
    render(<SealedBidVersus socket={null} username="me" />);
    const backspaceBtn = screen.getByLabelText('sealedBidMp.clear');
    const svg = backspaceBtn.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg!.className.baseVal ?? svg!.getAttribute('class')).toContain('rtl:scale-x-[-1]');
  });

  it('shows countdown timer badge when roundDeadline is in the future', async () => {
    mockState = { ...base, roundDeadline: Date.now() + 15_000 };
    render(<SealedBidVersus socket={null} username="me" />);
    expect(await screen.findByRole('timer')).toBeInTheDocument();
  });

  it('applies urgency styling when ≤5 seconds remain', async () => {
    mockState = { ...base, roundDeadline: Date.now() + 3_000 };
    render(<SealedBidVersus socket={null} username="me" />);
    const badge = await screen.findByRole('timer');
    expect(badge.className).toContain('bg-neo-red');
  });

  it('shows ♟ Elo rating badge for each player derived from their score', () => {
    mockState = { ...base, scores: { me: 24, bob: 12 } };
    render(<SealedBidVersus socket={null} username="me" />);
    const rail = screen.getByTestId('sb-standings-rail');
    // me = 1200 + 24 = 1224, bob = 1200 + 12 = 1212 (toLocaleString adds comma)
    expect(rail.textContent).toContain('1,224');
    expect(rail.textContent).toContain('1,212');
  });

  it('shows positive delta chip after a revealed round', () => {
    mockState = {
      ...base, phase: 'revealed',
      results: [
        { username: 'me', word: 'RETAIN', outcome: 'unique', basePoints: 6, points: 12 },
        { username: 'bob', word: '', outcome: 'none', basePoints: 0, points: 0 },
      ],
      scores: { me: 12, bob: 0 },
    };
    render(<SealedBidVersus socket={null} username="me" />);
    const rail = screen.getByTestId('sb-standings-rail');
    expect(rail.textContent).toContain('+12');
    // zero-point pass shows no delta
    expect(rail.textContent).not.toContain('+0');
  });
});
