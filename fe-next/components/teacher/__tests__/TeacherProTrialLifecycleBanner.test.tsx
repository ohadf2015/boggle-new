import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TeacherProTrialLifecycleBanner } from '../TeacherProTrialLifecycleBanner';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, p?: Record<string, string>) => (p ? `${k}:${Object.values(p).join(',')}` : k),
    language: 'en',
  }),
}));

const trackEduProUpgradeClicked = vi.fn();
vi.mock('@/lib/education/proFunnelTelemetry', () => ({
  trackEduProUpgradeClicked: (...a: unknown[]) => trackEduProUpgradeClicked(...a),
}));

const goToPolarCheckout = vi.fn();
const postTeacherProCheckout = vi.fn();
vi.mock('@/lib/education/postTeacherProCheckout', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  postTeacherProCheckout: (...a: unknown[]) => postTeacherProCheckout(...a),
  goToPolarCheckout: (...a: unknown[]) => goToPolarCheckout(...a),
}));

vi.mock('react-hot-toast', () => ({
  default: { error: vi.fn(), success: vi.fn() },
}));

describe('TeacherProTrialLifecycleBanner', () => {
  beforeEach(() => {
    trackEduProUpgradeClicked.mockReset();
    goToPolarCheckout.mockReset();
    postTeacherProCheckout.mockReset();
  });

  it('shows days remaining', () => {
    const trialExpires = new Date(Date.now() + 5 * 86400000).toISOString();
    render(<TeacherProTrialLifecycleBanner trialExpires={trialExpires} />);
    const banner = screen.getByTestId('teacher-pro-trial-lifecycle');
    expect(banner).toHaveAttribute('data-days', '5');
    expect(screen.getByText(/teacher.subscription.trialLifecycleTitle:5/)).toBeInTheDocument();
  });

  it('uses the today title once the trial instant has passed', () => {
    const trialExpires = new Date(Date.now() - 1000).toISOString();
    render(<TeacherProTrialLifecycleBanner trialExpires={trialExpires} />);
    expect(screen.getByTestId('teacher-pro-trial-lifecycle')).toHaveAttribute('data-days', '0');
    expect(screen.getByText('teacher.subscription.trialLifecycleTitleToday')).toBeInTheDocument();
  });

  it('says the card is charged after the trial and links to the Polar portal, not a new checkout', () => {
    const portal = 'https://polar.sh/lexiclash/portal?customer_session_token=x';
    const trialExpires = new Date(Date.now() + 5 * 86400000).toISOString();
    render(<TeacherProTrialLifecycleBanner trialExpires={trialExpires} portalUrl={portal} />);
    expect(screen.getByText('teacher.subscription.trialAutoRenewBody')).toBeInTheDocument();
    const cta = screen.getByTestId('teacher-pro-trial-lifecycle-cta');
    expect(cta).toHaveAttribute('href', portal);
    fireEvent.click(cta);
    expect(postTeacherProCheckout).not.toHaveBeenCalled();
    expect(goToPolarCheckout).not.toHaveBeenCalled();
  });
});
