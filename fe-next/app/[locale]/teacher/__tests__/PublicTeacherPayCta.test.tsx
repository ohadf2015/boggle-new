import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PublicTeacherPayCta } from '../PublicTeacherPayCta';
import { TEACHER_PRO_PRICE_USD } from '@/lib/education/freeTierLimits';
import { TEACHER_PRO_CHECKOUT_PATH } from '@/components/education/TeacherProCheckoutCta';

const mockUseAuth = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('PublicTeacherPayCta', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('SSRs the Teacher Pro CTA with $9/mo and /teacher/upgrade while auth is loading', () => {
    mockUseAuth.mockReturnValue({ profile: null, loading: true });
    render(<PublicTeacherPayCta locale="en" />);
    const root = screen.getByTestId('public-teacher-pay-cta');
    expect(root.textContent).toContain('Teacher Pro');
    expect(root.textContent).toContain(`$${TEACHER_PRO_PRICE_USD}`);
    const link = screen.getByTestId('teacher-pro-checkout-link');
    expect(link).toHaveAttribute('href', `/en${TEACHER_PRO_CHECKOUT_PATH}`);
  });

  it('keeps the CTA for unsigned visitors after auth settles', () => {
    mockUseAuth.mockReturnValue({ profile: null, loading: false });
    render(<PublicTeacherPayCta locale="en" />);
    expect(screen.getByTestId('public-teacher-pay-cta')).toBeInTheDocument();
  });

  it('hides once a teacher profile resolves (signed-in HQ is a different card)', () => {
    mockUseAuth.mockReturnValue({
      profile: { user_role: 'teacher' },
      loading: false,
    });
    render(<PublicTeacherPayCta locale="en" />);
    expect(screen.queryByTestId('public-teacher-pay-cta')).not.toBeInTheDocument();
  });
});
