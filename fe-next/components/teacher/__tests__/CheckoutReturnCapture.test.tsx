import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';

const trackEduProCheckoutReturnLanded = vi.fn();
vi.mock('@/lib/education/proFunnelTelemetry', () => ({
  trackEduProCheckoutReturnLanded: () => trackEduProCheckoutReturnLanded(),
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
const replace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  usePathname: () => '/en/teacher',
}));

let proState: { hasPro: boolean; loading: boolean; refresh: ReturnType<typeof vi.fn> };
vi.mock('@/hooks/useTeacherPro', () => ({
  useTeacherPro: () => proState,
}));

import { CheckoutReturnCapture } from '../CheckoutReturnCapture';

describe('<CheckoutReturnCapture>', () => {
  beforeEach(() => {
    trackEduProCheckoutReturnLanded.mockReset();
    replace.mockReset();
    sessionStorage.clear();
    window.history.pushState({}, '', '/en/teacher');
    proState = { hasPro: false, loading: false, refresh: vi.fn().mockResolvedValue(undefined) };
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('records the return and shows activating before any grant is visible', () => {
    window.history.pushState({}, '', '/en/teacher?checkout=success');
    render(<CheckoutReturnCapture />);
    expect(trackEduProCheckoutReturnLanded).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('checkout-return-status')).toHaveAttribute('data-phase', 'activating');
    expect(sessionStorage.getItem('lexi_edu_checkout_return_intent')).toBeTruthy();
  });

  it('does not record a normal teacher visit', () => {
    render(<CheckoutReturnCapture />);
    expect(trackEduProCheckoutReturnLanded).not.toHaveBeenCalled();
    expect(screen.queryByTestId('checkout-return-status')).not.toBeInTheDocument();
  });

  it('shows success when the server grant is already visible, without a second track on intent replay', () => {
    sessionStorage.setItem('lexi_edu_checkout_return_intent', String(Date.now()));
    proState = { ...proState, hasPro: true };
    render(<CheckoutReturnCapture />);
    expect(trackEduProCheckoutReturnLanded).not.toHaveBeenCalled();
    expect(screen.getByTestId('checkout-return-status')).toHaveAttribute('data-phase', 'success');
  });

  it('shows failure after the poll budget and retries without granting', () => {
    vi.useFakeTimers();
    window.history.pushState({}, '', '/en/teacher/upgrade?checkout=success');
    render(<CheckoutReturnCapture />);
    act(() => { vi.advanceTimersByTime(2_000 * 8); });
    expect(screen.getByTestId('checkout-return-status')).toHaveAttribute('data-phase', 'failure');
    expect(proState.refresh).toHaveBeenCalled();
    act(() => { screen.getByTestId('checkout-return-retry').click(); });
    expect(proState.refresh).toHaveBeenCalled();
    expect(screen.getByTestId('checkout-return-status')).toHaveAttribute('data-phase', 'activating');
  });
});
