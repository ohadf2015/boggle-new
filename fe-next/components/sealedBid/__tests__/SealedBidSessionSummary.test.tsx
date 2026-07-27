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
