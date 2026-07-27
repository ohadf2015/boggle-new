import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { SealedBidShareCard, buildShareText } from '../SealedBidShareCard';
import type { RoundResult } from '@/lib/sealedBid/sp/sbEngine';

// Interpolate the share-card templates that carry params (round label, share
// rows, header) so assertions can see the real "R1"/"STAR" content, exactly as
// production does; param-less keys (cta, copied, title) stay key-echoed so the
// key-based assertions keep working.
vi.mock('@/contexts/LanguageContext', () => {
  const TEMPLATES: Record<string, string> = {
    'sealedBid.shareCard.roundLabel': 'R{n}',
    'sealedBid.shareCard.row': '{round} {emoji} {playerWord} vs {botWord}{points}',
    'sealedBid.shareCard.header': '🎯 Sealed Bid — {score}pts',
  };
  return {
    useLanguage: () => ({
      t: (k: string, params?: Record<string, string | number> | string) => {
        const tmpl = TEMPLATES[k];
        if (tmpl && params && typeof params === 'object') {
          return tmpl.replace(/\{(\w+)\}/g, (m, key) =>
            params[key] !== undefined ? String(params[key]) : m,
          );
        }
        return k;
      },
      locale: 'en',
    }),
  };
});

const HISTORY: RoundResult[] = [
  { outcome: 'unique', basePoints: 7, points: 14, playerWord: 'STAR', botWord: 'RATS' },
  { outcome: 'clash',  basePoints: 6, points: 3,  playerWord: 'ARTS', botWord: 'ARTS' },
  { outcome: 'none',   basePoints: 0, points: 0,  playerWord: null,   botWord: 'TRAP' },
  { outcome: 'unique', basePoints: 8, points: 16, playerWord: 'LAMP', botWord: 'PALM' },
  { outcome: 'clash',  basePoints: 4, points: 2,  playerWord: 'ACE',  botWord: 'ACE'  },
];

// ─── buildShareText ──────────────────────────────────────────────────────────

describe('buildShareText', () => {
  it('opens with 🎯 header containing total score', () => {
    const text = buildShareText(HISTORY, 35);
    expect(text).toMatch(/🎯.*35/);
  });

  it('renders one row per round', () => {
    const text = buildShareText(HISTORY, 35);
    expect(text).toMatch(/R1/);
    expect(text).toMatch(/R5/);
  });

  it('uses ✅ for unique outcomes', () => {
    const text = buildShareText(HISTORY, 35);
    const lines = text.split('\n');
    const r1 = lines.find((l) => l.startsWith('R1'));
    expect(r1).toContain('✅');
  });

  it('uses 🤝 for clash outcomes', () => {
    const text = buildShareText(HISTORY, 35);
    const lines = text.split('\n');
    const r2 = lines.find((l) => l.startsWith('R2'));
    expect(r2).toContain('🤝');
  });

  it('uses ⬜ for none outcomes', () => {
    const text = buildShareText(HISTORY, 35);
    const lines = text.split('\n');
    const r3 = lines.find((l) => l.startsWith('R3'));
    expect(r3).toContain('⬜');
  });

  it('includes player word when present', () => {
    const text = buildShareText(HISTORY, 35);
    expect(text).toContain('STAR');
  });

  it('uses dash when player passed (null)', () => {
    const text = buildShareText(HISTORY, 35);
    const lines = text.split('\n');
    const r3 = lines.find((l) => l.startsWith('R3'));
    expect(r3).toContain('—');
  });

  it('includes points for scoring rounds', () => {
    const text = buildShareText(HISTORY, 35);
    expect(text).toContain('+14');
    expect(text).toContain('+3');
  });

  it('omits +0 for none outcomes', () => {
    const text = buildShareText(HISTORY, 35);
    const lines = text.split('\n');
    const r3 = lines.find((l) => l.startsWith('R3'));
    expect(r3).not.toContain('+0');
  });

  it('ends with a lexiclash URL', () => {
    const text = buildShareText(HISTORY, 35);
    expect(text).toMatch(/lexiclash\.live/);
  });

  it('handles empty history gracefully', () => {
    const text = buildShareText([], 0);
    expect(text).toMatch(/0/);
    expect(text).toMatch(/lexiclash\.live/);
  });
});

// ─── SealedBidShareCard component ────────────────────────────────────────────

describe('SealedBidShareCard rendering', () => {
  it('renders a row for each round', () => {
    render(<SealedBidShareCard history={HISTORY} totalScore={35} />);
    expect(screen.getByText('R1')).toBeInTheDocument();
    expect(screen.getByText('R5')).toBeInTheDocument();
  });

  it('shows player words', () => {
    render(<SealedBidShareCard history={HISTORY} totalScore={35} />);
    expect(screen.getByText('STAR')).toBeInTheDocument();
    expect(screen.getByText('LAMP')).toBeInTheDocument();
  });

  it('shows bot words', () => {
    render(<SealedBidShareCard history={HISTORY} totalScore={35} />);
    expect(screen.getAllByText('RATS').length).toBeGreaterThanOrEqual(1);
  });

  it('shows dash for null playerWord', () => {
    render(<SealedBidShareCard history={HISTORY} totalScore={35} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('shows points for scoring rounds', () => {
    render(<SealedBidShareCard history={HISTORY} totalScore={35} />);
    expect(screen.getByText('+14')).toBeInTheDocument();
  });

  it('renders the share CTA button', () => {
    render(<SealedBidShareCard history={HISTORY} totalScore={35} />);
    expect(screen.getByRole('button', { name: /sealedBid\.shareCard\.cta/i })).toBeInTheDocument();
  });
});

describe('SealedBidShareCard share action', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
      writable: true,
    });
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
  });

  it('copies to clipboard when navigator.share not available', async () => {
    render(<SealedBidShareCard history={HISTORY} totalScore={35} />);
    const btn = screen.getByRole('button', { name: /sealedBid\.shareCard\.cta/i });
    fireEvent.click(btn);
    await vi.waitFor(() =>
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining('STAR')
      )
    );
  });

  it('shows copied confirmation after clipboard write', async () => {
    render(<SealedBidShareCard history={HISTORY} totalScore={35} />);
    const btn = screen.getByRole('button', { name: /sealedBid\.shareCard\.cta/i });
    fireEvent.click(btn);
    await vi.waitFor(() =>
      expect(screen.getByText('sealedBid.shareCard.copied')).toBeInTheDocument()
    );
  });
});
