import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { SealedBidSessionSummary, buildBluffShareText } from '../SealedBidSessionSummary';
import type { RoundResult } from '@/lib/sealedBid/sp/sbEngine';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string) => k,
    locale: 'en',
  }),
}));

const HISTORY: RoundResult[] = [
  { outcome: 'unique', basePoints: 7, points: 14, playerWord: 'STAR', botWord: 'RATS' },
  { outcome: 'clash',  basePoints: 6, points: 3,  playerWord: 'ARTS', botWord: 'ARTS' },
  { outcome: 'none',   basePoints: 0, points: 0,  playerWord: null,   botWord: 'TRAP' },
  { outcome: 'unique', basePoints: 8, points: 16, playerWord: 'LAMP', botWord: 'PALM' },
  { outcome: 'clash',  basePoints: 4, points: 2,  playerWord: 'ACE',  botWord: 'ACE'  },
];

// ─── buildBluffShareText ──────────────────────────────────────────────────────

describe('buildBluffShareText', () => {
  it('includes unique count out of total', () => {
    const text = buildBluffShareText(HISTORY, 35);
    expect(text).toContain('2/5');
  });

  it('includes total score', () => {
    const text = buildBluffShareText(HISTORY, 35);
    expect(text).toContain('35');
  });

  it('includes brain emoji', () => {
    const text = buildBluffShareText(HISTORY, 35);
    expect(text).toContain('🧠');
  });

  it('includes lexiclash URL', () => {
    const text = buildBluffShareText(HISTORY, 35);
    expect(text).toMatch(/lexiclash\.live/);
  });

  it('handles all-unique history', () => {
    const allUnique: RoundResult[] = HISTORY.map((r) => ({
      ...r,
      outcome: 'unique' as const,
    }));
    const text = buildBluffShareText(allUnique, 100);
    expect(text).toContain('5/5');
  });

  it('handles empty history gracefully', () => {
    const text = buildBluffShareText([], 0);
    expect(text).toContain('0/0');
    expect(text).toMatch(/lexiclash\.live/);
  });
});

// ─── SealedBidSessionSummary component ───────────────────────────────────────

describe('SealedBidSessionSummary rendering', () => {
  it('renders the session title key', () => {
    render(<SealedBidSessionSummary history={HISTORY} totalScore={35} />);
    expect(screen.getByText('sealedBid.session.title')).toBeInTheDocument();
  });

  it('shows unique count', () => {
    render(<SealedBidSessionSummary history={HISTORY} totalScore={35} />);
    // unique=2, clash=2, pass=1 — unique count appears as the big number
    const big = screen.getByTestId('bluff-unique-count');
    expect(big.textContent).toBe('2');
  });

  it('shows total rounds', () => {
    render(<SealedBidSessionSummary history={HISTORY} totalScore={35} />);
    const total = screen.getByTestId('bluff-total-rounds');
    expect(total.textContent).toBe('/5');
  });

  it('shows clash count pill', () => {
    render(<SealedBidSessionSummary history={HISTORY} totalScore={35} />);
    expect(screen.getByTestId('bluff-clash-count').textContent).toBe('2');
  });

  it('shows pass count pill', () => {
    render(<SealedBidSessionSummary history={HISTORY} totalScore={35} />);
    expect(screen.getByTestId('bluff-pass-count').textContent).toBe('1');
  });

  it('renders share CTA button', () => {
    render(<SealedBidSessionSummary history={HISTORY} totalScore={35} />);
    expect(
      screen.getByRole('button', { name: /sealedBid\.session\.shareCta/i })
    ).toBeInTheDocument();
  });
});

describe('SealedBidSessionSummary cash-out row', () => {
  it('shows the cash-out row when coins were actually awarded', () => {
    render(
      <SealedBidSessionSummary history={HISTORY} totalScore={35} chips={40} coinsAwarded={12} />
    );
    expect(screen.getByTestId('sb-cashout')).toBeInTheDocument();
  });

  // Second session on the same day: isSoloDailyClaimed short-circuits, so
  // setCoinsAwarded never fires and coinsAwarded stays at its initial 0. The old
  // `coinsAwarded !== undefined` guard was always true, so the screen ended a
  // winning run by announcing "40 chips → 0 coins".
  it('hides the cash-out row when the daily payout was already claimed', () => {
    render(
      <SealedBidSessionSummary history={HISTORY} totalScore={35} chips={40} coinsAwarded={0} />
    );
    expect(screen.queryByTestId('sb-cashout')).not.toBeInTheDocument();
  });
});

describe('SealedBidSessionSummary round breakdown', () => {
  it('lists every round with the player word and its outcome', () => {
    render(<SealedBidSessionSummary history={HISTORY} totalScore={35} />);
    const rows = screen.getAllByTestId('sb-round-row');
    expect(rows).toHaveLength(5);
    expect(rows[0]).toHaveTextContent('STAR');
    expect(rows[0]).toHaveAttribute('data-outcome', 'unique');
    expect(rows[1]).toHaveAttribute('data-outcome', 'clash');
  });

  // `botWord` is only botPicks[0] — on a unique round it names a rival the
  // player never clashed with. Showing it would be actively wrong, so the row
  // deliberately omits it.
  it('does not print the rival word on a round the player won', () => {
    render(<SealedBidSessionSummary history={HISTORY} totalScore={35} />);
    expect(screen.getAllByTestId('sb-round-row')[0]).not.toHaveTextContent('RATS');
  });

  it('shows the signed chip delta for each round', () => {
    render(<SealedBidSessionSummary history={HISTORY} totalScore={35} />);
    const rows = screen.getAllByTestId('sb-round-row');
    expect(rows[0]).toHaveTextContent('+14');
    expect(rows[2]).toHaveTextContent('0');
  });

  it('renders nothing extra for an empty history', () => {
    render(<SealedBidSessionSummary history={[]} totalScore={0} />);
    expect(screen.queryAllByTestId('sb-round-row')).toHaveLength(0);
  });
});

describe('SealedBidSessionSummary share action', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
      writable: true,
    });
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
  });

  it('copies bluff text to clipboard when native share unavailable', async () => {
    render(<SealedBidSessionSummary history={HISTORY} totalScore={35} />);
    const btn = screen.getByRole('button', { name: /sealedBid\.session\.shareCta/i });
    fireEvent.click(btn);
    await vi.waitFor(() =>
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining('sealedBid.session.shareHeader')
      )
    );
  });

  it('shows copied confirmation after clipboard write', async () => {
    render(<SealedBidSessionSummary history={HISTORY} totalScore={35} />);
    const btn = screen.getByRole('button', { name: /sealedBid\.session\.shareCta/i });
    fireEvent.click(btn);
    await vi.waitFor(() =>
      expect(screen.getByText('sealedBid.shareCard.copied')).toBeInTheDocument()
    );
  });
});
