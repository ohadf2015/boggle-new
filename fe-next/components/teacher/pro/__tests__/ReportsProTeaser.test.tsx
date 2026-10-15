import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, p?: Record<string, unknown>) => (p ? `${k}|${Object.values(p).join('|')}` : k), language: 'en' }),
}));
const pro = { hasPro: false, loading: false, known: true, status: 'active', source: 'polar', trialUsed: false };
vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => pro }));
const trialStart = vi.fn();
const paidStart = vi.fn();
vi.mock('@/hooks/useStartTeacherProTrial', () => ({ useStartTeacherProTrial: () => ({ start: trialStart, pending: false }) }));
vi.mock('@/hooks/useTeacherProCheckout', () => ({ useTeacherProCheckout: () => ({ start: paidStart, pending: false }) }));
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.PropsWithChildren<{ href: string }>) => <a href={href} {...props}>{children}</a>,
}));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));
vi.mock('@/lib/education/proFunnelTelemetry', () => ({ trackProGateViewed: vi.fn(), trackTrialCtaView: vi.fn() }));

import { ReportsProTeaser } from '../ReportsProTeaser';

beforeEach(() => {
  Object.assign(pro, { hasPro: false, loading: false, known: true, trialUsed: false });
  trialStart.mockReset();
  paidStart.mockReset();
});

describe('ReportsProTeaser', () => {
  it('shows a free teacher a blurred sample report and one call to action', () => {
    render(<ReportsProTeaser />);
    const preview = screen.getByTestId('reports-teaser-preview');
    expect(preview).toHaveAttribute('aria-hidden', 'true');
    expect(preview.className).toMatch(/blur/);
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  it('starts the free trial when the account can still take one', () => {
    render(<ReportsProTeaser />);
    fireEvent.click(screen.getByTestId('reports-teaser-cta'));
    expect(trialStart).toHaveBeenCalled();
    expect(paidStart).not.toHaveBeenCalled();
  });

  it('goes to the paid checkout once the trial is used', () => {
    pro.trialUsed = true;
    render(<ReportsProTeaser />);
    fireEvent.click(screen.getByTestId('reports-teaser-cta'));
    expect(paidStart).toHaveBeenCalled();
  });

  it('sends a teacher to the plan page when the plan status could not be read', () => {
    pro.known = false;
    render(<ReportsProTeaser />);
    expect(screen.getByTestId('reports-teaser-cta')).toHaveAttribute('href', '/en/teacher/upgrade');
    fireEvent.click(screen.getByTestId('reports-teaser-cta'));
    expect(paidStart).not.toHaveBeenCalled();
    expect(trialStart).not.toHaveBeenCalled();
  });

  it('renders nothing for a Pro teacher or while the entitlement loads', () => {
    pro.hasPro = true;
    const { container, rerender } = render(<ReportsProTeaser />);
    expect(container.firstChild).toBeNull();
    Object.assign(pro, { hasPro: false, loading: true });
    rerender(<ReportsProTeaser />);
    expect(container.firstChild).toBeNull();
  });
});
