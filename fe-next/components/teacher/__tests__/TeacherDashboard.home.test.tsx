import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within, cleanup, act, fireEvent, waitFor } from '@testing-library/react';
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
vi.mock('@/components/teacher/LessonBuilder', () => ({
  default: ({ initialReviewWords }: { initialReviewWords: string[] }) => <div data-testid="lesson-builder">{initialReviewWords.join(',')}</div>,
}));
const viewed = vi.fn();
vi.mock('@/lib/education/telemetry', async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  trackEduTeacherDashboardViewed: (s: unknown) => viewed(s),
}));
vi.mock('@/components/teacher/assignments', () => ({ AssignmentCreator: () => null }));

let classroomsState: Record<string, unknown>;
vi.mock('@/hooks/useClassroom', () => ({ useClassrooms: () => classroomsState }));
let proState: Record<string, unknown>;
vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => proState }));
let activation: Record<string, unknown>;
vi.mock('@/hooks/useTeacherActivationProgress', () => ({ useTeacherActivationProgress: () => activation }));
let week: Record<string, unknown>;
vi.mock('@/hooks/useTeacherWeekStats', () => ({ useTeacherWeekStats: () => week }));
vi.mock('@/hooks/useClassStudentPreview', () => ({ useClassStudentPreview: () => null }));
vi.mock('@/hooks/useStudentProgressMetrics', () => ({ useStudentProgressMetrics: () => ({ students: [], isLoading: true, error: null, refresh: vi.fn() }) }));

import TeacherDashboard from '../TeacherDashboard';

const FREE = { hasPro: false, loading: false, known: true, source: null, accessTrialExpires: null, refresh: vi.fn() };
const PRO = { hasPro: true, loading: false, known: true, source: 'polar', status: 'active', refresh: vi.fn() };
const CLASSES = [
  { id: 'c5b', name: '5B - English', member_count: 28, join_code: 'K7Q2' },
  { id: 'c4a', name: '4A - Reading', member_count: 26, join_code: 'ZZ11' },
];

beforeEach(() => {
  classroomsState = { classrooms: CLASSES, isLoading: false, error: null, refresh: vi.fn() };
  proState = FREE;
  activation = { progress: { inviteCopied: true, liveStarted: true, roomOpened: true, dismissed: false }, ready: true, markInviteCopied: vi.fn(), dismiss: vi.fn() };
  week = { status: 'ready', summary: { gamesPlayed: 12, totalStudents: 54, activeClasses: 2, lastPlayedAt: { c5b: new Date().toISOString() } } };
  global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }) as unknown as typeof fetch;
});
afterEach(() => {
  cleanup();
  search = '';
  viewed.mockReset();
});

function openWeeklyReports() {
  fireEvent.click(within(screen.getByTestId('home-weekly-reports')).getByRole('button'));
}

describe('Teacher Home', () => {
  it('Given classes still loading, Then it paints skeletons and no onboarding card', () => {
    classroomsState = { ...classroomsState, classrooms: [], isLoading: true };
    render(<TeacherDashboard />);
    expect(screen.getByTestId('home-skeleton')).toBeInTheDocument();
    expect(screen.queryByTestId('home-onboarding')).not.toBeInTheDocument();
  });

  it('Given activation flags not read yet, Then a new teacher still sees skeletons, not a card that may vanish', () => {
    classroomsState = { ...classroomsState, classrooms: [] };
    activation = { ...activation, ready: false };
    render(<TeacherDashboard />);
    expect(screen.getByTestId('home-skeleton')).toBeInTheDocument();
  });

  it('Given a teacher with classes, Then the hero names the class and Start live game opens the host flow for it', () => {
    render(<TeacherDashboard />);
    const hero = screen.getByTestId('home-hero');
    expect(within(hero).getByTestId('home-class-switcher')).toHaveTextContent('5B - English');
    expect(within(hero).getByTestId('home-start-live')).toHaveAttribute('href', '/en/education/classroom-game?classroomId=c5b');
  });

  it('Then the hero is the one way to start: no featured-mode tiles compete with Start live game', () => {
    render(<TeacherDashboard />);
    expect(screen.queryAllByTestId(/^home-mode-/)).toHaveLength(0);
    expect(screen.getAllByTestId('home-start-live')).toHaveLength(1);
  });

  it('Then the hero shows the class join code as letter tiles, and Share code opens one sheet that also puts it on the board', () => {
    render(<TeacherDashboard />);
    const hero = screen.getByTestId('home-hero');
    const code = within(hero).getByTestId('home-desk-code');
    expect(code).toHaveTextContent('K7Q2');
    expect(within(code).getAllByTestId('home-desk-code-tile')).toHaveLength(4);
    act(() => within(hero).getByTestId('home-share-code').click());
    expect(screen.getByTestId('setup-share-row')).toBeInTheDocument();
    act(() => screen.getByTestId('home-share-board').click());
    expect(screen.getByTestId('hq-projector-qr')).toBeInTheDocument();
  });

  it('Then Home has one See results entry and one Try it as a student link', () => {
    render(<TeacherDashboard />);
    const hero = screen.getByTestId('home-hero');
    expect(within(hero).getByTestId('home-see-results')).toHaveAttribute('href', '/en/teacher/reports?classroomId=c5b');
    expect(screen.getAllByTestId('rehearse-with-bots')).toHaveLength(1);
    expect(within(hero).getByTestId('rehearse-with-bots')).toHaveTextContent('eduShell.home.practice.cta');
    expect(screen.queryByTestId('home-practice-card')).toBeNull();
  });

  it('Given a new class still below the student goal, Then the join code shows once: the share card owns it, not the hero', () => {
    classroomsState = { ...classroomsState, classrooms: [{ ...CLASSES[0], member_count: 0 }] };
    render(<TeacherDashboard />);
    expect(screen.getByTestId('hq-join-code')).toBeInTheDocument();
    expect(screen.queryByTestId('home-desk-code')).toBeNull();
  });

  it('Given one class, Then the class list does not repeat the hero, and New class stays in reach', () => {
    classroomsState = { ...classroomsState, classrooms: [CLASSES[0]] };
    render(<TeacherDashboard />);
    expect(screen.queryAllByTestId('home-class-row')).toHaveLength(0);
    expect(screen.getByTestId('home-new-class')).toHaveAttribute('href');
  });

  it('Given several classes, Then the hero switcher replaces a class list and a requested class retargets Start live', () => {
    search = 'classroomId=c4a';
    render(<TeacherDashboard />);
    const hero = screen.getByTestId('home-hero');
    expect(within(hero).getByRole('button', { name: 'eduShell.home.switchClass' })).toHaveTextContent('4A - Reading');
    expect(within(hero).getByTestId('home-start-live')).toHaveAttribute('href', '/en/education/classroom-game?classroomId=c4a');
    expect(screen.queryAllByTestId('home-class-row')).toHaveLength(0);
  });

  it('Given several classes, Then This week breaks down by class and picking a row puts that class on the desk', () => {
    render(<TeacherDashboard />);
    const roster = within(screen.getByTestId('home-week')).getByTestId('home-week-classes');
    expect(within(roster).getByRole('button', { name: /5B - English/ })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(within(roster).getByRole('button', { name: /4A - Reading/ }));
    expect(within(screen.getByTestId('home-hero')).getByTestId('home-start-live')).toHaveAttribute('href', '/en/education/classroom-game?classroomId=c4a');
  });

  it('Given one class, Then This week shows no per-class rows that would repeat the hero', () => {
    classroomsState = { ...classroomsState, classrooms: [CLASSES[0]] };
    render(<TeacherDashboard />);
    expect(screen.queryByTestId('home-week-classes')).toBeNull();
  });

  it('Then This week counts up to the three real numbers', async () => {
    render(<TeacherDashboard />);
    const card = screen.getByTestId('home-week');
    await waitFor(() => expect(within(card).getByTestId('home-week-games')).toHaveTextContent('12'));
    await waitFor(() => expect(within(card).getByTestId('home-week-students')).toHaveTextContent('54'));
    await waitFor(() => expect(within(card).getByTestId('home-week-active')).toHaveTextContent('2'));
  });

  it('Given an insight, Then the hero stays on the class and its Start button, with no filler line', () => {
    week = { ...week, insights: [{ id: 'momentum', value: 3 }] };
    render(<TeacherDashboard />);
    expect(within(screen.getByTestId('home-hero')).queryByTestId('home-insight')).toBeNull();
  });

  it('Given a Pro teacher, Then the class desk shows the student roster under the hero', () => {
    proState = PRO;
    render(<TeacherDashboard />);
    expect(screen.getByTestId('home-roster')).toBeInTheDocument();
  });

  it('Given a free teacher, Then the per-student roster stays behind Pro like the class analytics page', () => {
    render(<TeacherDashboard />);
    expect(screen.queryByTestId('home-roster')).toBeNull();
  });

  it('Given the stats read failed, Then the numbers read "—", never a false zero', () => {
    week = { status: 'error', summary: null };
    render(<TeacherDashboard />);
    expect(screen.getByTestId('home-week-games')).toHaveTextContent('—');
  });

  it('Given a free teacher with classes, Then exactly one Pro entry shows: the oldest class\'s weekly insight, in the rail', () => {
    classroomsState = { ...classroomsState, classrooms: [{ ...CLASSES[0], created_at: '2026-10-02T00:00:00Z' }, { ...CLASSES[1], created_at: '2026-09-01T00:00:00Z' }] };
    render(<TeacherDashboard />);
    const cards = screen.getAllByTestId('home-class-insight');
    expect(cards).toHaveLength(1);
    expect(cards[0].parentElement?.closest('aside')).not.toBeNull();
    expect(cards[0]).toHaveTextContent('4A - Reading');
    expect(screen.getByTestId('home-class-insight-cta')).toHaveAttribute('href', '/en/teacher/classroom/c4a/analytics');
    expect(screen.queryByTestId('home-pro-card')).not.toBeInTheDocument();
    expect(screen.queryByTestId('home-pro-slot')).not.toBeInTheDocument();
    expect(screen.queryByTestId('teacher-pro-usage-prompt')).not.toBeInTheDocument();
  });

  it('Given a free teacher with no class yet, Then the onboarding guide is the one ask and no Pro entry shows', () => {
    classroomsState = { classrooms: [], isLoading: false, error: null, refresh: vi.fn() };
    render(<TeacherDashboard />);
    expect(screen.getByTestId('home-onboarding')).toBeInTheDocument();
    expect(screen.queryByTestId('home-class-insight')).not.toBeInTheDocument();
  });

  it('Given the week read is still loading, Then the Pro entry waits instead of flashing', () => {
    week = { status: 'loading', summary: null };
    render(<TeacherDashboard />);
    expect(screen.queryByTestId('home-class-insight')).not.toBeInTheDocument();
  });

  it('Given an account banner, Then no Pro entry stacks under it', () => {
    render(<TeacherDashboard banner={<div data-testid="trial-banner" />} />);
    expect(screen.getByTestId('trial-banner')).toBeInTheDocument();
    expect(screen.queryByTestId('home-class-insight')).not.toBeInTheDocument();
  });

  it('Given a Pro teacher, Then there is no Pro entry', () => {
    proState = PRO;
    render(<TeacherDashboard />);
    expect(screen.queryByTestId('home-class-insight')).not.toBeInTheDocument();
  });

  it('Given a teacher inside a live access trial, Then there is no Pro entry (everything is open)', () => {
    proState = { ...FREE, accessTrialExpires: new Date(Date.now() + 3 * 86_400_000).toISOString() };
    render(<TeacherDashboard />);
    expect(screen.queryByTestId('home-class-insight')).not.toBeInTheDocument();
  });

  it('Given the plan read failed, Then no Pro entry is guessed', () => {
    proState = { ...FREE, known: false };
    render(<TeacherDashboard />);
    expect(screen.queryByTestId('home-class-insight')).not.toBeInTheDocument();
  });

  it('Given a brand-new teacher, Then Home is the 3-step onboarding card, not a page of zeros', () => {
    classroomsState = { ...classroomsState, classrooms: [] };
    activation = { ...activation, progress: { inviteCopied: false, liveStarted: false, roomOpened: false, dismissed: false } };
    render(<TeacherDashboard />);
    const card = screen.getByTestId('home-onboarding');
    expect(within(card).getAllByTestId(/^home-onboarding-step-/)).toHaveLength(3);
    expect(within(card).getByTestId('home-onboarding-cta')).toHaveAttribute('href', '/en/teacher/classroom/new');
    expect(screen.queryByTestId('home-week')).not.toBeInTheDocument();
    expect(screen.queryByTestId('home-hero')).not.toBeInTheDocument();
  });

  it('Given no duplicate nav, Then Home mounts no tools dock', () => {
    render(<TeacherDashboard />);
    expect(screen.queryByTestId('hq-dock')).not.toBeInTheDocument();
    expect(screen.queryByTestId('hq-tools-sheet')).not.toBeInTheDocument();
  });

  it('Given trial account state (days left / renew), Then it shows as one strip under the classes', () => {
    render(<TeacherDashboard banner={<div data-testid="trial-banner" />} />);
    expect(screen.getByTestId('home-account-banner')).toContainElement(screen.getByTestId('trial-banner'));
    expect(screen.queryByTestId('home-pro-card')).not.toBeInTheDocument();
  });

  it('Given a brand-new week with no games, Then Home shows no This week card at all', () => {
    week = { status: 'ready', summary: { gamesPlayed: 0, totalStudents: 0, activeClasses: 0, lastPlayedAt: {} } };
    render(<TeacherDashboard />);
    expect(screen.queryByTestId('home-week')).not.toBeInTheDocument();
  });

  it('Given a Pro teacher with no games yet, Then the weekly digest still sits in the rail', () => {
    proState = PRO;
    week = { status: 'ready', summary: { gamesPlayed: 0, totalStudents: 0, activeClasses: 0, lastPlayedAt: {} } };
    render(<TeacherDashboard />);
    expect(screen.getByRole('complementary')).toBeInTheDocument();
    openWeeklyReports();
    expect(screen.getByTestId('weekly-progress-digest')).toBeInTheDocument();
  });

  it('Given a class, Then the weekly digest and email report sit folded in one closed Weekly reports disclosure that mounts them only when opened, so no view is logged unseen', () => {
    proState = PRO;
    render(<TeacherDashboard />);
    const entry = screen.getByTestId('home-weekly-reports');
    expect(within(entry).getByRole('button')).toHaveAttribute('aria-haspopup', 'dialog');
    expect(screen.queryByTestId('weekly-progress-digest')).not.toBeInTheDocument();
    openWeeklyReports();
    const dialog = screen.getByRole('dialog', { name: 'eduShell.home.weeklyReports' });
    expect(entry).not.toContainElement(dialog);
    expect(dialog).toContainElement(screen.getByTestId('weekly-progress-digest'));
    expect(dialog).toContainElement(screen.getByTestId('home-weekly-reports-grid'));
    expect(screen.getByTestId('home-weekly-reports-all')).toHaveAttribute('href', '/en/teacher/reports?classroomId=c5b');
  });

  it('Given setup half done, Then no setup strip stacks on the class: the hero carries the next step', () => {
    activation = { ...activation, progress: { inviteCopied: false, liveStarted: false, roomOpened: false, dismissed: false } };
    week = { status: 'ready', summary: { gamesPlayed: 0, totalStudents: 0, activeClasses: 0, lastPlayedAt: {} } };
    render(<TeacherDashboard />);
    expect(screen.queryByTestId('home-onboarding')).toBeNull();
    expect(screen.getByTestId('home-start-live')).toBeInTheDocument();
    expect(within(screen.getByTestId('home-hero')).getByTestId('rehearse-with-bots')).toBeInTheDocument();
  });

  it('Given a class that already played but the activation flag never landed, Then no setup nudge shows', () => {
    activation = { ...activation, progress: { inviteCopied: false, liveStarted: false, roomOpened: true, dismissed: false } };
    render(<TeacherDashboard />);
    expect(screen.queryByTestId('home-onboarding')).toBeNull();
  });

  it('Given the activity read is still in flight, Then the setup nudge waits instead of flashing', () => {
    activation = { ...activation, progress: { inviteCopied: false, liveStarted: false, roomOpened: false, dismissed: false } };
    week = { status: 'loading', summary: null };
    render(<TeacherDashboard />);
    expect(screen.queryByTestId('home-onboarding')).toBeNull();
  });

  it('Given ?reviewWords= from a results card, Then the lesson creator opens with those words', () => {
    search = 'reviewWords=cat,dog';
    render(<TeacherDashboard />);
    expect(screen.getByTestId('lesson-builder')).toHaveTextContent('cat,dog');
  });

  it('Given ?classroomId=, Then the hero opens on that class', () => {
    search = 'classroomId=c4a';
    render(<TeacherDashboard />);
    expect(screen.getByTestId('home-start-live')).toHaveAttribute('href', '/en/education/classroom-game?classroomId=c4a');
  });

  it('Given classes and Pro resolved, Then one view event fires with the real snapshot', () => {
    render(<TeacherDashboard />);
    expect(viewed).toHaveBeenCalledTimes(1);
    expect(viewed).toHaveBeenCalledWith({ classroomCount: 2, studentCount: 54, hasPro: false });
  });

  it('Given classes still loading, Then no view event fires with a false zero', () => {
    classroomsState = { ...classroomsState, classrooms: [], isLoading: true };
    render(<TeacherDashboard />);
    expect(viewed).not.toHaveBeenCalled();
  });
});
