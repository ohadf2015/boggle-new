import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TeacherProTrialChargeSoonBanner } from '../TeacherProTrialChargeSoonBanner';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, p?: Record<string, string>) => (p ? `${k}:${Object.values(p).join(',')}` : k),
    language: 'en',
  }),
}));

describe('TeacherProTrialChargeSoonBanner', () => {
  it('names the charge date and opens the retention offer on manage-or-cancel, with no dismiss', () => {
    const portal = 'https://polar.sh/lexiclash/portal?customer_session_token=x';
    render(<TeacherProTrialChargeSoonBanner chargeAt="2026-11-20T12:00:00.000Z" portalUrl={portal} />);
    expect(screen.getByText('teacher.subscription.trialChargeSoonTitle')).toBeInTheDocument();
    expect(screen.getByText('teacher.subscription.trialChargeSoonBody:November 20')).toBeInTheDocument();
    const cta = screen.getByTestId('teacher-pro-trial-charge-soon-cta');
    expect(cta).toHaveTextContent('teacher.subscription.trialManageCta');
    fireEvent.click(cta);
    expect(screen.getByTestId('cancel-offer-dialog')).toBeInTheDocument();
  });
});
