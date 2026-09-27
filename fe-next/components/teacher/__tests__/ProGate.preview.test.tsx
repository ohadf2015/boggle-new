/**
 * A locked Pro surface must show the SHAPE of what is behind it.
 *
 * Live at /en/teacher, a free teacher's Analytics section was a bare upsell
 * card — a heading, a paragraph and a price. Nothing suggested there were
 * per-student rows behind it, so the audit read the whole report as "paywalled
 * with zero preview" and could not tell the gate from an empty panel.
 *
 * The gate now renders two blurred placeholder rows in the shape of the real
 * per-student table. Deliberately placeholders and not the real rows: blur is
 * not a security boundary, and a free teacher's browser should not be sent the
 * data the gate exists to sell. They are aria-hidden so a screen reader hears
 * the offer, not decoration.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const mockPro = { hasPro: false, loading: false };

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => mockPro }));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));

import { ProGate } from '../ProGate';

describe('ProGate — the locked panel is not empty', () => {
  beforeEach(() => {
    mockPro.hasPro = false;
    mockPro.loading = false;
  });

  it('shows two blurred placeholder rows to a free teacher', () => {
    render(<ProGate feature="analytics"><div>real rows</div></ProGate>);

    const preview = screen.getByTestId('pro-gate-preview');
    expect(preview).toBeInTheDocument();
    expect(preview.querySelectorAll('[data-testid="pro-gate-preview-row"]')).toHaveLength(2);
    expect(preview.className).toMatch(/blur/);
  });

  it('never sends the gated content to a free teacher, blurred or not', () => {
    render(<ProGate feature="analytics"><div>real rows</div></ProGate>);
    expect(screen.queryByText('real rows')).not.toBeInTheDocument();
  });

  it('hides the placeholder from assistive tech', () => {
    render(<ProGate feature="analytics"><div>real rows</div></ProGate>);
    expect(screen.getByTestId('pro-gate-preview')).toHaveAttribute('aria-hidden', 'true');
  });

  it('shows the real content and no placeholder to a Pro teacher', () => {
    mockPro.hasPro = true;
    render(<ProGate feature="analytics"><div>real rows</div></ProGate>);

    expect(screen.getByText('real rows')).toBeInTheDocument();
    expect(screen.queryByTestId('pro-gate-preview')).not.toBeInTheDocument();
  });
});
