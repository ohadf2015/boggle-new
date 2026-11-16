import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TeacherWinbackBanner } from '../TeacherWinbackBanner';

const trackTeacherWinbackShown = vi.fn();
const trackTeacherWinbackClicked = vi.fn();
const trackTeacherWinbackDismissed = vi.fn();
vi.mock('@/lib/education/teacherWinbackTelemetry', () => ({
  trackTeacherWinbackShown: () => trackTeacherWinbackShown(),
  trackTeacherWinbackClicked: () => trackTeacherWinbackClicked(),
  trackTeacherWinbackDismissed: () => trackTeacherWinbackDismissed(),
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

const useLanguage = vi.fn(() => ({ t: (k: string) => k, language: 'en' }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => useLanguage(),
}));

const BODY = 'Your 14-day free Teacher Pro trial is waiting — set up your first class in 2 minutes';

describe('TeacherWinbackBanner', () => {
  beforeEach(() => {
    trackTeacherWinbackShown.mockReset();
    trackTeacherWinbackClicked.mockReset();
    trackTeacherWinbackDismissed.mockReset();
    goToPolarCheckout.mockReset();
    postTeacherProCheckout.mockReset();
    useLanguage.mockReturnValue({ t: (k: string) => k, language: 'en' });
  });

  it('tells an approved teacher the 14-day trial is waiting, and records that it was shown', () => {
    render(<TeacherWinbackBanner approved />);
    expect(screen.getByTestId('teacher-winback')).toHaveTextContent(BODY);
    expect(screen.getByTestId('teacher-winback-cta')).toHaveTextContent('Start 14-day free trial');
    expect(trackTeacherWinbackShown).toHaveBeenCalledTimes(1);
  });

  it('renders nothing for anyone who is not an approved teacher, and does not record a show', () => {
    render(<TeacherWinbackBanner approved={false} />);
    expect(screen.queryByTestId('teacher-winback')).not.toBeInTheDocument();
    expect(trackTeacherWinbackShown).not.toHaveBeenCalled();
  });

  it('starts the Polar trial from the CTA and records the click', async () => {
    postTeacherProCheckout.mockResolvedValue({ ok: true, url: 'https://polar.sh/c/winback' });
    render(<TeacherWinbackBanner approved />);
    fireEvent.click(screen.getByTestId('teacher-winback-cta'));
    expect(trackTeacherWinbackClicked).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(postTeacherProCheckout).toHaveBeenCalledTimes(1);
    });
    expect(postTeacherProCheckout).toHaveBeenCalledWith(fetch, {
      trial: true,
      locale: 'en',
      placement: 'dashboard_teacher_winback',
    });
    expect(goToPolarCheckout).toHaveBeenCalledWith('https://polar.sh/c/winback');
  });

  it('persists dismiss and records it', () => {
    const onDismiss = vi.fn();
    render(<TeacherWinbackBanner approved onDismiss={onDismiss} />);
    fireEvent.click(screen.getByTestId('teacher-winback-dismiss'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(trackTeacherWinbackDismissed).toHaveBeenCalledTimes(1);
  });

  it('reads right-to-left in Hebrew', () => {
    useLanguage.mockReturnValue({ t: (k: string) => k, language: 'he' });
    render(<TeacherWinbackBanner approved />);
    expect(screen.getByTestId('teacher-winback')).toHaveAttribute('dir', 'rtl');
    expect(screen.getByTestId('teacher-winback')).toHaveTextContent('ניסיון');
  });
});
