import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TeacherTrialWelcome } from '../TeacherTrialWelcome';

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
vi.mock('@/lib/education/postTeacherProCheckout', () => ({
  postTeacherProCheckout: (...a: unknown[]) => postTeacherProCheckout(...a),
  goToPolarCheckout: (...a: unknown[]) => goToPolarCheckout(...a),
}));

vi.mock('react-hot-toast', () => ({
  default: { error: vi.fn(), success: vi.fn() },
}));

describe('TeacherTrialWelcome', () => {
  beforeEach(() => {
    trackEduProUpgradeClicked.mockReset();
    goToPolarCheckout.mockReset();
    postTeacherProCheckout.mockReset();
    window.history.replaceState(null, '', '/en/teacher?checkout=success');
  });

  it('shows days remaining and an Upgrade CTA that POSTs paid Polar checkout', async () => {
    postTeacherProCheckout.mockResolvedValue({ ok: true, url: 'https://polar.sh/c/1' });
    const trialExpires = new Date(Date.now() + 14 * 86400000).toISOString();
    render(<TeacherTrialWelcome trialExpires={trialExpires} />);
    const dialog = screen.getByTestId('teacher-trial-welcome');
    expect(dialog).toHaveAttribute('data-days', '14');
    expect(screen.getByTestId('teacher-trial-welcome-days')).toHaveTextContent(
      'teacher.plan.trialDaysLeft:14',
    );
    fireEvent.click(screen.getByTestId('teacher-trial-welcome-upgrade'));
    await waitFor(() => {
      expect(postTeacherProCheckout).toHaveBeenCalledTimes(1);
    });
    expect(trackEduProUpgradeClicked).toHaveBeenCalledWith({ source: 'dashboard_trial_lifecycle' });
    expect(goToPolarCheckout).toHaveBeenCalledWith('https://polar.sh/c/1');
  });

  it('strips ?checkout=success on dismiss so a reload does not re-welcome', () => {
    render(<TeacherTrialWelcome trialExpires={new Date(Date.now() + 86400000).toISOString()} />);
    fireEvent.click(screen.getByTestId('teacher-trial-welcome-dismiss'));
    expect(screen.queryByTestId('teacher-trial-welcome')).not.toBeInTheDocument();
    expect(window.location.search).not.toContain('checkout');
  });
});
