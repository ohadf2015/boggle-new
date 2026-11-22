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
    expect(variant()).toBe('teacher');
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
    expect(section().className).toContain('min-h-');
  });

  it('Given a teacher with classes, then My classroom shows the newest class, students, code, Start and Open', () => {
    auth = teacher;
    render(<ClassroomStrip lang="en" t={t} />);
    expect(variant()).toBe('teacher');
    expect(screen.getByRole('heading')).toHaveTextContent('homeFresh.sections.classrooms.myTitle');
    expect(screen.getByText('5B Words')).toBeInTheDocument();
    expect(screen.getByText('homeFresh.sections.classrooms.studentsCount:24')).toBeInTheDocument();
    expect(screen.getByText('QX7K2P')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /homeFresh.sections.classrooms.startGame/ })).toHaveAttribute(
      'href',
      '/en/education/classroom-game?classroomId=c1'
    );
    expect(screen.getByRole('link', { name: /homeFresh.sections.classrooms.openClassroom/ })).toHaveAttribute('href', '/en/teacher');
  });

  it('Given a teacher, when they tap Start, then home_my_class_start is tracked', () => {
    auth = teacher;
    render(<ClassroomStrip lang="en" t={t} />);
    fireEvent.click(screen.getByRole('link', { name: /homeFresh.sections.classrooms.startGame/ }));
    expect(track).toHaveBeenCalledWith('home_my_class_start', { role: 'teacher' });
  });

  it('Given a teacher, when they copy the join code, then the clipboard gets it and the chip says copied', async () => {
    auth = teacher;
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    render(<ClassroomStrip lang="en" t={t} />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'homeFresh.sections.classrooms.copyCode' }));
    });
    expect(writeText).toHaveBeenCalledWith('QX7K2P');
    expect(screen.getByRole('button')).toHaveTextContent('homeFresh.sections.classrooms.copied');
  });

  it('Given a teacher whose class list is loading, then the skeleton holds the frame', () => {
    auth = teacher;
    classrooms = { classrooms: [], isLoading: true, error: null };
    render(<ClassroomStrip lang="en" t={t} />);
    expect(variant()).toBe('loading');
  });

  it('Given a teacher with no classes (or a failed read), then a simple My classroom + Open classroom card shows', () => {
    auth = teacher;
    classrooms = { classrooms: [], isLoading: false, error: 'boom' };
    render(<ClassroomStrip lang="en" t={t} />);
    expect(variant()).toBe('teacher-simple');
    expect(screen.getByRole('heading')).toHaveTextContent('homeFresh.sections.classrooms.myTitle');
    expect(screen.getByRole('link', { name: /homeFresh.sections.classrooms.openClassroom/ })).toHaveAttribute('href', '/en/teacher');
    expect(screen.queryByRole('link', { name: /startGame/ })).toBeNull();
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
