/**
 * Teacher HQ keeps its FINAL layout in every data state.
 *
 * Round 3 capture (P2 r2 verdict): the phone caught the classroom read still
 * open — the "Get students in" card unmounted and the four mode cards
 * stretched into tall empty columns to fill the freed height. The contract:
 *
 *  - loading: the join card region is on screen as a skeleton (no controls),
 *    and the class chip keeps its slot;
 *  - zero classes: the same region becomes "create your class" with ONE CTA;
 *  - loaded: the class name chip reads correctly even when the data is in the
 *    opposite script (a Latin class name under Hebrew UI);
 *  - mode cards keep a fixed aspect on phones in every state — the REAL
 *    launcher renders here, not a stub, so the aspect class is really there.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';

type Classroom = { id: string; name: string; join_code: string; member_count: number };
const state = {
  language: 'en',
  classrooms: [] as Classroom[],
  isLoading: true,
};

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, a?: unknown) => (typeof a === 'string' ? a : k),
    language: state.language,
  }),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1' }, profile: { user_role: 'teacher', is_admin: false }, loading: false }),
}));
vi.mock('@/hooks/useClassroom', () => ({
  useClassrooms: () => ({
    classrooms: state.classrooms,
    isLoading: state.isLoading,
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
vi.mock('@/hooks/useTeacherDashboardDeepLink', () => ({ useTeacherDashboardDeepLink: () => ({ reviewWords: [] }) }));
vi.mock('@/components/education/EducationHeader', () => ({ EducationHeader: () => <div /> }));
vi.mock('@/components/education/TeacherOnboarding', () => ({ TeacherOnboarding: () => null }));
vi.mock('@/components/teacher/LessonBuilder', () => ({ default: () => <div /> }));
vi.mock('@/components/teacher/assignments', () => ({
  AssignmentTrackingPanel: () => <div />,
  AssignmentCreator: () => <div />,
}));
vi.mock('@/components/teacher/ProWelcomeCelebration', () => ({ ProWelcomeCelebration: () => null }));
vi.mock('@/components/teacher/hq/HqToolsContent', () => ({ HqToolsContent: () => <div /> }));
vi.mock('@/hooks/useTeacherPro', () => ({
  useTeacherPro: () => ({ grant: null, loading: false, hasPro: false, source: null, refresh: vi.fn() }),
}));
vi.mock('@/components/teacher/hq/useClassRoster', () => ({
  useClassRoster: () => ({ students: [], loading: false, arrivals: [] }),
}));
// The launcher is REAL; only its data hooks are stubbed (lessons still loading).
vi.mock('@/hooks/useVocabularyLesson', () => ({ useLessons: () => ({ lessons: [], isLoading: true }) }));
vi.mock('@/hooks/useRecentGameSettings', () => ({ useRecentGameSettings: () => ({ recentConfigs: [] }) }));

import TeacherDashboard from '../TeacherDashboard';

const LATIN = "Ms. Rivera's Class";

function joinRegion() {
  return screen.getByRole('region', { name: /get students in/i });
}

function expectModeCardsKeepTheirAspect() {
  const cards = screen.getAllByTestId(/^hq-mode-/);
  expect(cards.length).toBeGreaterThanOrEqual(4);
  for (const card of cards) {
    const cls = card.className.toString();
    // A fixed aspect on phones, and never stretched to the grid row's height.
    expect(cls, cls).toMatch(/(^|\s)aspect-\[\d+\/\d+\]/);
    expect(cls, cls).toMatch(/(^|\s)self-start(\s|$)/);
  }
}

describe('<TeacherDashboard> — layout survives every data state', () => {
  beforeEach(() => {
    state.language = 'en';
    state.classrooms = [];
    state.isLoading = true;
  });

  describe('Given the classroom read is still open', () => {
    it('Then the "Get students in" card stays mounted as a skeleton, with no live controls', () => {
      render(<TeacherDashboard />);
      const region = joinRegion();
      const skeleton = screen.getByTestId('hq-join-skeleton');
      expect(region.contains(skeleton) || region === skeleton).toBe(true);
      expect(region).toHaveAttribute('aria-busy', 'true');
      // Shimmer code boxes + placeholder buttons — placeholders, not buttons.
      expect(within(region).getAllByTestId('hq-join-skeleton-code-box')).toHaveLength(6);
      expect(within(region).getAllByTestId('hq-join-skeleton-action')).toHaveLength(3);
      expect(within(region).queryAllByRole('button')).toHaveLength(0);
      // Neither the first-run card nor a live code can flash in mid-load.
      expect(screen.queryByTestId('play-tab-first-run-card')).toBeNull();
      expect(screen.queryByTestId('hq-join-code')).toBeNull();
    });

    it('Then the mode cards keep a fixed aspect instead of stretching into the freed height', () => {
      render(<TeacherDashboard />);
      expectModeCardsKeepTheirAspect();
      // The phone's hero column sizes to its content, it does not grow.
      const main = screen.getByTestId('teacher-dashboard-main');
      expect(main.className).not.toMatch(/(^|\s)flex-1(\s|$)/);
    });

    it('Then the class chip keeps its slot at the top', () => {
      render(<TeacherDashboard />);
      expect(screen.getByTestId('hq-class-chip-skeleton')).toBeInTheDocument();
    });
  });

  describe('Given a teacher with zero classrooms', () => {
    beforeEach(() => {
      state.isLoading = false;
      state.classrooms = [];
    });

    it('Then the join slot invites them to create a class, with the one create CTA', () => {
      render(<TeacherDashboard />);
      const region = joinRegion();
      expect(within(region).getByText('Create your class, get a code in 5 seconds')).toBeInTheDocument();
      expect(within(region).getByTestId('first-run-create-class')).toBeInTheDocument();
      expect(within(region).getAllByRole('button')).toHaveLength(1);
      expect(screen.queryByTestId('hq-join-skeleton')).toBeNull();
    });

    it('Then the mode cards still keep their aspect', () => {
      render(<TeacherDashboard />);
      expectModeCardsKeepTheirAspect();
    });
  });

  describe('Given loaded classes', () => {
    beforeEach(() => {
      state.isLoading = false;
    });

    it('Then the join card is live and the mode cards keep their aspect', () => {
      state.classrooms = [{ id: 'c1', name: 'Period 1', join_code: 'AAA111', member_count: 0 }];
      render(<TeacherDashboard />);
      expect(within(joinRegion()).getByTestId('hq-join-code')).toHaveTextContent('AAA111');
      expect(joinRegion()).not.toHaveAttribute('aria-busy', 'true');
      expectModeCardsKeepTheirAspect();
    });

    it('Then a Latin class name under Hebrew UI isolates its direction and truncates at its END', () => {
      state.language = 'he';
      state.classrooms = [{ id: 'c1', name: LATIN, join_code: 'AAA111', member_count: 0 }];
      render(<TeacherDashboard />);
      const chip = screen.getByTestId('hq-class-chip');
      const label = within(chip).getByText(LATIN);
      // dir="auto" resolves LTR from the first strong char, so the ellipsis
      // lands at the end ("MS. RIVERA'S …"), never a leading "…ERA'S CLASS".
      expect(label).toHaveAttribute('dir', 'auto');
      expect(label.className).toMatch(/(^|\s)truncate(\s|$)/);
      expect(label.textContent).toBe(LATIN);
    });

    it('Then with several classes each switcher chip isolates its name the same way', () => {
      state.language = 'he';
      state.classrooms = [
        { id: 'c1', name: LATIN, join_code: 'AAA111', member_count: 0 },
        { id: 'c2', name: 'כיתה ב', join_code: 'BBB222', member_count: 2 },
      ];
      render(<TeacherDashboard />);
      const label = within(screen.getByTestId('class-switch-c1')).getByText(LATIN);
      expect(label).toHaveAttribute('dir', 'auto');
      expect(label.className).toMatch(/(^|\s)truncate(\s|$)/);
    });
  });
});
