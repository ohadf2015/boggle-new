import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'he' }),
}));
const track = vi.fn();
vi.mock('@/utils/growthTracking', () => ({ trackLandingCtaClick: (...a: unknown[]) => track(...a) }));
const rooms = vi.hoisted(() => ({ value: { classrooms: [] as unknown[], isLoading: false } }));
vi.mock('@/hooks/useClassroom', () => ({ useClassrooms: () => rooms.value }));

import { TeacherClassEntryCard } from '../TeacherClassEntryCard';

const CLASS = { id: 'c1', name: '5B English', join_code: 'QX7K2P', member_count: 24 };

describe('TeacherClassEntryCard (top of home)', () => {
  beforeEach(() => { rooms.value = { classrooms: [], isLoading: false }; track.mockClear(); });

  it('Given a teacher, Then the bar is one tap target to the classroom, tracked as the teacher entry', () => {
    render(<TeacherClassEntryCard trial={null} />);
    const link = screen.getByTestId('home-teacher-class-entry');
    expect(link).toHaveAttribute('href', '/he/teacher');
    expect(link).toHaveTextContent('education.nav.myClassroom');
    link.click();
    expect(track).toHaveBeenCalledWith('education_strip', { role: 'teacher', target: 'teacher', placement: 'top' });
  });

  it('Given a class, Then it shows the class name, the join code to copy and a Start game button to the class host', () => {
    rooms.value = { classrooms: [CLASS], isLoading: false };
    render(<TeacherClassEntryCard trial={null} />);
    expect(screen.getByTestId('home-teacher-class-name')).toHaveTextContent('5B English');
    expect(screen.getByRole('button', { name: 'homeFresh.sections.classrooms.copyCode' })).toHaveTextContent('QX7K2P');
    const start = screen.getByTestId('home-teacher-class-start');
    expect(start).toHaveAttribute('href', '/he/education/classroom-game?classroomId=c1');
  });

  it('Given no class yet, Then it stays a single compact row with no extra button row', () => {
    render(<TeacherClassEntryCard trial={null} />);
    expect(screen.queryByTestId('home-teacher-class-start')).toBeNull();
    expect(screen.queryByTestId('home-teacher-class-entry-cta')).toBeNull();
  });

  it('Given a running trial, Then the countdown is visible at phone width', () => {
    const trial = { isExpired: false, isUrgent: false, daysLeft: 9, hoursLeft: 216, msLeft: 9 * 864e5, expiresAt: new Date(Date.now() + 9 * 864e5).toISOString() };
    render(<TeacherClassEntryCard trial={trial as never} />);
    expect(screen.getByTestId('home-education-trial').className).not.toMatch(/(^|\s)hidden(\s|$)/);
  });
});
