/**
 * The dashboard fits the viewport, and the hero is the only loud thing on it.
 *
 * Measured before this: `/en/teacher` scrolled the document body, and above the
 * PLAY NOW panel sat a title block, a plan badge, and — for a teacher with no
 * classroom — a SECOND create-a-classroom form duplicating what GO LIVE already
 * does silently. Three things competing to be first on a screen with one job.
 *
 * Contract now: one `EducationShell`, one slim status row above the hero, one
 * scrolling region, and no create-classroom form anywhere on the landing screen.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const classroomsMock = { value: [{ id: 'c1', name: 'Class 1' }] as Array<{ id: string; name: string }> };

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1' }, profile: { user_role: 'teacher', is_admin: false }, loading: false }),
}));
vi.mock('@/hooks/useClassroom', () => ({
  useClassrooms: () => ({
    classrooms: classroomsMock.value,
    isLoading: false,
    error: null,
    refresh: vi.fn(),
    createClassroom: vi.fn(),
  }),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/en/teacher',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/components/education/EducationHeader', () => ({
  EducationHeader: () => <div data-testid="education-header" />,
}));
vi.mock('@/components/education/TeacherOnboarding', () => ({
  TeacherOnboarding: () => <div data-testid="teacher-onboarding" />,
}));
vi.mock('@/components/teacher/ClassroomManager', () => ({ default: () => <div data-testid="classroom-manager" /> }));
vi.mock('@/components/teacher/LessonBuilder', () => ({ default: () => <div data-testid="lesson-builder" /> }));
vi.mock('@/components/teacher/assignments', () => ({
  AssignmentTrackingPanel: () => <div data-testid="assignment-panel" />,
  AssignmentCreator: () => <div data-testid="assignment-creator" />,
}));
vi.mock('@/components/teacher/analytics/AnalyticsDashboard', () => ({
  AnalyticsDashboard: () => <div data-testid="analytics-dashboard" />,
}));
vi.mock('@/components/teacher/analytics/LastGameInsights', () => ({
  LastGameInsights: () => <div data-testid="last-game-insights" />,
}));
vi.mock('@/components/teacher/ProGate', () => ({
  ProGate: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/components/teacher/ProWelcomeCelebration', () => ({ ProWelcomeCelebration: () => null }));
vi.mock('@/components/teacher/StudentsPresentStrip', () => ({ default: () => <div data-testid="students-present" /> }));
vi.mock('@/hooks/useTeacherPro', () => ({
  useTeacherPro: () => ({ grant: null, loading: false, hasPro: false, source: null, periodEnd: null, refresh: vi.fn(), grantExpired: false }),
}));
vi.mock('@/components/teacher/dashboard/PlayNowLauncher', () => ({
  PlayNowLauncher: () => <div data-testid="play-now-launcher" />,
}));

import TeacherDashboard from '../TeacherDashboard';

describe('<TeacherDashboard> — fits the viewport', () => {
  it('renders inside the shared shell rather than its own scrolling root', () => {
    render(<TeacherDashboard />);
    expect(screen.getByTestId('education-shell')).toBeInTheDocument();
  });

  it('scrolls in exactly one region', () => {
    render(<TeacherDashboard />);
    const root = screen.getByTestId('education-shell');
    const scrollers = [...root.querySelectorAll('*')].filter((el) =>
      /overflow-y-auto|overflow-auto|overflow-y-scroll/.test(el.className?.toString() ?? ''),
    );
    expect(scrollers).toHaveLength(1);
  });

  it('keeps the plan badge in the ONE slim status row, not stacked above the hero', () => {
    render(<TeacherDashboard />);
    const status = screen.getByTestId('education-shell-status');
    expect(status.contains(screen.getByTestId('teacher-plan-badge'))).toBe(true);
    // Nothing else claims the space between the header and the hero.
    expect(screen.queryAllByTestId('education-shell-status')).toHaveLength(1);
  });

  it('greets the teacher with the mascot beside the title', () => {
    render(<TeacherDashboard />);
    const mascot = screen.getByTestId('teacher-greeting-mascot');
    expect(mascot.getAttribute('src')).toContain('teacher-hero');
  });

  it('leads the scroll region with the hero — GO LIVE is the first thing in it', () => {
    render(<TeacherDashboard />);
    const region = screen.getByTestId('education-shell-scroll');
    expect(region.contains(screen.getByTestId('play-now-launcher'))).toBe(true);
    const loud = region.querySelectorAll('[data-testid="play-now-launcher"]');
    expect(loud).toHaveLength(1);
  });

  it('keeps recent games, setup and reports one tap away in a compact row', () => {
    render(<TeacherDashboard />);
    const shortcuts = screen.getByTestId('teacher-shortcuts');
    expect(shortcuts.querySelectorAll('[data-testid^="shortcut-"]')).toHaveLength(3);
  });

  describe('nothing blocks the one button', () => {
    /**
     * Measured live at 1440x900 on /en/teacher: the first-run walkthrough
     * rendered as `fixed inset-0 z-[100]`, opaque and `pointer-events:auto`,
     * over an armed GO LIVE — `elementFromPoint` at the button's centre
     * returned the modal, not the button. A fullscreen prompt above the
     * primary action is the defect the addendum spells out for consent and
     * install prompts; it arrives here from a different component.
     *
     * Asserted on the SOURCE, not the render: the walkthrough is a
     * `next/dynamic` import and its loader never resolves under jsdom, so a
     * `queryByTestId` for it returns null whatever the gate says — a test that
     * passes for the wrong reason and would keep passing if the gate were
     * deleted. The live hit-test is the behavioural proof.
     */
    const src = readFileSync(
      path.join(__dirname, '..', 'TeacherDashboard.tsx'),
      'utf8',
    );

    it('gates the walkthrough on the teacher having no classroom yet', () => {
      expect(src).toMatch(
        /\{!classroomsLoading && classrooms\.length === 0 && \(\s*<TeacherOnboarding/,
      );
    });

    it('still mounts it for that teacher, rather than dropping it', () => {
      expect(src).toContain('<TeacherOnboarding onDismiss=');
    });
  });

  describe('desktop is a real layout, not a stretched phone', () => {
    it('uses the width instead of a narrow centred column', () => {
      render(<TeacherDashboard />);
      const grid = screen.getByTestId('teacher-dashboard-grid');
      // max-w-5xl (1024) left a 1440 screen two-thirds empty.
      expect(grid.className).toContain('max-w-[1280px]');
    });

    it('puts the hero in the wide column and the secondary row beside it', () => {
      render(<TeacherDashboard />);
      const grid = screen.getByTestId('teacher-dashboard-grid');
      expect(grid.className).toMatch(/lg:grid-cols-3/);

      const main = screen.getByTestId('teacher-dashboard-main');
      const aside = screen.getByTestId('teacher-dashboard-aside');
      expect(main.className).toContain('lg:col-span-2');
      expect(main.contains(screen.getByTestId('play-now-launcher'))).toBe(true);
      // Recent games / setup / reports live in the 1/3 rail, never as a wall.
      expect(aside.contains(screen.getByTestId('teacher-shortcuts'))).toBe(true);
    });

    it('gives the phone a bottom tab bar and every wider screen a sidebar', () => {
      render(<TeacherDashboard />);
      // The handover is at `md`, not `lg`: a tablet gets the sidebar collapsed
      // to an icon rail and NO bottom bar. Carrying both would spend a row of
      // the teacher's content on a duplicate nav.
      expect(screen.getByTestId('education-tabbar').className).toContain('md:hidden');
      expect(screen.getByTestId('education-sidebar').className).toContain('md:flex');
      expect(screen.getByTestId('education-sidebar').className).toContain('lg:w-60');
    });
  });

  describe('a teacher with no classroom yet', () => {
    it('shows the mascot empty state, not a second create-classroom form', () => {
      classroomsMock.value = [];
      render(<TeacherDashboard />);
      // The duplicate form: GO LIVE already provisions a classroom silently.
      expect(document.querySelector('#classroom-name')).toBeNull();
      const art = screen.getByTestId('teacher-empty-classroom-art');
      expect(art.getAttribute('src')).toContain('hero-empty-classroom');
      classroomsMock.value = [{ id: 'c1', name: 'Class 1' }];
    });
  });
});
