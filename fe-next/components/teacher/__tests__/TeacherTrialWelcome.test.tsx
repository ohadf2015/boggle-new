import React from 'react';
import { describe, it, expect, vi } from 'vitest';
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
vi.mock('@/lib/education/postTeacherProCheckout', async (importOriginal) => ({
  ...(await importOriginal<object>()),
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

  it('Given a card trial just started, When the welcome shows, Then it shows days left and offers no second checkout', () => {
    const trialExpires = new Date(Date.now() + 14 * 86400000).toISOString();
    render(<TeacherTrialWelcome trialExpires={trialExpires} />);
    expect(screen.getByTestId('teacher-trial-welcome')).toHaveAttribute('data-days', '14');
    expect(screen.getByTestId('teacher-trial-welcome-days')).toHaveTextContent('teacher.plan.trialDaysLeft:14');
    expect(screen.queryByTestId('teacher-trial-welcome-upgrade')).not.toBeInTheDocument();
    expect(postTeacherProCheckout).not.toHaveBeenCalled();
  });

  it('strips ?checkout=success on dismiss so a reload does not re-welcome', () => {
    render(<TeacherTrialWelcome trialExpires={new Date(Date.now() + 86400000).toISOString()} />);
    fireEvent.click(screen.getByTestId('teacher-trial-welcome-dismiss'));
    expect(screen.queryByTestId('teacher-trial-welcome')).not.toBeInTheDocument();
    expect(window.location.search).not.toContain('checkout');
  });
});
