import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PendingCheckoutBanner } from '../PendingCheckoutBanner';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string) => k,
    language: 'he',
  }),
}));

describe('PendingCheckoutBanner', () => {
  const originalLocation = window.location;
  const assignMock = vi.fn();

  beforeEach(() => {
    assignMock.mockReset();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, assign: assignMock },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
    vi.restoreAllMocks();
  });

  // The iap_viewed impression lives in PageClient's banner effect (single
  // source for every dashboard banner) — this component must not self-track.
  it('renders the resume copy and CTA', () => {
    render(<PendingCheckoutBanner />);
    expect(screen.getByTestId('pending-checkout-banner')).toBeInTheDocument();
    expect(screen.getByText('teacher.subscription.pendingCheckoutTitle')).toBeInTheDocument();
    expect(screen.getByText('teacher.subscription.pendingCheckoutBody')).toBeInTheDocument();
    expect(screen.getByTestId('pending-checkout-cta')).toHaveTextContent(
      'teacher.subscription.pendingCheckoutCta',
    );
  });

  it('POSTs /api/subscription/checkout with locale and calls window.location.assign(url)', async () => {
    let resolveFetch!: (res: Response) => void;
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        }),
    );

    render(<PendingCheckoutBanner />);
    const button = screen.getByTestId('pending-checkout-cta');
    fireEvent.click(button);

    expect(button).toBeDisabled();
    expect(fetchSpy).toHaveBeenCalledWith('/api/subscription/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locale: 'he' }),
    });

    resolveFetch({
      ok: true,
      json: async () => ({ url: 'https://polar.sh/checkout/resume-1' }),
    } as Response);

    await waitFor(() => {
      expect(assignMock).toHaveBeenCalledWith('https://polar.sh/checkout/resume-1');
    });
  });

  it('keeps the banner usable when the POST fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network fail'));
    render(<PendingCheckoutBanner />);
    const button = screen.getByTestId('pending-checkout-cta');
    fireEvent.click(button);
    await waitFor(() => {
      expect(button).not.toBeDisabled();
    });
    expect(assignMock).not.toHaveBeenCalled();
  });
});
