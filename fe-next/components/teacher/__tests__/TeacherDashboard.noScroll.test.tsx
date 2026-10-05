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

const classroomsMock = { value: [{ id: 'c1', name: 'Class 1', member_count: 3 }] as Array<{ id: string; name: string; member_count?: number }> };

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

  it('keeps last game, setup and reports in ONE Tools sheet — ≤2 taps, no second nav row beside the tab bar', () => {
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
      // Cap ~1280 so wide monitors keep density without stretching tables;
      // TEACHER_TV_SCALE zooms the whole shell on very large TVs.
      expect(grid.className).toContain('max-w-[1280px]');
    });

    it('puts the hero in the wide column and the secondary row beside it', () => {
      render(<TeacherDashboard />);
      const grid = screen.getByTestId('teacher-dashboard-grid');
      // Two equal halves: the folded launcher no longer needs 3/5, and the
      // class pulse beside it is the hero for a class with students.
      expect(grid.className).toMatch(/sm:grid-cols-2/);
      expect(grid.className).toContain('sm:items-start');

      const main = screen.getByTestId('teacher-dashboard-main');
      const aside = screen.getByTestId('teacher-dashboard-aside');
      expect(main.className).toContain('sm:col-span-1');
      expect(aside.className).toContain('sm:col-span-1');
      expect(main.contains(screen.getByTestId('play-now-launcher'))).toBe(true);
      // Teacher HQ: the 1/3 rail is the "Get students in" hero; last game /
      // setup / reports live in the Tools sheet opened from the dock (round 2:
      // the old pill row duplicated the shell tab bar) — ≤2 taps, never a
      // wall, and never inside either hero column.
      const dock = screen.getByTestId('teacher-dashboard-dock');
      expect(dock.contains(screen.getByTestId('teacher-shortcuts'))).toBe(true);
      expect(main.contains(screen.getByTestId('teacher-shortcuts'))).toBe(false);
      expect(aside.contains(screen.getByTestId('teacher-shortcuts'))).toBe(false);
    });

    it('Given a landscape phone (844x390), Then the deck is two columns side by side, not a stacked scroll', () => {
      render(<TeacherDashboard />);
      // Below lg the deck stacks; on a phone turned sideways that column is
      // ~2x the 390px height. A short landscape screen gets the desktop split.
      const LS = '[@media(orientation:landscape)_and_(max-height:500px)]:';
      expect(screen.getByTestId('teacher-dashboard-grid').className).toContain(`${LS}grid-cols-2`);
      expect(screen.getByTestId('teacher-dashboard-main').className).toContain(`${LS}col-span-1`);
      expect(screen.getByTestId('teacher-dashboard-aside').className).toContain(`${LS}col-span-1`);
    });

    it('Given a 2560x1440 TV, Then the whole shell scales up instead of floating a 1920 island', () => {
      render(<TeacherDashboard />);
      expect(screen.getByTestId('education-shell').className).toContain(
        '[@media(min-width:2200px)_and_(min-height:1200px)]:[zoom:1.3333]',
      );
    });

    it('gives the phone/tablet a bottom tab bar and desktop (≥1024) a sidebar', () => {
      render(<TeacherDashboard />);
      // Handover at `lg` (1024): below that bottom tabs only — no permanent
      // sidebar (even a 72px rail) eating tablet width. Never both.
      expect(screen.getByTestId('education-tabbar').className).toContain('lg:hidden');
      expect(screen.getByTestId('education-sidebar').className).toContain('lg:flex');
      expect(screen.getByTestId('education-sidebar').className).toContain('w-60');
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
      classroomsMock.value = [{ id: 'c1', name: 'Class 1', member_count: 3 }];
    });
  });

  describe('narrow phones do not force horizontal scroll', () => {
    it('Given the deck, Then columns can shrink (min-w-0) instead of growing past the viewport', () => {
      render(<TeacherDashboard />);
      expect(screen.getByTestId('teacher-dashboard-grid').className).toContain('min-w-0');
      expect(screen.getByTestId('teacher-dashboard-main').className).toContain('min-w-0');
      expect(screen.getByTestId('teacher-dashboard-aside').className).toContain('min-w-0');
    });

    it('Given a Pro chip on a phone, Then the dock spacer is narrower than the old w-60', () => {
      // Source contract: absolute dock needs reserved end space, but w-60 on a
      // 320px phone left ~56px for the class chip and invited sideways scroll.
      const src = readFileSync(path.join(__dirname, '..', 'TeacherDashboard.tsx'), 'utf8');
      expect(src).toMatch(/chipVisible \? 'w-36 max-\[360px\]:w-28 sm:w-60/);
      expect(src).not.toMatch(/chipVisible \? 'w-60 sm:w-72'/);
    });
  });
});
