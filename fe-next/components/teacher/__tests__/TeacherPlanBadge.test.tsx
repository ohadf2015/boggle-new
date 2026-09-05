import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TeacherPlanBadge } from '../TeacherPlanBadge';

const mockUseTeacherPro = vi.fn();
vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => mockUseTeacherPro() }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, p?: Record<string, string>) => (p ? `${k}:${Object.values(p).join(',')}` : k), language: 'en' }),
}));

/**
 * The one place a teacher can see, at a glance, whether they are on Pro. Both
 * states are explicit — a Pro teacher gets the lime PRO chip with the end date, a
 * free teacher gets a plain "Free plan" chip that links to the upgrade page. Nothing
 * renders while the entitlement is unknown (no flash, no false upsell).
 */
describe('TeacherPlanBadge', () => {
  it('renders nothing while loading', () => {
    mockUseTeacherPro.mockReturnValue({ hasPro: false, loading: true, source: 'polar', periodEnd: null, grant: null, grantExpired: false });
    const { container } = render(<TeacherPlanBadge />);
    expect(container).toBeEmptyDOMElement();
  });

  it('a gifted Pro teacher sees PRO, the gift, and the end date', () => {
    mockUseTeacherPro.mockReturnValue({
      hasPro: true, loading: false, source: 'admin_grant', periodEnd: '2027-09-05T12:00:00Z',
      grant: { id: 'g1', expires_at: '2027-09-05T12:00:00Z', days: 365, note: null, welcomed: true }, grantExpired: false,
    });
    render(<TeacherPlanBadge />);
    const badge = screen.getByTestId('teacher-plan-badge');
    expect(badge).toHaveAttribute('data-plan', 'pro');
    expect(screen.getByText('teacher.plan.pro')).toBeInTheDocument();
    expect(screen.getByText(/teacher.plan.giftedUntil:/)).toHaveTextContent('2027');
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('a paying Pro teacher sees PRO and the renewal date', () => {
    mockUseTeacherPro.mockReturnValue({ hasPro: true, loading: false, source: 'polar', periodEnd: '2026-10-05T12:00:00Z', grant: null, grantExpired: false });
    render(<TeacherPlanBadge />);
    expect(screen.getByTestId('teacher-plan-badge')).toHaveAttribute('data-plan', 'pro');
    expect(screen.getByText(/teacher.plan.renewsOn:/)).toBeInTheDocument();
  });

  it('a free teacher sees "Free plan" and a link to upgrade', () => {
    mockUseTeacherPro.mockReturnValue({ hasPro: false, loading: false, source: 'polar', periodEnd: null, grant: null, grantExpired: false });
    render(<TeacherPlanBadge />);
    expect(screen.getByTestId('teacher-plan-badge')).toHaveAttribute('data-plan', 'free');
    expect(screen.getByText('teacher.plan.free')).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/en/teacher/upgrade');
  });

  it('a lapsed gift says so instead of pretending it never existed', () => {
    mockUseTeacherPro.mockReturnValue({ hasPro: false, loading: false, source: 'admin_grant', periodEnd: '2026-01-01T00:00:00Z', grant: null, grantExpired: true });
    render(<TeacherPlanBadge />);
    expect(screen.getByTestId('teacher-plan-badge')).toHaveAttribute('data-plan', 'free');
    expect(screen.getByText('teacher.plan.giftEnded')).toBeInTheDocument();
  });
});
