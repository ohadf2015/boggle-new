import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TrialUrgencyBanner } from '../TrialUrgencyBanner';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      // Return the key itself for testing, but handle the specific trial copy
      if (key === 'education.trial.expired_title') return 'Your teacher trial has ended';
      if (key === 'education.trial.expired_body') return 'Your free trial window is over. Upgrade to Pro for unlimited classroom access.';
      if (key === 'teacher.subscription.upgradeNow') return 'Upgrade to Pro Now';
      return key;
    },
    language: 'en',
  }),
}));

describe('TrialUrgencyBanner expired copy', () => {
  it('shows the expired title for an expired trial', () => {
    const expiredTrial = {
      expiresAt: '2026-01-01T00:00:00Z',
      msLeft: -100000,
      daysLeft: 0,
      hoursLeft: 0,
      isExpired: true,
      isUrgent: false,
    };

    render(<TrialUrgencyBanner trial={expiredTrial} />);

    expect(screen.getByText('Your teacher trial has ended')).toBeInTheDocument();
  });

  it('shows the specific expired body copy (not the generic upgrade description)', () => {
    const expiredTrial = {
      expiresAt: '2026-01-01T00:00:00Z',
      msLeft: -100000,
      daysLeft: 0,
      hoursLeft: 0,
      isExpired: true,
      isUrgent: false,
    };

    render(<TrialUrgencyBanner trial={expiredTrial} />);

    // Should use education.trial.expired_body, not teacher.subscription.upgradeProDescription
    expect(screen.getByText('Your free trial window is over. Upgrade to Pro for unlimited classroom access.')).toBeInTheDocument();
    expect(screen.queryByText('Pro gives you unlimited classrooms')).not.toBeInTheDocument();
  });

  it('shows the upgrade button with appropriate copy', () => {
    const expiredTrial = {
      expiresAt: '2026-01-01T00:00:00Z',
      msLeft: -100000,
      daysLeft: 0,
      hoursLeft: 0,
      isExpired: true,
      isUrgent: false,
    };

    render(<TrialUrgencyBanner trial={expiredTrial} />);

    expect(screen.getByRole('link')).toHaveAttribute('href', '/en/teacher/upgrade');
    expect(screen.getByText('Upgrade to Pro Now')).toBeInTheDocument();
  });
});
