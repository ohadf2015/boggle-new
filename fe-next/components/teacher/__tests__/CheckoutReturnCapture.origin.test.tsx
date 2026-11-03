import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

const landed = vi.fn();
vi.mock('@/lib/education/proFunnelTelemetry', () => ({
  trackEduProCheckoutReturnLanded: () => landed(),
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'he' }),
}));
const replace = vi.fn();
let pathname = '/he/teacher';
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  usePathname: () => pathname,
}));
let proState: { hasPro: boolean; loading: boolean; refresh: ReturnType<typeof vi.fn> };
vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => proState }));
vi.mock('@/components/teacher/ProWelcomeCelebration', () => ({
  ProWelcomeCelebration: ({ paid }: { paid?: boolean }) => (paid ? <div data-testid="paid-celebration" /> : null),
}));

import { CheckoutReturnCapture } from '../CheckoutReturnCapture';
import { rememberCheckoutOrigin } from '@/lib/education/checkoutReturn';

const REPORT = '/he/teacher/reports?classroomId=c-1';

describe('<CheckoutReturnCapture> sends the teacher back to where checkout started', () => {
  beforeEach(() => {
    landed.mockReset();
    replace.mockReset();
    sessionStorage.clear();
    pathname = '/he/teacher';
    proState = { hasPro: false, loading: false, refresh: vi.fn().mockResolvedValue(undefined) };
  });

  it('returns a report checkout to that report, once, with one landing beacon', () => {
    rememberCheckoutOrigin(sessionStorage, REPORT);
    window.history.pushState({}, '', '/he/teacher?checkout=success&checkout_id=x');
    const { unmount } = render(<CheckoutReturnCapture />);
    expect(replace).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith(REPORT, { scroll: false });
    expect(landed).toHaveBeenCalledTimes(1);
    unmount();
    render(<CheckoutReturnCapture />);
    expect(replace).toHaveBeenCalledTimes(1);
  });

  it('stays on the teacher home when checkout started there', () => {
    rememberCheckoutOrigin(sessionStorage, '/he/teacher');
    window.history.pushState({}, '', '/he/teacher?checkout=success');
    render(<CheckoutReturnCapture />);
    expect(replace).not.toHaveBeenCalled();
  });

  it('never returns to the plans page', () => {
    rememberCheckoutOrigin(sessionStorage, '/he/teacher/upgrade');
    window.history.pushState({}, '', '/he/teacher?checkout=success');
    render(<CheckoutReturnCapture />);
    expect(replace).not.toHaveBeenCalled();
  });

  it('celebrates the paid upgrade on the report itself, instead of the status bar', () => {
    pathname = '/he/teacher/reports';
    proState = { ...proState, hasPro: true };
    window.history.pushState({}, '', '/he/teacher/reports?classroomId=c-1&checkout=success');
    render(<CheckoutReturnCapture />);
    expect(screen.getByTestId('paid-celebration')).toBeInTheDocument();
    expect(screen.queryByTestId('checkout-return-status')).not.toBeInTheDocument();
    expect(sessionStorage.getItem('lexi_edu_checkout_return_intent')).toBeNull();
  });

  it('leaves the home celebration to the dashboard', () => {
    proState = { ...proState, hasPro: true };
    window.history.pushState({}, '', '/he/teacher?checkout=success');
    render(<CheckoutReturnCapture />);
    expect(screen.queryByTestId('paid-celebration')).not.toBeInTheDocument();
    expect(screen.getByTestId('checkout-return-status')).toHaveAttribute('data-phase', 'success');
  });
});
