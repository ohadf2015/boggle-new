import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

const track = vi.hoisted(() => vi.fn());
vi.mock('@/lib/education/telemetry', () => ({ trackEduTeacherOnboardingStep: track }));

const lang = { current: 'en' };
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: lang.current, dir: lang.current === 'he' ? 'rtl' : 'ltr' }),
}));

import { TeacherHelpButton } from '../TeacherHelpButton';

beforeEach(() => {
  lang.current = 'en';
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('TeacherHelpButton', () => {
  it('renders a labelled control and shows nothing until asked', () => {
    render(<TeacherHelpButton />);
    expect(screen.getByTestId('teacher-help-button')).toHaveAttribute('aria-label', 'education.onboarding.showTutorial');
    expect(screen.queryByTestId('how-it-works')).toBeNull();
  });

  it('opens a compact how-it-works, not a second onboarding: four steps and the help center', () => {
    lang.current = 'he';
    render(<TeacherHelpButton />);
    fireEvent.click(screen.getByTestId('teacher-help-button'));
    const sheet = screen.getByTestId('how-it-works');
    for (const id of ['create', 'share', 'join', 'play']) expect(screen.getByTestId(`onboarding-step-${id}`)).toBeInTheDocument();
    expect(screen.queryByTestId('onboarding-step-results')).toBeNull();
    expect(screen.getByRole('link', { name: /eduShell.account.help/ })).toHaveAttribute('href', '/he/education/help');
    expect(sheet).not.toHaveTextContent('education.onboarding.subtitle');
    expect(track).toHaveBeenCalledWith({ step: 0, totalSteps: 4, action: 'view' });
  });

  it('closes on Got it, so the button is a toggle not a trap', () => {
    render(<TeacherHelpButton />);
    fireEvent.click(screen.getByTestId('teacher-help-button'));
    fireEvent.click(screen.getByRole('button', { name: 'education.onboarding.gotIt' }));
    expect(screen.queryByTestId('how-it-works')).toBeNull();
    expect(track).toHaveBeenLastCalledWith({ step: 3, totalSteps: 4, action: 'complete' });
  });
});
