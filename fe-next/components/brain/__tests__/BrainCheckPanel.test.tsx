import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/utils/ThemeContext', () => ({ useTheme: () => ({ theme: 'dark' }) }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${JSON.stringify(p)}` : k), language: 'en' }),
}));

import BrainCheckPanel from '../BrainCheckPanel';
import { summarizeBrainChecks } from '@/shared/utils/brainCheck';

const now = Date.now();
const summary = summarizeBrainChecks([
  { drill_type: 'lightning-round', score: 0, duration_seconds: 45, words_found: 9, extra_data: { benchmark: true }, created_at: new Date(now - 3 * 3600_000).toISOString() },
], now);

beforeEach(() => {
  global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ checks: summary }) }) as never;
});

describe('BrainCheckPanel', () => {
  it('lists the 4 measured drills; an available one links to the fixed-protocol check', async () => {
    render(<BrainCheckPanel />);
    await waitFor(() => expect(screen.getAllByTestId('brain-check-row')).toHaveLength(4));
    const link = screen.getByRole('link', { name: /brain.drills.memory-hunt.name/ });
    expect(link).toHaveAttribute('href', '/en/brain/drills/memory-hunt?check=1');
  });

  it('a drill checked 3h ago shows a cooldown instead of a start link', async () => {
    render(<BrainCheckPanel />);
    await waitFor(() => expect(screen.getByText(/brain.check.nextIn/)).toBeInTheDocument());
    expect(screen.queryByRole('link', { name: /brain.drills.lightning-round.name/ })).not.toBeInTheDocument();
  });

  it('always explains the method and its limits', () => {
    render(<BrainCheckPanel />);
    expect(screen.getByText('brain.check.howItWorks')).toBeInTheDocument();
    expect(screen.getByText('brain.check.method.transfer')).toBeInTheDocument();
  });

  it('shows a retry-able notice when loading fails, not a blank panel', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false }) as never;
    render(<BrainCheckPanel />);
    await waitFor(() => expect(screen.getByText('brain.check.loadFailed')).toBeInTheDocument());
  });
});
