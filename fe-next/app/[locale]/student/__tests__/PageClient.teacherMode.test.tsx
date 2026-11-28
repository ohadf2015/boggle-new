import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const { mockUseAuth, mockPush, mockReplace } = vi.hoisted(() => ({ mockUseAuth: vi.fn(), mockPush: vi.fn(), mockReplace: vi.fn() }));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush, replace: mockReplace }), usePathname: () => '/en/student' }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: mockUseAuth }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, language: 'en' }) }));
vi.mock('@/hooks/useStudentClassroom', () => ({ useStudentClassroom: () => ({ classroomId: null }) }));
vi.mock('@/components/education/EducationHeader', () => ({ EducationHeader: () => null }));
vi.mock('@/components/ui/PageLoader', () => ({ PageLoader: () => <div data-testid="loader" /> }));
vi.mock('@/components/student/academy/AcademyHub', () => ({ AcademyHub: () => <div data-testid="hub" /> }));
vi.mock('@/lib/education/studentDisplayName', () => ({ resolveStudentDisplayName: () => 'Maya' }));
vi.mock('@/lib/supabase', () => ({ signOut: vi.fn() }));
const { capture } = vi.hoisted(() => ({ capture: vi.fn() }));
vi.mock('@/lib/analytics/lazyPosthog', () => ({ default: { capture } }));
vi.mock('@/components/teacher/classroom/TeacherStudentView', () => ({
  StudentView: ({ classroomId, onMissing }: { classroomId: string; onMissing: () => void }) => (
    <button type="button" data-testid="teacher-student-hub" onClick={onMissing}>{classroomId}</button>
  ),
}));
vi.mock('framer-motion', () => ({
  m: new Proxy({}, { get: () => ({ children, ...p }: { children?: React.ReactNode; [k: string]: unknown }) => React.createElement('div', p, children as React.ReactNode) }),
}));

import StudentPageClient from '../PageClient';
import { readTeacherStudentMode, startTeacherStudentMode } from '@/lib/education/teacherStudentMode';

const teacher = { user: { id: 'T' }, profile: { id: 'T', user_role: 'teacher' }, loading: false };

describe('StudentPageClient — teacher student mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('Given a teacher without student mode, Then they are sent to /teacher as before', async () => {
    mockUseAuth.mockReturnValue(teacher);
    render(<StudentPageClient />);
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/en/teacher'));
    expect(screen.queryByTestId('teacher-student-hub')).toBeNull();
  });

  it('Given a teacher in student mode for a class, Then the hub shows that class as its students see it', async () => {
    startTeacherStudentMode('c1');
    mockUseAuth.mockReturnValue(teacher);
    render(<StudentPageClient />);
    await waitFor(() => expect(screen.getByTestId('teacher-student-hub')).toHaveTextContent('c1'));
    expect(mockPush).not.toHaveBeenCalled();
    expect(screen.queryByTestId('hub')).toBeNull();
    expect(capture).not.toHaveBeenCalledWith('student_no_classroom_prompt_viewed', expect.anything());
  });

  it('Given the flagged class is not theirs, Then student mode ends and they go to /teacher', async () => {
    startTeacherStudentMode('c1');
    mockUseAuth.mockReturnValue(teacher);
    render(<StudentPageClient />);
    fireEvent.click(await screen.findByTestId('teacher-student-hub'));
    expect(readTeacherStudentMode()).toBeNull();
    expect(mockPush).toHaveBeenCalledWith('/en/teacher');
  });

  it('Given a student with a leftover flag in the tab, Then they get their own hub', async () => {
    startTeacherStudentMode('c1');
    mockUseAuth.mockReturnValue({ user: { id: 'S' }, profile: { id: 'S', user_role: 'student' }, loading: false });
    render(<StudentPageClient />);
    await waitFor(() => expect(screen.getByTestId('hub')).toBeInTheDocument());
    expect(screen.queryByTestId('teacher-student-hub')).toBeNull();
  });
});
