import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, p?: Record<string, unknown>) => (p ? `${k}|${Object.values(p).join('|')}` : k), language: 'en' }),
}));
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.PropsWithChildren<{ href: string }>) => <a href={href} {...props}>{children}</a>,
}));
const pro = { hasPro: false, loading: false };
vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => pro }));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));

import { ClassCapMeter } from '../ClassCapMeter';
import { FREE_TIER_LIMITS } from '@/lib/education/freeTierLimits';

const LIMIT = FREE_TIER_LIMITS.classes;

beforeEach(() => Object.assign(pro, { hasPro: false, loading: false }));

describe('ClassCapMeter', () => {
  it('stays out of the way while a free teacher is well under the cap', () => {
    const { container } = render(<ClassCapMeter count={LIMIT - 2} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows how many free classes are used once one is left, without a sales button', () => {
    render(<ClassCapMeter count={LIMIT - 1} />);
    expect(screen.getByTestId('class-cap-meter').textContent).toContain(`eduPlans.cap.used|${LIMIT - 1}|${LIMIT}`);
    expect(screen.queryByTestId('class-cap-cta')).toBeNull();
  });

  it('at the cap, says so and offers Pro once, pointing at the plan page', () => {
    render(<ClassCapMeter count={LIMIT} />);
    expect(screen.getByTestId('class-cap-meter').textContent).toContain(`eduPlans.cap.full|${LIMIT}`);
    expect(screen.getByTestId('class-cap-cta')).toHaveAttribute('href', '/en/teacher/upgrade');
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', String(LIMIT));
  });

  it('never shows for Pro or while the plan is loading', () => {
    pro.hasPro = true;
    const { container, rerender } = render(<ClassCapMeter count={LIMIT} />);
    expect(container.firstChild).toBeNull();
    Object.assign(pro, { hasPro: false, loading: true });
    rerender(<ClassCapMeter count={LIMIT} />);
    expect(container.firstChild).toBeNull();
  });
});
