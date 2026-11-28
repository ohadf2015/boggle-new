import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const { mockReplace, mockPush, classes, prepareRehearsal } = vi.hoisted(() => ({
  mockReplace: vi.fn(),
  mockPush: vi.fn(),
  classes: { list: [] as Array<{ id: string; name: string }>, loading: false, error: null as string | null },
  prepareRehearsal: vi.fn(async () => '/en/education/classroom-game?flow=x'),
}));

vi.mock('@/components/student/academy/AcademyHubView', () => ({
  AcademyHubView: (p: { classroomName: string | null; data: { lessons: unknown[] }; liveGame: { rehearsal?: boolean; teacherName: string } | null; join: () => void }) => (
    <button type="button" data-testid="academy-hub" data-live={p.liveGame?.rehearsal ? p.liveGame.teacherName : ''} onClick={p.join}>
      {`${p.classroomName}:${p.data.lessons.length}`}
    </button>
  ),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: mockReplace, push: mockPush }) }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, language: 'en' }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'T' }, profile: { display_name: 'Ms Cohen' } }) }));
vi.mock('@/components/education/TeacherGate', () => ({ TeacherGate: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('@/hooks/useClassroom', () => ({ useClassrooms: () => ({ classrooms: classes.list, isLoading: classes.loading, error: classes.error, refresh: vi.fn() }) }));
vi.mock('@/hooks/useAssignments', () => ({ useAssignments: () => ({ assignments: [], isLoading: false, error: null, refresh: vi.fn() }) }));
vi.mock('@/components/teacher/home/RehearseWithBotsButton', () => ({ prepareRehearsal }));
vi.mock('@/components/ui/PageLoader', () => ({ PageLoader: () => <div data-testid="loader" /> }));

import { StudentView, StudentViewFrame, TeacherStudentView } from '../TeacherStudentView';
import { readTeacherStudentMode } from '@/lib/education/teacherStudentMode';

const t = (k: string) => k;
const base = { userId: 'u1', classroomId: 'c1', classroomName: '7B English', lessons: [{ lessonId: 'l1', status: 'assigned' as const }], error: false, onRetry: vi.fn(), t };

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  classes.list = [{ id: 'c1', name: '7B English' }];
  classes.loading = false;
  classes.error = null;
});

describe('StudentViewFrame', () => {
  it('Given a class with lessons, Then the teacher sees the real student academy for that class, led by the next lesson like a student, not a made-up live game', () => {
    render(<StudentViewFrame {...base} />);
    expect(screen.getByTestId('academy-hub')).toHaveTextContent('7B English:1');
    expect(screen.getByTestId('academy-hub')).toHaveAttribute('data-live', '');
  });

  it('Given the lessons failed to load, Then it says so with a retry instead of an empty map', () => {
    const onRetry = vi.fn();
    render(<StudentViewFrame {...base} error onRetry={onRetry} />);
    expect(screen.queryByTestId('academy-hub')).toBeNull();
    fireEvent.click(screen.getByTestId('student-view-retry'));
    expect(onRetry).toHaveBeenCalled();
  });
});

describe('TeacherStudentView (the class page link)', () => {
  it('Given a teacher opens the student view, Then student mode is on for that class and they land in the student app', () => {
    render(<TeacherStudentView classroomId="c1" />);
    expect(readTeacherStudentMode()).toEqual({ classroomId: 'c1' });
    expect(mockReplace).toHaveBeenCalledWith('/en/student');
  });
});

describe('StudentView (the student hub in student mode)', () => {
  it('Given the class is not one of the teacher’s, Then it hands back instead of rendering', async () => {
    classes.list = [{ id: 'other', name: 'Other' }];
    const onMissing = vi.fn();
    render(<StudentView classroomId="c1" onMissing={onMissing} />);
    await waitFor(() => expect(onMissing).toHaveBeenCalled());
    expect(screen.queryByTestId('academy-hub')).toBeNull();
  });

  it('Given the class list failed to load, Then a retry shows and the teacher is not sent away', async () => {
    classes.list = [];
    classes.error = 'Failed to load classrooms';
    const onMissing = vi.fn();
    render(<StudentView classroomId="c1" onMissing={onMissing} />);
    expect(screen.getByTestId('student-view-retry')).toBeInTheDocument();
    expect(onMissing).not.toHaveBeenCalled();
  });

});
