import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within, cleanup, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${JSON.stringify(p)}` : k), language: 'en', dir: 'ltr' }),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1' }, profile: { user_role: 'teacher', display_name: 'Dana Levi' }, loading: false }),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/en/teacher',
  useSearchParams: () => new URLSearchParams(),
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

let classroomsState: Record<string, unknown>;
vi.mock('@/hooks/useClassroom', () => ({ useClassrooms: () => classroomsState }));
vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => ({ hasPro: false, loading: false, source: null, refresh: vi.fn() }) }));
let activationProgress = { inviteCopied: true, liveStarted: true, dismissed: true };
vi.mock('@/hooks/useTeacherActivationProgress', () => ({
  useTeacherActivationProgress: () => ({ progress: activationProgress, ready: true, dismiss: vi.fn() }),
}));
vi.mock('@/hooks/useTeacherWeekStats', () => ({ useTeacherWeekStats: () => ({ status: 'ready', summary: null }) }));
vi.mock('@/hooks/useClassStudentPreview', () => ({ useClassStudentPreview: () => null }));

import TeacherDashboard from '../TeacherDashboard';

const EMPTY_CLASS = { id: 'c1', name: 'Room 7B', member_count: 0, join_code: 'PLSB66' };
const FULL_CLASS = { id: 'c2', name: '5B', member_count: 12, join_code: 'K7Q2AA' };

let triesCount = 0;
beforeEach(() => {
  triesCount = 0;
  activationProgress = { inviteCopied: true, liveStarted: true, dismissed: true };
  classroomsState = { classrooms: [EMPTY_CLASS], isLoading: false, error: null, refresh: vi.fn() };
  global.fetch = vi.fn(async (url: string) => ({
    ok: true,
    json: async () => (String(url).includes('ended-code-tries') ? { count: triesCount } : {}),
  })) as unknown as typeof fetch;
});
afterEach(() => cleanup());

describe('Teacher Home: get students in', () => {
  it('Given the class has no students, Then the code, QR, copy link and projector share actions render', () => {
    render(<TeacherDashboard />);
    const card = screen.getByTestId('hq-get-students-in');
    expect(within(card).getByTestId('hq-join-code')).toHaveTextContent('PLSB66');
    expect(within(card).getByTestId('hq-copy-link')).toBeInTheDocument();
    expect(within(card).getByTestId('hq-open-qr')).toBeInTheDocument();
    expect(within(card).getByTestId('hq-open-projector')).toBeInTheDocument();
  });

  it('Then it shows students joined against the goal', () => {
    render(<TeacherDashboard />);
    expect(screen.getByTestId('hq-joined-goal')).toHaveTextContent('academy.hq.joinedGoal:{"count":0,"goal":3}');
  });

  it('Given the share step is the next onboarding step, Then the card replaces the onboarding nudge', () => {
    activationProgress = { inviteCopied: false, liveStarted: false, dismissed: false };
    render(<TeacherDashboard />);
    expect(screen.getByTestId('hq-get-students-in')).toBeInTheDocument();
    expect(screen.queryByTestId('home-onboarding')).not.toBeInTheDocument();
  });

  it('When projector is tapped, Then the projector sheet opens for that class', () => {
    render(<TeacherDashboard />);
    fireEvent.click(screen.getByTestId('hq-open-projector'));
    expect(screen.getByTestId('projector-sheet')).toHaveTextContent('PLSB66');
  });

  it('Given the class has reached the goal, Then the card steps aside for the game hero', () => {
    classroomsState = { ...classroomsState, classrooms: [FULL_CLASS] };
    render(<TeacherDashboard />);
    expect(screen.queryByTestId('hq-get-students-in')).not.toBeInTheDocument();
    expect(screen.getByTestId('home-hero')).toBeInTheDocument();
  });

  it('Given students tried an ended code, Then the teacher is told and offered a new game', async () => {
    triesCount = 4;
    render(<TeacherDashboard />);
    const notice = await screen.findByTestId('hq-ended-code-tries');
    expect(notice).toHaveTextContent('academy.hq.endedCodeTries:{"count":4}');
    expect(within(notice).getByRole('link')).toHaveAttribute('href', '/en/education/classroom-game?classroomId=c1');
  });

  it('Given nobody tried an ended code, Then no notice', async () => {
    render(<TeacherDashboard />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/education/classroom/c1/ended-code-tries', expect.anything()));
    expect(screen.queryByTestId('hq-ended-code-tries')).not.toBeInTheDocument();
  });
});
