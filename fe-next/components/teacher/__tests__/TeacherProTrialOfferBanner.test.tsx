import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TeacherProTrialOfferBanner } from '../TeacherProTrialOfferBanner';

const toastError = vi.fn();
vi.mock('react-hot-toast', () => ({ default: { error: (...a: unknown[]) => toastError(...a) } }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string) => k,
    language: 'en',
  }),
}));

describe('TeacherProTrialOfferBanner', () => {
  beforeEach(() => {
    toastError.mockReset();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('the primary CTA is Start 14-day free trial and POSTs { trial: true }', async () => {
    const href = 'https://polar.sh/checkout/trial';
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ url: href }),
    } as Response);
    const assign = vi.fn();
    const original = window.location;
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...original, href: 'http://localhost/en/teacher', assign },
    });

    render(<TeacherProTrialOfferBanner onDismiss={() => {}} />);
    expect(screen.getByTestId('teacher-pro-trial-offer-cta')).toHaveTextContent(
      'teacher.subscription.startTrial',
    );
    fireEvent.click(screen.getByTestId('teacher-pro-trial-offer-cta'));
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(fetch).toHaveBeenCalledWith('/api/subscription/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trial: true }),
    });
    await waitFor(() => expect(window.location.href).toBe(href));
  });

  it('toasts on 503 and does not navigate', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false, status: 503, json: async () => ({}) } as Response);
    render(<TeacherProTrialOfferBanner />);
    fireEvent.click(screen.getByTestId('teacher-pro-trial-offer-cta'));
    await waitFor(() => expect(toastError).toHaveBeenCalledWith('teacher.subscription.checkoutUnavailable'));
  });

  it('dismiss is wired', () => {
    const onDismiss = vi.fn();
    render(<TeacherProTrialOfferBanner onDismiss={onDismiss} />);
    fireEvent.click(screen.getByTestId('teacher-pro-trial-offer-dismiss'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
