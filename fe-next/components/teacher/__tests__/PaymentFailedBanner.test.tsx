import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PaymentFailedBanner } from '../PaymentFailedBanner';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'he' }),
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

  it('falls back to the localized plan page when no portal URL came back', () => {
    render(<PaymentFailedBanner portalUrl={null} stillPro />);
    expect(screen.getByTestId('payment-failed-cta')).toHaveAttribute('href', '/he/teacher/upgrade');
  });
});
