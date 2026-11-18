import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PaymentFailedBanner } from '../PaymentFailedBanner';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'he' }),
}));

const trackRecoveryClicked = vi.fn();
vi.mock('@/lib/education/proFunnelTelemetry', () => ({
  trackRecoveryClicked: (...args: unknown[]) => trackRecoveryClicked(...args),
}));

describe('PaymentFailedBanner', () => {
  it('sends the teacher straight to the Polar portal in a new tab', () => {
    render(<PaymentFailedBanner portalUrl="https://polar.sh/portal/abc" stillPro />);
    const cta = screen.getByTestId('payment-failed-cta');
    expect(cta).toHaveAttribute('href', 'https://polar.sh/portal/abc');
    expect(cta).toHaveAttribute('target', '_blank');
    expect(cta).toHaveAttribute('rel', expect.stringContaining('noopener'));
    expect(cta).toHaveTextContent('teacher.subscription.paymentFailedCta');
  });

  it('deep-links a Polar portal session to the payment-update page, keeping the session', () => {
    render(
      <PaymentFailedBanner
        portalUrl="https://polar.sh/lexiclash/portal?customer_session_token=abc&email=t%40school.org"
        stillPro
      />,
    );
    const href = screen.getByTestId('payment-failed-cta').getAttribute('href')!;
    const url = new URL(href);
    expect(url.pathname).toBe('/lexiclash/portal/settings');
    expect(url.searchParams.get('customer_session_token')).toBe('abc');
    expect(url.searchParams.get('email')).toBe('t@school.org');
    expect(screen.getByTestId('payment-failed-cta')).toHaveAttribute('target', '_blank');
  });

  it('is a status region with no dismiss: it is account state, not an ad', () => {
    render(<PaymentFailedBanner portalUrl={null} stillPro />);
    expect(screen.getByTestId('payment-failed-banner')).toHaveAttribute('role', 'status');
    expect(screen.queryByRole('button', { name: /dismiss|close/i })).toBeNull();
  });

  it('says Pro is still on inside the grace window', () => {
    render(<PaymentFailedBanner portalUrl={null} stillPro />);
    expect(screen.getByText('teacher.subscription.paymentFailedBody')).toBeInTheDocument();
  });

  it('says Pro is paused once the grace window has passed', () => {
    render(<PaymentFailedBanner portalUrl={null} stillPro={false} />);
    expect(screen.getByText('teacher.subscription.paymentFailedBodyPaused')).toBeInTheDocument();
  });

  it('falls back to the portal route that opens the card form when no session was minted', () => {
    render(<PaymentFailedBanner portalUrl={null} stillPro />);
    expect(screen.getByTestId('payment-failed-cta')).toHaveAttribute(
      'href',
      '/api/subscription/portal?locale=he&intent=update-card',
    );
  });

  it('emits recovery_clicked when the retry CTA is tapped — both portal branches', () => {
    trackRecoveryClicked.mockClear();
    const { unmount } = render(<PaymentFailedBanner portalUrl="https://polar.sh/portal/abc" stillPro />);
    fireEvent.click(screen.getByTestId('payment-failed-cta'));
    expect(trackRecoveryClicked).toHaveBeenCalledWith({ surface: 'payment_failed_banner' });
    unmount();

    render(<PaymentFailedBanner portalUrl={null} stillPro />);
    fireEvent.click(screen.getByTestId('payment-failed-cta'));
    expect(trackRecoveryClicked).toHaveBeenCalledTimes(2);
  });
});
