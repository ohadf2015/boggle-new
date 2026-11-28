import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

const { mockPush, auth } = vi.hoisted(() => ({ mockPush: vi.fn(), auth: { profile: null as null | { user_role: string } } }));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }), usePathname: () => '/en/student/review' }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, language: 'en' }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ ...auth, user: { id: 'u1' } }) }));
const { prepareRehearsal } = vi.hoisted(() => ({ prepareRehearsal: vi.fn(async () => '/en/education/classroom-game?flow=quick') }));
vi.mock('@/components/teacher/home/RehearseWithBotsButton', () => ({ prepareRehearsal }));

import { TeacherStudentModeLayer } from '../TeacherStudentModeLayer';
import { readTeacherStudentMode, startTeacherStudentMode } from '@/lib/education/teacherStudentMode';

const page = <p data-testid="page">page</p>;

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  auth.profile = { user_role: 'teacher' };
});

describe('TeacherStudentModeLayer', () => {
  it('Given a teacher in student mode, Then every student page sits under a bar that says so, inside a frame that keeps fixed headers below it', () => {
    startTeacherStudentMode('c1');
    render(<TeacherStudentModeLayer>{page}</TeacherStudentModeLayer>);
    expect(screen.getByTestId('teacher-student-mode-bar')).toHaveTextContent('teacher.studentView.banner');
    expect(screen.getByTestId('page').parentElement).toHaveAttribute('data-teacher-student-mode', 'on');
  });

  it('Given the teacher taps Exit, Then student mode ends and they are back on the class page', () => {
    startTeacherStudentMode('c1');
    render(<TeacherStudentModeLayer>{page}</TeacherStudentModeLayer>);
    fireEvent.click(screen.getByTestId('teacher-student-mode-exit'));
    expect(readTeacherStudentMode()).toBeNull();
    expect(mockPush).toHaveBeenCalledWith('/en/teacher/classroom/c1');
  });

  it('Given a teacher in student mode taps Live game, Then a bot round for that class starts with the teacher in a seat', async () => {
    startTeacherStudentMode('c1');
    render(<TeacherStudentModeLayer>{page}</TeacherStudentModeLayer>);
    fireEvent.click(screen.getByTestId('teacher-student-mode-live'));
    await vi.waitFor(() => expect(mockPush).toHaveBeenCalledWith('/en/education/classroom-game?flow=quick'));
    expect(prepareRehearsal).toHaveBeenCalledWith(expect.objectContaining({ userId: 'u1', classroomId: 'c1', source: 'class', withSeat: true }));
  });

  it('Given a student, or a teacher without student mode, Then the page renders untouched', () => {
    render(<TeacherStudentModeLayer>{page}</TeacherStudentModeLayer>);
    expect(screen.queryByTestId('teacher-student-mode-bar')).toBeNull();
    startTeacherStudentMode('c1');
    auth.profile = { user_role: 'student' };
    render(<TeacherStudentModeLayer>{page}</TeacherStudentModeLayer>);
    expect(screen.queryByTestId('teacher-student-mode-bar')).toBeNull();
    for (const el of screen.getAllByTestId('page')) expect(el.parentElement).not.toHaveAttribute('data-teacher-student-mode', 'on');
  });
});
