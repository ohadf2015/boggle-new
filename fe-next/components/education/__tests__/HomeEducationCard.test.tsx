import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

import { HomeEducationCard } from '../HomeEducationCard';
import type { TrialStatus } from '@/lib/education/trial';

const trial = (over: Partial<TrialStatus>): TrialStatus => ({
  expiresAt: new Date(Date.now() + 12 * 86400000).toISOString(),
  msLeft: 12 * 86400000,
  daysLeft: 12,
  hoursLeft: 288,
  isExpired: false,
  isUrgent: false,
  ...over,
});

describe('HomeEducationCard (presentational)', () => {
  describe('teacher', () => {
    it('renders the teacher card linking to the teacher dashboard', () => {
      render(<HomeEducationCard role="teacher" />);
      const card = screen.getByTestId('home-education-card');
      expect(card).toBeInTheDocument();
      expect(card).toHaveAttribute('href', '/en/teacher');
      expect(screen.getByTestId('home-education-title')).toHaveTextContent(
        'education.home.teacher_title'
      );
    });

    it('shows the whole-day trial countdown while there is ample time left', () => {
      render(<HomeEducationCard role="teacher" trial={trial({ daysLeft: 12 })} />);
      expect(screen.getByTestId('home-education-trial')).toBeInTheDocument();
      expect(screen.getByTestId('home-education-trial-count')).toHaveTextContent('12');
      expect(screen.getByTestId('home-education-trial-unit')).toHaveTextContent(
        'education.trial.days_left'
      );
    });

    it('counts down in hours on the final day', () => {
      render(
        <HomeEducationCard role="teacher" trial={trial({ daysLeft: 1, hoursLeft: 5, isUrgent: true })} />
      );
      expect(screen.getByTestId('home-education-trial-count')).toHaveTextContent('5');
      expect(screen.getByTestId('home-education-trial-unit')).toHaveTextContent(
        'education.trial.hours_left'
      );
    });

    it('shows an ended state once the trial expires', () => {
      render(
        <HomeEducationCard role="teacher" trial={trial({ isExpired: true, daysLeft: 0, hoursLeft: 0 })} />
      );
      expect(screen.getByTestId('home-education-trial')).toHaveTextContent(
        'education.home.trial_ended'
      );
      expect(screen.queryByTestId('home-education-trial-count')).toBeNull();
    });

    it('renders no trial pill when there is no trial (unbounded access)', () => {
      render(<HomeEducationCard role="teacher" trial={null} />);
      expect(screen.queryByTestId('home-education-trial')).toBeNull();
    });
  });

  describe('student', () => {
    it('renders the student card linking to the student dashboard', () => {
      render(<HomeEducationCard role="student" classroomName="Room 12" />);
      const card = screen.getByTestId('home-education-card');
      expect(card).toHaveAttribute('href', '/en/student');
      expect(screen.getByTestId('home-education-title')).toHaveTextContent(
        'education.home.student_title'
      );
    });

    it('surfaces the classroom name when provided', () => {
      render(<HomeEducationCard role="student" classroomName="Room 12" />);
      expect(screen.getByTestId('home-education-subtitle')).toHaveTextContent('Room 12');
    });

    it('never shows a trial pill for students', () => {
      render(
        <HomeEducationCard role="student" classroomName="Room 12" trial={trial({ daysLeft: 3 })} />
      );
      expect(screen.queryByTestId('home-education-trial')).toBeNull();
    });
  });
});
