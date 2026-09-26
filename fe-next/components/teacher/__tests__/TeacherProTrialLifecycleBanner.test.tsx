import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TeacherProTrialLifecycleBanner } from '../TeacherProTrialLifecycleBanner';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, p?: Record<string, string>) => (p ? `${k}:${Object.values(p).join(',')}` : k),
    language: 'en',
  }),
}));

describe('TeacherProTrialLifecycleBanner', () => {
  it('shows days remaining and Polar checkout at /en/teacher/upgrade', () => {
    const trialExpires = new Date(Date.now() + 5 * 86400000).toISOString();
    render(<TeacherProTrialLifecycleBanner trialExpires={trialExpires} />);
    const banner = screen.getByTestId('teacher-pro-trial-lifecycle');
    expect(banner).toHaveAttribute('data-days', '5');
    expect(screen.getByText(/teacher.subscription.trialLifecycleTitle:5/)).toBeInTheDocument();
    expect(screen.getByTestId('teacher-pro-trial-lifecycle-cta')).toHaveAttribute(
      'href',
      '/en/teacher/upgrade',
    );
  });

  it('uses the today title once the trial instant has passed', () => {
    const trialExpires = new Date(Date.now() - 1000).toISOString();
    render(<TeacherProTrialLifecycleBanner trialExpires={trialExpires} />);
    expect(screen.getByTestId('teacher-pro-trial-lifecycle')).toHaveAttribute('data-days', '0');
    expect(screen.getByText('teacher.subscription.trialLifecycleTitleToday')).toBeInTheDocument();
  });
});
