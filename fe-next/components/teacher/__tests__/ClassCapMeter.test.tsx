import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, p?: Record<string, unknown>) => (p ? `${k}|${Object.values(p).join('|')}` : k), language: 'en' }),
}));
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.PropsWithChildren<{ href: string }>) => <a href={href} {...props}>{children}</a>,
}));
const pro: { hasPro: boolean; loading: boolean; accessTrialExpires?: string | null } = { hasPro: false, loading: false };
vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => pro }));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));
const mockBeaconShown = vi.fn();
const mockBeaconClicked = vi.fn();
vi.mock('@/lib/education/teacherProUpgradeBeacon', () => ({
  beaconTeacherProUpgradeShown: (...args: unknown[]) => mockBeaconShown(...args),
  beaconTeacherProUpgradeClicked: (...args: unknown[]) => mockBeaconClicked(...args),
}));

import { ClassCapMeter } from '../ClassCapMeter';
import { FREE_TIER_LIMITS } from '@/lib/education/freeTierLimits';

const LIMIT = FREE_TIER_LIMITS.classes;

beforeEach(() => {
  mockBeaconShown.mockClear();
  mockBeaconClicked.mockClear();
  Object.assign(pro, { hasPro: false, loading: false, accessTrialExpires: null });
});

describe('ClassCapMeter', () => {
  it('stays hidden for a teacher on a live access trial, matching the server cap', () => {
    pro.accessTrialExpires = new Date(Date.now() + 3 * 86_400_000).toISOString();
    const { container } = render(<ClassCapMeter count={LIMIT} />);
    expect(container.firstChild).toBeNull();
  });

  it('stays out of the way while a free teacher is well under the cap', () => {
    const { container } = render(<ClassCapMeter count={LIMIT - 2} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows how many free classes are used once one is left, without a sales button', () => {
    render(<ClassCapMeter count={LIMIT - 1} />);
    expect(screen.getByTestId('class-cap-meter').textContent).toContain(`eduPlans.cap.used|${LIMIT - 1}|${LIMIT}`);
    expect(screen.queryByTestId('class-cap-cta')).toBeNull();
  });

  it('at the cap, says so, emits shown event, and offers Pro once with click tracking', () => {
    render(<ClassCapMeter count={LIMIT} />);
    expect(screen.getByTestId('class-cap-meter').textContent).toContain(`eduPlans.cap.full|${LIMIT}`);
    expect(mockBeaconShown).toHaveBeenCalledWith(expect.objectContaining({
      placement: 'class_cap_meter',
      reason: 'free_tier_limit',
      count: LIMIT,
      limit: LIMIT,
    }));
    const cta = screen.getByTestId('class-cap-cta');
    expect(cta).toHaveAttribute('href', '/en/teacher/upgrade');
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', String(LIMIT));
    fireEvent.click(cta);
    expect(mockBeaconClicked).toHaveBeenCalledWith(expect.objectContaining({
      placement: 'class_cap_meter',
      reason: 'free_tier_limit',
      count: LIMIT,
      limit: LIMIT,
    }));
  });

  it('never shows for Pro or while the plan is loading', () => {
    pro.hasPro = true;
    const { container, rerender } = render(<ClassCapMeter count={LIMIT} />);
    expect(container.firstChild).toBeNull();
    Object.assign(pro, { hasPro: false, loading: true });
    rerender(<ClassCapMeter count={LIMIT} />);
    expect(container.firstChild).toBeNull();
  });

  it('keeps lime for the page primary action: used slots are cream, not lime', () => {
    const { container } = render(<ClassCapMeter count={LIMIT - 1} />);
    const classes = Array.from(container.querySelectorAll('*')).map((el) => (el as HTMLElement).className?.toString?.() ?? '').join(' ');
    expect(classes).not.toMatch(/(^|\s)bg-neo-lime(\s|$)/);
  });
});
