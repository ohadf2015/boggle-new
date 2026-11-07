import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

const nav = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), search: '' }));
const api = vi.hoisted(() => ({ createClassroom: vi.fn(), createLesson: vi.fn(), createAssignment: vi.fn() }));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${JSON.stringify(p)}` : k), language: 'en', dir: 'ltr' }),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1' }, profile: { user_role: 'teacher', display_name: 'Dana' }, loading: false }),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => nav,
  usePathname: () => '/en/teacher',
  useSearchParams: () => new URLSearchParams(nav.search),
}));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/components/education/TeacherGate', () => ({ TeacherGate: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('@/components/education/shell/TeacherAccountMenu', () => ({ TeacherAccountMenu: () => null }));
vi.mock('@/components/education/EduMascot', () => ({ EduMascot: () => null }));
vi.mock('@/components/teacher/LessonBuilder', () => ({ default: () => null }));
vi.mock('@/components/teacher/assignments', () => ({ AssignmentCreator: () => null }));
vi.mock('@/components/education/ClassSetupInvite', () => ({
  ClassSetupInvite: ({ classroomId }: { classroomId: string }) => <div data-testid="setup-step-ready">{classroomId}</div>,
}));
vi.mock('@/hooks/useClassroom', () => ({
  useClassrooms: () => ({ classrooms: [], isLoading: false, error: null, refresh: vi.fn(), createClassroom: api.createClassroom }),
}));
vi.mock('@/hooks/useVocabularyLesson', () => ({ useLessons: () => ({ lessons: [], isLoading: false, createLesson: api.createLesson }) }));
vi.mock('@/lib/supabase/education/assignments', () => ({ createAssignment: api.createAssignment }));
vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => ({ hasPro: false, loading: false, status: null, source: null, accessTrialExpires: null, refresh: vi.fn() }) }));
vi.mock('@/lib/education/useTeacherAccess', () => ({ useTeacherAccess: () => ({ trial: null, isLoading: false }) }));
vi.mock('@/hooks/useTeacherActivationProgress', () => ({
  useTeacherActivationProgress: () => ({ progress: { inviteCopied: false, liveStarted: false, roomOpened: false, dismissed: false }, ready: true, markInviteCopied: vi.fn(), dismiss: vi.fn() }),
}));
vi.mock('@/hooks/useTeacherWeekStats', () => ({ useTeacherWeekStats: () => ({ status: 'ready', summary: null }) }));
vi.mock('@/hooks/useClassStudentPreview', () => ({ useClassStudentPreview: () => null }));

import TeacherDashboard from '@/components/teacher/TeacherDashboard';
import NewClassPageClient from '../PageClient';

beforeEach(() => {
  nav.search = '';
  api.createClassroom.mockResolvedValue({ success: true, data: { id: 'c-new', name: 'Class 1', join_code: 'K7Q2', language: 'en' } });
  api.createLesson.mockResolvedValue({ success: true, data: { id: 'lesson-1' } });
  api.createAssignment.mockResolvedValue({ data: { id: 'asg-1' }, error: null });
  global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }) as unknown as typeof fetch;
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('First class journey', () => {
  it('Given a new teacher with zero classes, Then Home, class setup and the invite are the only screens to a class with a join code and one assignment', async () => {
    const screens: string[] = [];

    render(<TeacherDashboard />);
    screens.push('/en/teacher');
    const cta = screen.getByTestId('home-onboarding-cta');
    const setupHref = cta.getAttribute('href') as string;
    expect(setupHref).toBe('/en/teacher/classroom/new');
    cleanup();

    screens.push(setupHref);
    render(<NewClassPageClient />);
    fireEvent.click(screen.getByTestId('setup-start-live'));
    await waitFor(() => expect(nav.replace).toHaveBeenCalledTimes(1));
    const inviteHref = nav.replace.mock.calls[0][0] as string;
    expect(inviteHref).toMatch(/^\/en\/teacher\/classroom\/new\?classroomId=c-new&pack=[^&]+&lessonId=lesson-1$/);
    cleanup();

    screens.push(inviteHref);
    nav.search = inviteHref.split('?')[1];
    render(<NewClassPageClient />);
    expect(screen.getByTestId('setup-step-ready')).toHaveTextContent('c-new');

    expect(api.createClassroom).toHaveBeenCalledTimes(1);
    expect(api.createAssignment).toHaveBeenCalledTimes(1);
    expect(api.createAssignment).toHaveBeenCalledWith(expect.objectContaining({ classroom_id: 'c-new', lesson_id: 'lesson-1' }));
    expect(nav.push).not.toHaveBeenCalled();
    expect(api.createLesson).toHaveBeenCalledTimes(1);
    expect(screens).toHaveLength(3);
  });

  it('Given the invite link is reopened for an existing class, Then no class or assignment is created again', () => {
    nav.search = 'classroomId=c-old';
    render(<NewClassPageClient />);
    expect(screen.getByTestId('setup-step-ready')).toHaveTextContent('c-old');
    expect(api.createClassroom).not.toHaveBeenCalled();
    expect(api.createLesson).not.toHaveBeenCalled();
    expect(api.createAssignment).not.toHaveBeenCalled();
  });
});
