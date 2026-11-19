import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${JSON.stringify(p)}` : k), language: 'en', dir: 'ltr' }),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1' }, profile: { user_role: 'teacher', display_name: 'Dana Levi' }, loading: false }),
}));
let search = '';
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/en/teacher',
  useSearchParams: () => new URLSearchParams(search),
}));
vi.mock('@/components/education/shell/TeacherAccountMenu', () => ({ TeacherAccountMenu: () => null }));
vi.mock('@/components/teacher/LessonBuilder', () => ({ default: () => null }));
vi.mock('@/components/teacher/assignments', () => ({ AssignmentCreator: () => null }));
vi.mock('@/lib/education/telemetry', async (orig) => ({ ...(await orig<Record<string, unknown>>()), trackEduTeacherDashboardViewed: vi.fn() }));
vi.mock('@/components/teacher/hq/useClassRoster', () => ({
  useClassRoster: () => ({ students: [], arrivals: [], loading: false }),
}));
vi.mock('@/components/teacher/hq/useHqJuice', () => ({
  useHqJuice: () => ({ reduced: true, sfx: { playPlayerJoinedSound: vi.fn(), playButtonClickSound: vi.fn() } }),
}));
vi.mock('@/components/teacher/hq/HqProjectorSheet', () => ({
  HqProjectorSheet: ({ classroom }: { classroom: { join_code: string } }) => <div data-testid="projector-sheet">{classroom.join_code}</div>,
}));

const fetchWithAuth = vi.fn();
vi.mock('@/utils/authFetch', () => ({ fetchWithAuth: (...a: unknown[]) => fetchWithAuth(...a) }));

let classroomsState: Record<string, unknown>;
vi.mock('@/hooks/useClassroom', () => ({ useClassrooms: () => classroomsState }));
vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => ({ hasPro: false, loading: false, source: null, refresh: vi.fn() }) }));
let activationProgress = { inviteCopied: true, liveStarted: true, roomOpened: true, dismissed: true };
vi.mock('@/hooks/useTeacherActivationProgress', () => ({
  useTeacherActivationProgress: () => ({ progress: activationProgress, ready: true, dismiss: vi.fn() }),
}));
vi.mock('@/hooks/useTeacherWeekStats', () => ({ useTeacherWeekStats: () => ({ status: 'ready', summary: null }) }));
vi.mock('@/hooks/useClassStudentPreview', () => ({ useClassStudentPreview: () => null }));

import TeacherDashboard from '../TeacherDashboard';

const FIRST = { id: 'c1', name: 'Room 7B', member_count: 0, join_code: 'PLSB66' };
const SECOND = { id: 'c2', name: '5B', member_count: 0, join_code: 'K7Q2AA' };

beforeEach(() => {
  search = '';
  classroomsState = { classrooms: [FIRST, SECOND], isLoading: false, error: null, refresh: vi.fn() };
  fetchWithAuth.mockImplementation(async () => ({ ok: true, json: async () => ({ count: 0 }) }));
  global.fetch = vi.fn(async () => ({ ok: true, json: async () => ({}) })) as unknown as typeof fetch;
});
afterEach(() => cleanup());

const shownCode = () => within(screen.getByTestId('home-join-row')).getByTestId('home-desk-code').textContent;

describe('Teacher Home: ?classroomId deep link', () => {
  it('Given classroomId names one of the teacher classes, When Home renders, Then that class is selected on the first paint', () => {
    search = 'classroomId=c2';

    render(<TeacherDashboard />);

    expect(shownCode()).toContain('K7Q2AA');
  });

  it('Given classroomId is unknown, When Home renders, Then it ignores it and shows the first class', () => {
    search = 'classroomId=not-mine';

    render(<TeacherDashboard />);

    expect(shownCode()).toContain('PLSB66');
  });

  it('Given no classroomId, When Home renders, Then the first class is shown', () => {
    render(<TeacherDashboard />);

    expect(shownCode()).toContain('PLSB66');
  });
});
