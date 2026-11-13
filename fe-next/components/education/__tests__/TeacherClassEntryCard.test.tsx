import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'he' }),
}));
const track = vi.fn();
vi.mock('@/utils/growthTracking', () => ({ trackLandingCtaClick: (...a: unknown[]) => track(...a) }));

import { TeacherClassEntryCard } from '../TeacherClassEntryCard';

describe('TeacherClassEntryCard', () => {
  it('Given a teacher on home, Then one big tap target opens the class dashboard', () => {
    render(<TeacherClassEntryCard trial={null} />);
    const link = screen.getByTestId('home-teacher-class-entry');
    expect(link).toHaveAttribute('href', '/he/teacher');
    expect(link).toHaveTextContent('education.nav.myClassroom');
    expect(screen.getByTestId('home-teacher-class-entry-cta')).toHaveTextContent('education.home.teacher_cta');
  });

  it('Then the open button shows on phones too, not only a chevron', () => {
    render(<TeacherClassEntryCard trial={null} />);
    expect(screen.getByTestId('home-teacher-class-entry-cta').className).not.toMatch(/\bhidden\b/);
  });

  it('Given a running trial, Then the countdown is visible at phone width', () => {
    const trial = { isExpired: false, isUrgent: false, daysLeft: 9, hoursLeft: 216, msLeft: 9 * 864e5, expiresAt: new Date(Date.now() + 9 * 864e5).toISOString() };
    render(<TeacherClassEntryCard trial={trial as never} />);
    expect(screen.getByTestId('home-education-trial').className).not.toMatch(/(^|\s)hidden(\s|$)/);
  });

  it('records the tap as the teacher entry', () => {
    render(<TeacherClassEntryCard trial={null} />);
    screen.getByTestId('home-teacher-class-entry').click();
    expect(track).toHaveBeenCalledWith('education_strip', { role: 'teacher', target: 'teacher', placement: 'top' });
  });
});
