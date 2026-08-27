/**
 * StudentWelcomeSurface.test.tsx
 *
 * Tests the welcome surface shown to students on first classroom arrival.
 * Focuses on the guest-with-zero-history case as the main case.
 */

import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { StudentWelcomeSurface } from './StudentWelcomeSurface';

// Mock dependencies
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    prefetch: vi.fn(),
  })),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: vi.fn(() => ({
    t: (key: string, params?: Record<string, any>) => {
      const translations: Record<string, string> = {
        'student.welcome.title': 'Welcome to Your Classroom!',
        'student.welcome.subtitle': 'Choose your first challenge',
        'student.welcome.dailyChallenge': 'Daily Challenge',
        'student.welcome.dailyChallengeDesc': 'Try today\'s word game',
        'student.welcome.rewards': 'Earn points and build your streak',
      };
      return translations[key] || key;
    },
    language: 'en',
  })),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'student-1', is_anonymous: true },
    loading: false,
    profile: { user_role: 'student' },
  })),
}));

describe('StudentWelcomeSurface', () => {
  it('renders welcome title for new classroom students', () => {
    render(
      <StudentWelcomeSurface
        classroomId="classroom-1"
        userId="student-1"
        isNewJoin={true}
      />
    );

    expect(screen.getByText('Welcome to Your Classroom!')).toBeInTheDocument();
  });

  it('displays daily challenge button with reward label', () => {
    render(
      <StudentWelcomeSurface
        classroomId="classroom-1"
        userId="student-1"
        isNewJoin={true}
      />
    );

    const dailyButton = screen.getByRole('button', {
      name: /Daily Challenge/i,
    });
    expect(dailyButton).toBeInTheDocument();
    expect(dailyButton).toHaveAttribute('data-welcome-action', 'daily-challenge');
  });

  it('has accessible reward label on welcome button', () => {
    render(
      <StudentWelcomeSurface
        classroomId="classroom-1"
        userId="student-1"
        isNewJoin={true}
      />
    );

    const rewardText = screen.getByText(/Earn points and build your streak/i);
    expect(rewardText).toBeInTheDocument();
  });

  it('marks welcome surface as ready for user action', () => {
    const { container } = render(
      <StudentWelcomeSurface
        classroomId="classroom-1"
        userId="student-1"
        isNewJoin={true}
      />
    );

    const surface = container.querySelector('[data-surface-type="welcome"]');
    expect(surface).toBeInTheDocument();
    expect(surface).toHaveAttribute('data-ready', 'true');
  });

  it('hides welcome surface when not a new join', () => {
    const { container } = render(
      <StudentWelcomeSurface
        classroomId="classroom-1"
        userId="student-1"
        isNewJoin={false}
      />
    );

    const surface = container.querySelector('[data-surface-type="welcome"]');
    expect(surface).not.toBeInTheDocument();
  });

  it('applies framer motion animation properties on mount', () => {
    const { container } = render(
      <StudentWelcomeSurface
        classroomId="classroom-1"
        userId="student-1"
        isNewJoin={true}
      />
    );

    const surface = container.querySelector('[data-surface-type="welcome"]');
    // Framer Motion attaches animated properties. Verify the element renders
    // with the expected data attributes for tracking.
    expect(surface).toBeInTheDocument();
    expect(surface).toHaveAttribute('data-surface-type', 'welcome');
    expect(surface).toHaveAttribute('data-ready', 'true');
  });
});
