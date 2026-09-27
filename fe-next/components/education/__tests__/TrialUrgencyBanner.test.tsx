import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

import { TrialUrgencyBanner } from '../TrialUrgencyBanner';
import type { TrialStatus } from '@/lib/education/trial';

const mk = (over: Partial<TrialStatus>): TrialStatus => ({
  expiresAt: new Date(Date.now() + 10 * 86400000).toISOString(),
  msLeft: 10 * 86400000,
  daysLeft: 10,
  hoursLeft: 240,
  isExpired: false,
  isUrgent: false,
  ...over,
});

describe('TrialUrgencyBanner', () => {
  it('renders nothing when there is no trial', () => {
    const { container } = render(<TrialUrgencyBanner trial={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows the remaining day count while active', () => {
    render(<TrialUrgencyBanner trial={mk({ daysLeft: 10 })} />);
    expect(screen.getByTestId('trial-count')).toHaveTextContent('10');
    expect(screen.getByTestId('trial-urgency-banner')).toBeInTheDocument();
  });

  it('uses the urgent headline when the trial is nearly over', () => {
    render(<TrialUrgencyBanner trial={mk({ daysLeft: 2, isUrgent: true })} />);
    expect(screen.getByTestId('trial-title')).toHaveTextContent('education.trial.urgent_title');
  });

  it('uses the calm headline when there is ample time', () => {
    render(<TrialUrgencyBanner trial={mk({ daysLeft: 10, isUrgent: false })} />);
    expect(screen.getByTestId('trial-title')).toHaveTextContent('education.trial.title');
  });

  it('counts down in hours on the final day', () => {
    render(<TrialUrgencyBanner trial={mk({ daysLeft: 1, hoursLeft: 6, isUrgent: true })} />);
    expect(screen.getByTestId('trial-count')).toHaveTextContent('6');
    expect(screen.getByTestId('trial-unit')).toHaveTextContent('education.trial.hours_left');
  });

  it('shows an ended state once the trial expires', () => {
    render(<TrialUrgencyBanner trial={mk({ isExpired: true, daysLeft: 0, hoursLeft: 0 })} />);
    expect(screen.getByTestId('trial-title')).toHaveTextContent('education.trial.expired_title');
    expect(screen.queryByTestId('trial-count')).toBeNull();
  });

  // The expired banner is the only in-app moment a teacher is asked to pay. It
  // used to link to the free access-request form, so the ask never happened.
  it('sends an expired teacher to the paid upgrade page, not back to the free form', () => {
    render(<TrialUrgencyBanner trial={mk({ isExpired: true, daysLeft: 0, hoursLeft: 0 })} />);
    const cta = screen.getByRole('link');
    expect(cta).toHaveAttribute('href', expect.stringContaining('/teacher/upgrade'));
  });

  it('does not render a dismiss control unless the caller provided one', () => {
    render(<TrialUrgencyBanner trial={mk({ daysLeft: 5 })} />);
    expect(screen.queryByTestId('trial-urgency-banner-dismiss')).toBeNull();
  });

  it('keeps the activation CTA on /teacher when this is not the upgrade nudge', () => {
    render(<TrialUrgencyBanner trial={mk({ daysLeft: 10 })} />);
    expect(screen.getByTestId('trial-urgency-banner-cta')).toHaveAttribute('href', '/en/teacher');
    expect(screen.getByTestId('trial-urgency-banner-cta')).toHaveTextContent('education.trial.cta');
  });

  it('is dismissible and sends the 7-day nudge CTA to Polar checkout', () => {
    const onDismiss = vi.fn();
    render(
      <TrialUrgencyBanner
        trial={mk({ daysLeft: 5, isUrgent: false })}
        onDismiss={onDismiss}
        ctaLabel="Upgrade to Teacher Pro"
      />,
    );
    const cta = screen.getByTestId('trial-urgency-banner-cta');
    expect(cta).toHaveAttribute('href', '/en/teacher/upgrade');
    expect(cta).toHaveTextContent('Upgrade to Teacher Pro');
    screen.getByTestId('trial-urgency-banner-dismiss').click();
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
