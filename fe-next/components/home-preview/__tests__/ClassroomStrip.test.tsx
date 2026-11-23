import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ClassroomStrip } from '../ClassroomStrip';

type Auth = { isAuthenticated: boolean; isTeacher: boolean; isAdmin: boolean; profile: object | null; loading: boolean };
let auth: Auth;
let storedSession = false;
let classrooms: { classrooms: unknown[]; isLoading: boolean; error: string | null };
let student: { classroomId: string | null; classroom: { name: string } | null; isLoading: boolean };
const useClassroomsSpy = vi.fn();
const useStudentSpy = vi.fn();
const track = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('@/utils/onboardingStorage', () => ({ hasSupabaseSession: () => storedSession }));
vi.mock('@/hooks/useClassroom', () => ({
  useClassrooms: () => {
    useClassroomsSpy();
    return classrooms;
  },
}));
vi.mock('@/hooks/useStudentClassroom', () => ({
  useStudentClassroom: () => {
    useStudentSpy();
    return student;
  },
}));
vi.mock('@/lib/animation/useScrollReveal', () => ({ useScrollReveal: () => [{ current: null }, true] }));
vi.mock('@/utils/growthTracking', () => ({ trackLandingCtaClick: (...a: unknown[]) => track(...a) }));

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${Object.values(params).join(',')}` : key;

const CLASS = { id: 'c1', name: '5B Words', join_code: 'QX7K2P', member_count: 24 };
const guest: Auth = { isAuthenticated: false, isTeacher: false, isAdmin: false, profile: null, loading: true };
const teacher: Auth = { isAuthenticated: true, isTeacher: true, isAdmin: false, profile: { user_role: 'teacher' }, loading: false };
const player: Auth = { isAuthenticated: true, isTeacher: false, isAdmin: false, profile: { user_role: 'student' }, loading: false };

const section = () => screen.getByTestId('hp-classroom');
const variant = () => section().getAttribute('data-variant');

beforeEach(() => {
  auth = guest;
  storedSession = false;
  classrooms = { classrooms: [CLASS], isLoading: false, error: null };
  student = { classroomId: null, classroom: null, isLoading: false };
  useClassroomsSpy.mockClear();
  useStudentSpy.mockClear();
  track.mockClear();
});

describe('ClassroomStrip — role-aware My classroom card', () => {
  it('Given a guest with no stored session, then the calm teacher pitch shows with Start a free class', () => {
    render(<ClassroomStrip lang="en" t={t} />);
    expect(variant()).toBe('pitch');
    expect(screen.getByRole('heading')).toHaveTextContent('homeFresh.sections.classrooms.title');
    expect(screen.getByRole('link', { name: /homeFresh.sections.classrooms.cta/ })).toHaveAttribute('href', '/en/education');
    expect(useClassroomsSpy).not.toHaveBeenCalled();
  });

  it('Given a stored session while auth resolves, then a skeleton holds the same frame and no pitch or teacher card shows', () => {
    storedSession = true;
    render(<ClassroomStrip lang="en" t={t} />);
    expect(variant()).toBe('loading');
    expect(section()).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.queryByText('homeFresh.sections.classrooms.myTitle')).toBeNull();
  });

  it('Given authed before the profile arrives, then it stays a skeleton (a teacher never flashes the student/pitch branch)', () => {
    storedSession = true;
    auth = { ...player, profile: null, loading: false };
    const { rerender } = render(<ClassroomStrip lang="en" t={t} />);
    expect(variant()).toBe('loading');
    expect(useStudentSpy).not.toHaveBeenCalled();
    auth = teacher;
    rerender(<ClassroomStrip lang="en" t={t} />);
    expect(screen.queryByTestId('hp-classroom')).toBeNull();
  });

  it('Given a guest, then the frame element is the same one across loading → pitch (no remount, no layout jump)', () => {
    storedSession = true;
    const { rerender } = render(<ClassroomStrip lang="en" t={t} />);
    const frame = section();
    storedSession = false;
    auth = { ...guest, loading: false };
    rerender(<ClassroomStrip lang="en" t={t} />);
    expect(section()).toBe(frame);
    expect(variant()).toBe('pitch');
    expect(section().innerHTML).toContain('min-h-[150px]');
  });

  it('Given a teacher, then this lower card renders nothing (their class is in the top bar)', () => {
    auth = teacher;
    render(<ClassroomStrip lang="en" t={t} />);
    expect(screen.queryByTestId('hp-classroom')).toBeNull();
  });

  it('Given a student in a class, then My class shows the class name and Open my class', () => {
    auth = player;
    student = { classroomId: 'c9', classroom: { name: 'Room 12' }, isLoading: false };
    render(<ClassroomStrip lang="en" t={t} />);
    expect(variant()).toBe('student');
    expect(screen.getByRole('heading')).toHaveTextContent('homeFresh.sections.classrooms.studentTitle');
    expect(screen.getByText('Room 12')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /homeFresh.sections.classrooms.openMyClass/ })).toHaveAttribute('href', '/en/student');
    expect(useClassroomsSpy).not.toHaveBeenCalled();
  });

  it('Given a signed-in player with no class, then the pitch shows (after the membership read, not before)', () => {
    auth = player;
    student = { classroomId: null, classroom: null, isLoading: true };
    const { rerender } = render(<ClassroomStrip lang="en" t={t} />);
    expect(variant()).toBe('loading');
    student = { classroomId: null, classroom: null, isLoading: false };
    rerender(<ClassroomStrip lang="en" t={t} />);
    expect(variant()).toBe('pitch');
  });
});
