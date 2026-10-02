/**
 * A locked Pro surface shows a concrete, clearly labelled SAMPLE of what it unlocks
 * (sample class data per feature), never the teacher's own gated data.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const mockPro = { hasPro: false, loading: false };

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => mockPro }));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));

import { ProGate, PRO_FEATURES } from '../ProGate';

describe('ProGate — the locked panel previews the real feature', () => {
  beforeEach(() => {
    mockPro.hasPro = false;
    mockPro.loading = false;
  });

  it.each(PRO_FEATURES)('shows the %s sample preview, unblurred and labelled as a sample', (feature) => {
    render(<ProGate feature={feature}><div>real rows</div></ProGate>);
    const preview = screen.getByTestId('pro-gate-preview');
    expect(preview.querySelector(`[data-testid="pro-preview-${feature}"]`)).not.toBeNull();
    expect(preview.className).not.toMatch(/blur/);
    expect(preview.textContent).toContain('eg2Pro.sample.badge');
  });

  it('never sends the gated content to a free teacher', () => {
    render(<ProGate feature="analytics"><div>real rows</div></ProGate>);
    expect(screen.queryByText('real rows')).not.toBeInTheDocument();
  });

  it('offers exactly one action', () => {
    render(<ProGate feature="mastery"><div>real rows</div></ProGate>);
    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('shows the real content and no preview to a Pro teacher', () => {
    mockPro.hasPro = true;
    render(<ProGate feature="analytics"><div>real rows</div></ProGate>);
    expect(screen.getByText('real rows')).toBeInTheDocument();
    expect(screen.queryByTestId('pro-gate-preview')).not.toBeInTheDocument();
  });
});
