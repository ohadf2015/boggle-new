import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TeacherProTrialExpiringBanner } from '../TeacherProTrialExpiringBanner';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

const capture = vi.hoisted(() => vi.fn());
vi.mock('@/lib/analytics/lazyPosthog', () => ({ default: { capture } }));

const postTeacherProCheckout = vi.fn();
vi.mock('@/lib/education/postTeacherProCheckout', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  postTeacherProCheckout: (...a: unknown[]) => postTeacherProCheckout(...a),
}));

const expiresIn = (days: number) => new Date(Date.now() + days * 86_400_000 - 60_000).toISOString();
const PORTAL = 'https://polar.sh/lexiclash/portal?customer_session_token=x';

describe('TeacherProTrialExpiringBanner', () => {
  beforeEach(() => {
    capture.mockReset();
    postTeacherProCheckout.mockReset();
  });

  it('Given 3 days left, Then it says the card is charged after the trial and links to manage or cancel', () => {
    render(<TeacherProTrialExpiringBanner trialExpires={expiresIn(3)} portalUrl={PORTAL} />);
    expect(screen.getByText('teacher.subscription.trialAutoRenewBody')).toBeInTheDocument();
    const cta = screen.getByTestId('teacher-pro-trial-expiring-cta');
    expect(cta).toHaveTextContent('teacher.subscription.trialManageCta');
    expect(cta).toHaveAttribute('href', PORTAL);
    expect(cta).toHaveAttribute('target', '_blank');
    expect(capture).toHaveBeenCalledWith('teacher_trial_expiring_shown', { days_remaining: 3 });
  });

  it('Given a trialing teacher taps the CTA, Then no second (paid) checkout starts', () => {
    render(<TeacherProTrialExpiringBanner trialExpires={expiresIn(2)} portalUrl={PORTAL} />);
    fireEvent.click(screen.getByTestId('teacher-pro-trial-expiring-cta'));
    expect(postTeacherProCheckout).not.toHaveBeenCalled();
  });

  it('Given no portal link yet, Then the CTA opens the plan page in-app', () => {
    render(<TeacherProTrialExpiringBanner trialExpires={expiresIn(2)} portalUrl={null} />);
    const cta = screen.getByTestId('teacher-pro-trial-expiring-cta');
    expect(cta).toHaveAttribute('href', '/en/teacher/upgrade');
    expect(cta).not.toHaveAttribute('target');
  });

  it('Given more than 4 days left, Then it renders nothing', () => {
    const { container } = render(<TeacherProTrialExpiringBanner trialExpires={expiresIn(8)} portalUrl={PORTAL} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('Given it is dismissed, Then it hides and tells the parent', () => {
    const onDismiss = vi.fn();
    render(<TeacherProTrialExpiringBanner trialExpires={expiresIn(2)} portalUrl={PORTAL} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByTestId('teacher-pro-trial-expiring-dismiss'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('teacher-pro-trial-expiring')).toBeNull();
  });
});
