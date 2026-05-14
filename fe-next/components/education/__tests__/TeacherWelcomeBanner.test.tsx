/**
 * TeacherWelcomeBanner tests
 * Fix 4: In-app approval moment with dismissible banner
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TeacherWelcomeBanner } from '../TeacherWelcomeBanner';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const keys: Record<string, string> = {
        'education.teacher.welcome_banner_title': "You're approved! Welcome, teacher! 🎉",
        'education.teacher.welcome_banner_body': "Your teacher account is ready. You can now create classes, assign games, and track student progress.",
        'education.teacher.welcome_banner_dismiss': 'Got it',
      };
      return keys[key] || key;
    },
  }),
}));

describe('TeacherWelcomeBanner', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should render banner when freshly approved', () => {
    render(<TeacherWelcomeBanner hasAccess={true} />);

    expect(screen.getByText(/You're approved/i)).toBeInTheDocument();
    expect(screen.getByText(/teacher account is ready/i)).toBeInTheDocument();
  });

  it('should not render banner when user does not have access', () => {
    render(<TeacherWelcomeBanner hasAccess={false} />);

    expect(screen.queryByText(/You're approved/i)).not.toBeInTheDocument();
  });

  it('should dismiss banner and set localStorage flag', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<TeacherWelcomeBanner hasAccess={true} />);

    const dismissBtn = screen.getByText('Got it');
    await user.click(dismissBtn);

    // Banner should not render on next render
    rerender(<TeacherWelcomeBanner hasAccess={true} />);
    expect(screen.queryByText(/You're approved/i)).not.toBeInTheDocument();
  });

  it('should persist dismissal via localStorage', async () => {
    const user = userEvent.setup();
    render(<TeacherWelcomeBanner hasAccess={true} />);

    const dismissBtn = screen.getByText('Got it');
    await user.click(dismissBtn);

    // Verify localStorage was set
    expect(localStorage.getItem('teacher-welcome-banner-dismissed')).toBe('true');
  });

  it('should not show banner if already dismissed in localStorage', () => {
    localStorage.setItem('teacher-welcome-banner-dismissed', 'true');

    render(<TeacherWelcomeBanner hasAccess={true} />);

    expect(screen.queryByText(/You're approved/i)).not.toBeInTheDocument();
  });

  it('should show banner again if localStorage is cleared', () => {
    localStorage.clear();

    render(<TeacherWelcomeBanner hasAccess={true} />);

    expect(screen.getByText(/You're approved/i)).toBeInTheDocument();
  });
});
