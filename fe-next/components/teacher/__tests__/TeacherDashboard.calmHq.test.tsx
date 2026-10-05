import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

type Room = { id: string; name: string; join_code: string; member_count: number };
const state = {
  classrooms: [] as Room[],
  assignmentCount: 0 as number | null,
  hasPro: false,
};
const upgradeClicked = vi.fn();
const push = vi.fn();

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1' }, profile: { user_role: 'teacher', is_admin: false }, loading: false }),
}));
vi.mock('@/hooks/useClassroom', () => ({
  useClassrooms: () => ({ classrooms: state.classrooms, isLoading: false, error: null, refresh: vi.fn(), createClassroom: vi.fn() }),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
  usePathname: () => '/en/teacher',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/components/education/EducationHeader', () => ({ EducationHeader: () => null }));
vi.mock('@/components/education/TeacherOnboarding', () => ({
  TeacherOnboarding: () => <button type="button" data-testid="teacher-onboarding" />,
}));
vi.mock('@/components/teacher/dashboard/TeacherStatusRow', () => ({
  TeacherStatusRow: ({ quietPlan }: { quietPlan?: boolean }) => (
    <div data-testid="status-row">{quietPlan ? null : <span data-hq-upsell="plan-badge" />}</div>
  ),
}));
vi.mock('@/components/teacher/ClassroomManager', () => ({ default: () => null }));
vi.mock('@/components/teacher/LessonBuilder', () => ({ default: () => null }));
vi.mock('@/components/teacher/assignments', () => ({
  AssignmentTrackingPanel: () => null,
  AssignmentCreator: ({ isOpen }: { isOpen: boolean }) => (isOpen ? <div data-testid="assignment-creator" /> : null),
}));
vi.mock('@/components/teacher/analytics/AnalyticsDashboard', () => ({ AnalyticsDashboard: () => null }));
vi.mock('@/components/teacher/analytics/LastGameInsights', () => ({ LastGameInsights: () => null }));
vi.mock('@/components/teacher/ProGate', () => ({ ProGate: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('@/components/teacher/ProWelcomeCelebration', () => ({ ProWelcomeCelebration: () => null }));
vi.mock('@/hooks/useTeacherPro', () => ({
  useTeacherPro: () => ({ grant: null, loading: false, hasPro: state.hasPro, source: null, refresh: vi.fn() }),
}));
vi.mock('@/hooks/useMediaQuery', () => ({ useMediaQuery: () => false }));
vi.mock('@/components/teacher/dashboard/PlayNowLauncher', () => ({
  PlayNowLauncher: () => <button type="button" data-testid="play-now-go" />,
}));
vi.mock('@/components/teacher/PlayTabFirstRunCard', () => ({
  default: () => <button type="button" data-testid="first-run-create-class" />,
}));
vi.mock('@/components/teacher/hq/GetStudentsInCard', () => ({
  GetStudentsInCard: () => <div data-testid="get-students-in" />,
}));
vi.mock('@/components/teacher/hq/ClassPulseRow', () => ({
  ClassPulseRow: () => <span data-testid="hq-class-pulse" />,
}));
vi.mock('@/components/teacher/hq/useFirstAssignmentCta', () => ({
  useFirstAssignmentCta: () => ({ assignmentCount: state.assignmentCount, submittedCount: 0, hasActiveRoom: false }),
}));
vi.mock('@/lib/education/telemetry', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/education/telemetry')>()),
  trackEduTeacherDashboardViewed: vi.fn(),
  trackEduTeacherToolsOpened: vi.fn(),
  trackEduFirstAssignmentCtaShown: vi.fn(),
  trackEduFirstAssignmentCtaClicked: vi.fn(),
  trackEduJoinCodeCopied: vi.fn(),
  trackEduAssignmentStartLiveClicked: vi.fn(),
  trackTeacherHqProgressViewed: vi.fn(),
  trackTeacherHqUpgradeClicked: (...a: unknown[]) => upgradeClicked(...a),
}));

import TeacherDashboard from '../TeacherDashboard';

const room = (member_count: number): Room => ({ id: 'c1', name: 'Class 1', join_code: 'ABC123', member_count });
const primaries = () => Array.from(document.querySelectorAll('[data-hq-primary]'));
const upsells = () => Array.from(document.querySelectorAll('[data-hq-upsell]')).filter((el) => !el.closest('[hidden]'));

describe('Teacher HQ — one decision at a time', () => {
  beforeEach(() => {
    state.classrooms = [];
    state.assignmentCount = 0;
    state.hasPro = false;
    upgradeClicked.mockClear();
    push.mockClear();
  });

  it('Given no class, Then the only primary is create a class and the game picker waits behind a quiet link', () => {
    render(<TeacherDashboard />);
    expect(primaries().map((el) => el.getAttribute('data-hq-primary'))).toEqual(['createClass']);
    expect(screen.queryByTestId('play-now-go')).toBeNull();
    fireEvent.click(screen.getByTestId('hq-show-launcher'));
    expect(screen.getByTestId('play-now-go')).toBeInTheDocument();
    expect(primaries()).toHaveLength(1);
  });

  it('Given a class with no students, Then the only primary is get students in (the first-student panel)', () => {
    state.classrooms = [room(0)];
    render(<TeacherDashboard />);
    expect(primaries().map((el) => el.getAttribute('data-hq-primary'))).toEqual(['getStudents']);
    expect(screen.getByTestId('get-students-in')).toBeInTheDocument();
    expect(screen.queryByTestId('play-now-go')).toBeNull();
    expect(screen.queryByTestId('hq-join-strip')).toBeNull();
  });

  it('Given students but no game yet, Then go live is the primary, the code is a compact strip and homework is one quiet link', () => {
    state.classrooms = [room(3)];
    render(<TeacherDashboard />);
    expect(primaries().map((el) => el.getAttribute('data-hq-primary'))).toEqual(['goLive']);
    expect(screen.queryByTestId('get-students-in')).toBeNull();
    expect(screen.getByTestId('hq-join-strip')).toHaveTextContent('ABC123');
    expect(screen.getAllByTestId('hq-first-assignment-inline')).toHaveLength(1);
    fireEvent.click(screen.getByTestId('hq-first-assignment-inline'));
    expect(screen.getByTestId('assignment-creator')).toBeInTheDocument();
  });

  it('Given an active class, Then go live leads, the pulse sits beside it, and Start live stays on the deck', () => {
    state.classrooms = [room(5)];
    state.assignmentCount = 2;
    state.hasPro = true;
    render(<TeacherDashboard />);
    expect(primaries().map((el) => el.getAttribute('data-hq-primary'))).toEqual(['goLive']);
    expect(screen.getByTestId('hq-class-pulse')).toBeInTheDocument();
    expect(screen.getAllByTestId('play-now-go')).toHaveLength(1);
    expect(screen.getByTestId('hq-start-live-cta')).toBeInTheDocument();
    expect(screen.getByTestId('teacher-dashboard-aside')).toContainElement(screen.getByTestId('hq-start-live-cta'));
    expect(screen.queryByTestId('hq-first-assignment-inline')).toBeNull();
    expect(screen.queryByTestId('hq-assignments-pill')).toBeNull();
    expect(screen.getByTestId('hq-assignments-open')).toHaveTextContent('2');
  });

  it('Given students but no homework or game yet, Then desktop is one calm column; an active class splits into launcher + join on one side and the pulse on the other', () => {
    state.classrooms = [room(3)];
    const { unmount } = render(<TeacherDashboard />);
    const grid = () => screen.getByTestId('teacher-dashboard-grid');
    expect(grid().className).toContain('lg:max-w-2xl');
    expect(grid().className).not.toContain('lg:grid-cols-2');
    unmount();

    state.assignmentCount = 2;
    render(<TeacherDashboard />);
    expect(grid().className).toContain('lg:grid-cols-2');
    expect(screen.getByTestId('teacher-dashboard-aside')).toContainElement(screen.getByTestId('hq-class-pulse'));
    expect(screen.getByTestId('teacher-dashboard-aside')).not.toContainElement(screen.getByTestId('hq-join-strip'));
    expect(screen.getByTestId('hq-join-strip').className).toContain('lg:col-start-1');
  });

  it('Given a Pro teacher, Then HQ carries no Pro ask at all', () => {
    state.classrooms = [room(5)];
    state.assignmentCount = 2;
    state.hasPro = true;
    render(<TeacherDashboard />);
    expect(upsells()).toHaveLength(0);
  });

  it('Given a free teacher with an active class and a Pro banner waiting, Then exactly ONE ask shows — inside the pulse — and it opens that banner', () => {
    state.classrooms = [room(5)];
    state.assignmentCount = 2;
    render(<TeacherDashboard banner={<div data-testid="pro-banner-body" />} />);
    expect(upsells().map((el) => el.getAttribute('data-hq-upsell'))).toEqual(['pulse']);
    fireEvent.click(screen.getByTestId('hq-class-progress-upgrade'));
    expect(upgradeClicked).toHaveBeenCalledWith({ classroomId: 'c1' });
    expect(screen.getByTestId('pro-banner-body')).toBeInTheDocument();
  });

  it.each([
    ['no class', [] as Room[], 0],
    ['no students', [room(0)], 0],
    ['no game yet', [room(3)], 0],
  ])('Given a free teacher (%s) with a Pro banner, Then at most one Pro ask is visible', (_label, classrooms, assignmentCount) => {
    state.classrooms = classrooms;
    state.assignmentCount = assignmentCount;
    render(<TeacherDashboard banner={<div />} usagePrompt={<div />} />);
    expect(upsells().length).toBeLessThanOrEqual(1);
  });

  it('Given the selected class has students and an assignment, Then Start live opens that class lobby and the join code stays on the CTA', () => {
    state.classrooms = [
      { id: 'empty', name: 'Empty', join_code: 'NONE00', member_count: 0 },
      { id: 'ready', name: 'Ready', join_code: 'LIVE99', member_count: 4 },
    ];
    state.assignmentCount = 1;
    render(<TeacherDashboard />);
    expect(screen.queryByTestId('hq-start-live-cta')).toBeNull();
    fireEvent.click(screen.getByTestId('class-switch-ready'));
    expect(screen.getByTestId('hq-start-live-join-code')).toHaveTextContent('LIVE99');
    fireEvent.click(screen.getByTestId('hq-start-live-cta'));
    expect(push).toHaveBeenCalledWith('/en/education/classroom-game?classroomId=ready');
  });

  it.each([
    ['an empty roster', [room(0)], 1],
    ['zero assignments', [room(3)], 0],
    ['an unknown assignment count', [room(3)], null],
  ] as const)('Given %s, Then the HQ Start-live CTA is absent', (_label, classrooms, assignmentCount) => {
    state.classrooms = [...classrooms];
    state.assignmentCount = assignmentCount;
    render(<TeacherDashboard />);
    expect(screen.queryByTestId('hq-start-live-cta')).toBeNull();
  });

  it('Given a pinned trial banner, Then it is the one ask even when the pulse is on screen', () => {
    state.classrooms = [room(5)];
    state.assignmentCount = 2;
    render(<TeacherDashboard banner={<div data-testid="trial-banner" />} pinBanner />);
    expect(screen.getByTestId('trial-banner')).toBeInTheDocument();
    expect(upsells().map((el) => el.getAttribute('data-hq-upsell'))).toEqual(['pinned']);
  });
});
