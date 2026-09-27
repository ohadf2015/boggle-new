/**
 * Teacher HQ — the one-screen command deck.
 *
 * Contract: class chips pick the class; "Start a game" launches INTO that class
 * (≤3 taps from /teacher to a joinable room); "Get students in" shows that
 * class's code with a projector one tap away; lessons and class tools open as
 * sheets, never as a stacked column under the hero.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const push = vi.fn();
const deepLink = { reviewWords: [] as string[] };
let search = new URLSearchParams();

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1' }, profile: { user_role: 'teacher', is_admin: false }, loading: false }),
}));
vi.mock('@/hooks/useClassroom', () => ({
  useClassrooms: () => ({
    classrooms: [
      { id: 'c1', name: 'Period 1', join_code: 'AAA111', member_count: 3 },
      { id: 'c2', name: 'Period 2', join_code: 'BBB222', member_count: 0 },
    ],
    isLoading: false,
    error: null,
    refresh: vi.fn(),
  }),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  usePathname: () => '/en/teacher',
  useSearchParams: () => search,
}));
vi.mock('@/hooks/useTeacherDashboardDeepLink', () => ({ useTeacherDashboardDeepLink: () => deepLink }));
vi.mock('@/components/education/EducationHeader', () => ({ EducationHeader: () => <div /> }));
vi.mock('@/components/education/TeacherOnboarding', () => ({ TeacherOnboarding: () => <div /> }));
vi.mock('@/components/teacher/ClassroomManager', () => ({ default: () => <div data-testid="classroom-manager" /> }));
vi.mock('@/components/teacher/LessonBuilder', () => ({ default: () => <div data-testid="lesson-builder" /> }));
vi.mock('@/components/teacher/assignments', () => ({
  AssignmentTrackingPanel: () => <div />,
  AssignmentCreator: () => <div />,
}));
vi.mock('@/components/teacher/analytics/AnalyticsDashboard', () => ({ AnalyticsDashboard: () => <div /> }));
vi.mock('@/components/teacher/analytics/LastGameInsights', () => ({ LastGameInsights: () => <div /> }));
vi.mock('@/components/teacher/ProGate', () => ({ ProGate: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('@/components/teacher/ProWelcomeCelebration', () => ({ ProWelcomeCelebration: () => null }));
vi.mock('@/components/teacher/dashboard/ClassPulseSection', () => ({ ClassPulseSection: () => <div /> }));
vi.mock('@/components/teacher/dashboard/ClassroomWindowProgress', () => ({ ClassroomWindowProgress: () => <div /> }));
vi.mock('@/components/teacher/dashboard/TeacherOnboardingChecklist', () => ({
  TeacherOnboardingChecklistLive: () => <div data-testid="teacher-onboarding-checklist" />,
}));
vi.mock('@/hooks/useTeacherPro', () => ({
  useTeacherPro: () => ({ grant: null, loading: false, hasPro: false, source: null, refresh: vi.fn() }),
}));
vi.mock('@/components/teacher/hq/useClassRoster', () => ({
  useClassRoster: () => ({ students: [], loading: false, arrivals: [] }),
}));
vi.mock('@/components/teacher/dashboard/PlayNowLauncher', () => ({
  PlayNowLauncher: ({ onLaunch }: { onLaunch: (i: Record<string, unknown>) => void }) => (
    <div data-testid="play-now-launcher">
      <button
        type="button"
        data-testid="play-now-go"
        onClick={() => onLaunch({ source: 'pack', packKey: 'p', title: 'Pack', language: 'en', mode: 'blast' })}
      />
    </div>
  ),
}));

import TeacherDashboard from '../TeacherDashboard';
import { readQuickLaunchIntent } from '../dashboard/quickLaunchIntent';

describe('<TeacherDashboard> — Teacher HQ deck', () => {
  beforeEach(() => {
    push.mockClear();
    sessionStorage.clear();
    deepLink.reviewWords = [];
    search = new URLSearchParams();
  });

  it('Given two classes, Then the first class is preselected and its code is on the deck', () => {
    render(<TeacherDashboard />);
    expect(screen.getByTestId('class-switch-c1')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('hq-join-code')).toHaveTextContent('AAA111');
  });

  it('When the teacher taps another class chip, Then the join code follows it', () => {
    render(<TeacherDashboard />);
    fireEvent.click(screen.getByTestId('class-switch-c2'));
    expect(screen.getByTestId('hq-join-code')).toHaveTextContent('BBB222');
  });

  it('When START is tapped, Then the launch carries the selected class and mode into the express lobby', () => {
    render(<TeacherDashboard />);
    fireEvent.click(screen.getByTestId('class-switch-c2'));
    fireEvent.click(screen.getByTestId('play-now-go'));
    expect(readQuickLaunchIntent()).toMatchObject({ classroomId: 'c2', mode: 'blast', source: 'pack' });
    expect(push).toHaveBeenCalledWith('/en/education/classroom-game?flow=quickLaunch');
  });

  it('When Open projector is tapped, Then a full-screen join wall opens', () => {
    render(<TeacherDashboard />);
    fireEvent.click(screen.getByTestId('hq-open-projector'));
    expect(screen.getByRole('dialog', { name: 'academy.hq.projectorTitle' })).toBeInTheDocument();
  });

  it('Given no review deep link, Then lessons sit behind a closed sheet, two taps away (Tools → Word lists)', () => {
    render(<TeacherDashboard />);
    const lessons = screen.getByTestId('teacher-lessons');
    expect(lessons.tagName).toBe('DETAILS');
    expect(lessons).not.toHaveAttribute('open');
    expect(lessons.contains(screen.getByTestId('lesson-builder'))).toBe(true);
  });

  it('Given missed words handed back from a game, Then the lessons sheet opens on arrival', () => {
    deepLink.reviewWords = ['osmosis'];
    render(<TeacherDashboard />);
    expect(screen.getByTestId('teacher-lessons')).toHaveAttribute('open');
  });

  it('Given the tools sheet closed, Then the onboarding checklist is not mounted (no phantom view event)', () => {
    render(<TeacherDashboard />);
    expect(screen.queryByTestId('teacher-onboarding-checklist')).toBeNull();
    fireEvent.click(screen.getByTestId('shortcut-last-game'));
    expect(screen.getByTestId('teacher-onboarding-checklist')).toBeInTheDocument();
  });

  it('Given secondary surfaces, Then none of them stacks under the hero — the dock holds them', () => {
    render(<TeacherDashboard />);
    const dock = screen.getByTestId('teacher-dashboard-dock');
    expect(dock.contains(screen.getByTestId('teacher-lessons'))).toBe(true);
    expect(dock.contains(screen.getByTestId('teacher-tools'))).toBe(true);
    expect(dock.contains(screen.getByTestId('teacher-shortcuts'))).toBe(true);
  });

  // Round 2 (critic cp1): a row of tool pills (Library / Class tools / Last
  // game / Full setup / Reports) sat right above the shell's tab bar, which
  // already carries Library and Reports — two nav systems. The tab bar stays
  // the one nav; everything else sits behind ONE Tools sheet (≤2 taps).
  it('Given the shell tab bar, Then the tool shortcuts sit behind one Tools sheet, not a visible row', () => {
    render(<TeacherDashboard />);
    const tools = screen.getByTestId('teacher-tools');
    expect(tools.contains(screen.getByTestId('teacher-shortcuts'))).toBe(true);
    // The lessons sheet keeps its deep link, but has no pill of its own.
    expect(screen.getByTestId('teacher-lessons').querySelector('summary')).toHaveAttribute('hidden');
  });

  it('When Tools → Word lists is tapped, Then the lessons sheet opens (2 taps)', () => {
    render(<TeacherDashboard />);
    fireEvent.click(screen.getByTestId('teacher-tools').querySelector('summary') as HTMLElement);
    fireEvent.click(screen.getByTestId('hq-tool-lessons'));
    expect(screen.getByTestId('teacher-lessons')).toHaveAttribute('open');
    expect(screen.getByTestId('teacher-tools')).not.toHaveAttribute('open');
  });

  it('Given ?classroomId= from a class card, Then that class is preselected', () => {
    search = new URLSearchParams('classroomId=c2');
    render(<TeacherDashboard />);
    expect(screen.getByTestId('class-switch-c2')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('hq-join-code')).toHaveTextContent('BBB222');
  });

  it('Given ?classroomId= for a class that is not theirs, Then it falls back to the first class', () => {
    search = new URLSearchParams('classroomId=nope');
    render(<TeacherDashboard />);
    expect(screen.getByTestId('class-switch-c1')).toHaveAttribute('aria-pressed', 'true');
  });
});
