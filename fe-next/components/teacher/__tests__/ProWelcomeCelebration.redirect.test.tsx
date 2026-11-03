import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'he' }),
}));
vi.mock('@/utils/confettiUtils', () => ({ fireConfetti: vi.fn() }));
const successSeen = vi.fn();
vi.mock('@/lib/education/proFunnelTelemetry', () => ({
  trackEduProCheckoutSuccessSeen: () => successSeen(),
  trackEduProUpgradeClicked: vi.fn(),
}));

import { ProWelcomeCelebration } from '../ProWelcomeCelebration';
import { TeacherTrialWelcome } from '../TeacherTrialWelcome';
import { CHECKOUT_REDIRECT_KEY } from '@/lib/education/checkoutReturn';

const REPORT = '/he/teacher/reports?classroomId=c-1';

describe('the home welcome stays shut while the landing moves on to the report', () => {
  beforeEach(() => {
    sessionStorage.clear();
    successSeen.mockReset();
    window.history.replaceState(null, '', '/he/teacher?checkout=success');
  });

  it('paid: no home celebration and no success-seen event when heading to the report', () => {
    sessionStorage.setItem(CHECKOUT_REDIRECT_KEY, REPORT);
    render(<ProWelcomeCelebration grant={null} paid />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(successSeen).not.toHaveBeenCalled();
  });

  it('paid: celebrates on the report itself', () => {
    sessionStorage.setItem(CHECKOUT_REDIRECT_KEY, REPORT);
    window.history.replaceState(null, '', REPORT);
    render(<ProWelcomeCelebration grant={null} paid />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(successSeen).toHaveBeenCalledTimes(1);
  });

  it('paid: celebrates on home when nothing is redirecting', () => {
    render(<ProWelcomeCelebration grant={null} paid />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('trial: no home welcome when heading to the report', () => {
    sessionStorage.setItem(CHECKOUT_REDIRECT_KEY, REPORT);
    render(<TeacherTrialWelcome trialExpires={null} />);
    expect(screen.queryByTestId('teacher-trial-welcome')).not.toBeInTheDocument();
  });

  it('the return page welcome opens even before the URL catches up', () => {
    sessionStorage.setItem(CHECKOUT_REDIRECT_KEY, REPORT);
    const trial = render(<TeacherTrialWelcome trialExpires={null} onReturnPage />);
    expect(screen.getByTestId('teacher-trial-welcome')).toBeInTheDocument();
    trial.unmount();
    render(<ProWelcomeCelebration grant={null} paid onReturnPage />);
    expect(screen.getByRole('dialog', { name: 'teacher.proWelcome.title' })).toBeInTheDocument();
  });
});
