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

import TeacherDashboard from '../TeacherDashboard';

const FREE = { hasPro: false, loading: false, source: null, refresh: vi.fn() };
const PRO = { hasPro: true, loading: false, source: 'polar', status: 'active', refresh: vi.fn() };
const CLASSES = [
  { id: 'c5b', name: '5B - English', member_count: 28, join_code: 'K7Q2' },
  { id: 'c4a', name: '4A - Reading', member_count: 26, join_code: 'ZZ11' },
];

beforeEach(() => {
  classroomsState = { classrooms: CLASSES, isLoading: false, error: null, refresh: vi.fn() };
  proState = FREE;
  activation = { progress: { inviteCopied: true, liveStarted: true, dismissed: false }, ready: true, markInviteCopied: vi.fn(), markLiveStarted: vi.fn(), dismiss: vi.fn() };
  week = { status: 'ready', summary: { gamesPlayed: 12, totalStudents: 54, activeClasses: 2, lastPlayedAt: { c5b: new Date().toISOString() } } };
  global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }) as unknown as typeof fetch;
});
afterEach(() => {
  cleanup();
  search = '';
  viewed.mockReset();
});

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

  it('Then three featured modes carry their delivery tag and preselect the mode', () => {
    render(<TeacherDashboard />);
    const modes = screen.getAllByTestId(/^home-mode-/);
    expect(modes.map((m) => m.getAttribute('data-testid'))).toEqual(['home-mode-wheel-rush', 'home-mode-word-hunt', 'home-mode-classic']);
    expect(modes[1]).toHaveAttribute('href', '/en/education/classroom-game?classroomId=c5b&mode=word-hunt');
    expect(within(modes[1]).getByTestId('delivery-tag-phones')).toBeInTheDocument();
    expect(within(modes[0]).getByTestId('delivery-tag-both')).toBeInTheDocument();
  });

  it('Then every class row has its own play button', () => {
    render(<TeacherDashboard />);
    const rows = screen.getAllByTestId('home-class-row');
    expect(rows).toHaveLength(2);
    expect(within(rows[1]).getByTestId('home-class-play')).toHaveAttribute('href', '/en/education/classroom-game?classroomId=c4a');
  });

  it('Then This week shows the three real numbers', () => {
    render(<TeacherDashboard />);
    const card = screen.getByTestId('home-week');
    expect(within(card).getByTestId('home-week-games')).toHaveTextContent('12');
    expect(within(card).getByTestId('home-week-students')).toHaveTextContent('54');
    expect(within(card).getByTestId('home-week-active')).toHaveTextContent('2');
  });

  it('Given the stats read failed, Then the numbers read "—", never a false zero', () => {
    week = { status: 'error', summary: null };
    render(<TeacherDashboard />);
    expect(screen.getByTestId('home-week-games')).toHaveTextContent('—');
  });

  it('Given a free teacher with a trial offer, Then exactly one Pro card sits in the rail, and the plan pill is quiet', async () => {
    const onDismiss = vi.fn();
    render(<TeacherDashboard proOffer={{ kind: 'trial', onDismiss, tracked: true }} />);
    const card = screen.getByTestId('home-pro-card');
    expect(screen.getAllByTestId('home-pro-card')).toHaveLength(1);
    expect(card.closest('aside')).not.toBeNull();
    expect(within(card).getByTestId('home-pro-cta')).toHaveTextContent('eduShell.pro.trialCta');
    expect(within(card).getAllByRole('listitem')).toHaveLength(3);
    within(card).getByTestId('home-pro-dismiss').click();
    expect(onDismiss).toHaveBeenCalled();
  });

  it('Given no ask was picked, Then Home shows no Pro card at all', () => {
    render(<TeacherDashboard />);
    expect(screen.queryByTestId('home-pro-card')).not.toBeInTheDocument();
  });

  it('Given a Pro teacher, Then there is no Pro card', () => {
    proState = PRO;
    render(<TeacherDashboard proOffer={{ kind: 'upgrade', onDismiss: vi.fn(), tracked: false }} />);
    expect(screen.queryByTestId('home-pro-card')).not.toBeInTheDocument();
  });

  it('Given a brand-new teacher, Then Home is the 3-step onboarding card, not a page of zeros', () => {
    classroomsState = { ...classroomsState, classrooms: [] };
    activation = { ...activation, progress: { inviteCopied: false, liveStarted: false, dismissed: false } };
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

  it('Given a Pro teacher with no games yet, Then Home drops the empty side rail and uses the full width', () => {
    proState = PRO;
    week = { status: 'ready', summary: { gamesPlayed: 0, totalStudents: 0, activeClasses: 0, lastPlayedAt: {} } };
    render(<TeacherDashboard />);
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
    expect(screen.getByTestId('teacher-home').className).not.toMatch(/lg:grid-cols-/);
  });

  it('Given a Pro offer, Then the card is words and a button, no blurred fake chart', () => {
    render(<TeacherDashboard proOffer={{ kind: 'trial', onDismiss: vi.fn(), tracked: true }} />);
    expect(screen.getByTestId('home-pro-card').querySelector('.blur-\\[3px\\]')).toBeNull();
  });

  it('Given setup half done, Then the compact card is one slim row with no progress sentence or step blurbs', () => {
    activation = { ...activation, progress: { inviteCopied: false, liveStarted: false, dismissed: false } };
    render(<TeacherDashboard />);
    const card = screen.getByTestId('home-onboarding');
    expect(card).not.toHaveTextContent('eduShell.onboarding.progress');
    expect(card).not.toHaveTextContent(/eduShell\.onboarding\.steps\.\w+\.body/);
    expect(within(card).getAllByTestId(/^home-onboarding-step-/)).toHaveLength(3);
    expect(within(card).getByTestId('home-onboarding-cta')).toBeInTheDocument();
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
