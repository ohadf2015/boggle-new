/**
 * Free teachers finishing a live game must see a quiet upgrade CTA to the
 * existing /teacher/upgrade Polar path. Pro teachers keep the real report link
 * and must not see an "unlock" ask. Loading paints neither (class 1).
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const trackGrowthEvent = vi.fn();
vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: (...args: unknown[]) => trackGrowthEvent(...args),
}));

vi.mock('@/lib/analytics/lazyPosthog', () => {
  const capture = vi.fn();
  return { default: { capture }, mockCapture: capture };
});

const useTeacherPro = vi.fn(() => ({ hasPro: false, loading: false }));
vi.mock('@/hooks/useTeacherPro', () => ({
  useTeacherPro: () => useTeacherPro(),
}));

import { UnlockReportUpgradeCta, shouldShowUnlockReportUpgradeCta } from '../UnlockReportUpgradeCta';
import { ResultsPrimaryActions } from '../ResultsPrimaryActions';
import posthog from '@/lib/analytics/lazyPosthog';

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${JSON.stringify(params)}` : key;

describe('shouldShowUnlockReportUpgradeCta', () => {
  it('hides while entitlement is unknown', () => {
    expect(shouldShowUnlockReportUpgradeCta(false, true)).toBe(false);
    expect(shouldShowUnlockReportUpgradeCta(true, true)).toBe(false);
  });

  it('hides for a Pro teacher', () => {
    expect(shouldShowUnlockReportUpgradeCta(true, false)).toBe(false);
  });

  it('shows for a resolved free teacher', () => {
    expect(shouldShowUnlockReportUpgradeCta(false, false)).toBe(true);
  });
});

describe('UnlockReportUpgradeCta', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useTeacherPro.mockReturnValue({ hasPro: false, loading: false });
  });

  it('links a free teacher to /teacher/upgrade with the price in copy', () => {
    render(<UnlockReportUpgradeCta language="he" t={t} />);
    const cta = screen.getByTestId('unlock-report-upgrade-cta');
    expect(cta).toHaveAttribute('href', '/he/teacher/upgrade');
    expect(cta.textContent).toContain('education.results.unlockReport');
    expect(cta.textContent).toContain('$9');
  });

  it('does not render while loading', () => {
    useTeacherPro.mockReturnValue({ hasPro: false, loading: true });
    render(<UnlockReportUpgradeCta language="en" t={t} />);
    expect(screen.queryByTestId('unlock-report-upgrade-cta')).not.toBeInTheDocument();
  });

  it('does not render for Pro', () => {
    useTeacherPro.mockReturnValue({ hasPro: true, loading: false });
    render(<UnlockReportUpgradeCta language="en" t={t} />);
    expect(screen.queryByTestId('unlock-report-upgrade-cta')).not.toBeInTheDocument();
  });

  it('records impression and click on the existing IAP events', async () => {
    render(<UnlockReportUpgradeCta language="en" t={t} surface="teacher_card" />);
    expect(trackGrowthEvent).toHaveBeenCalledWith(
      'iap_viewed',
      expect.objectContaining({ product: 'teacher_pro', source: 'results_teacher_card' }),
    );
    await userEvent.setup().click(screen.getByTestId('unlock-report-upgrade-cta'));
    expect(trackGrowthEvent).toHaveBeenCalledWith(
      'landing_cta_clicked',
      expect.objectContaining({ cta: 'teacher_pro', source: 'results_teacher_card' }),
    );
    expect(posthog.capture).toHaveBeenCalledWith(
      'results_primary_action_clicked',
      expect.objectContaining({ action: 'unlock_report', surface: 'teacher_card' }),
    );
  });
});

describe('ResultsPrimaryActions wires the ask for free teachers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useTeacherPro.mockReturnValue({ hasPro: false, loading: false });
  });

  it('shows rematch + unlock, never the Pro report link', () => {
    render(<ResultsPrimaryActions language="en" onRematch={vi.fn()} t={t} />);
    expect(screen.getByTestId('rematch-same-list')).toBeInTheDocument();
    expect(screen.getByTestId('unlock-report-upgrade-cta')).toBeInTheDocument();
    expect(screen.queryByTestId('full-report-link')).not.toBeInTheDocument();
  });

  it('still renders the unlock CTA when rematch is absent', () => {
    render(<ResultsPrimaryActions language="en" t={t} />);
    expect(screen.getByTestId('unlock-report-upgrade-cta')).toBeInTheDocument();
  });
});
