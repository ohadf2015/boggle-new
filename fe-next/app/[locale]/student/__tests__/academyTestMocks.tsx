/**
 * Shared hook/data doubles for the student hub (Academy Map) page tests.
 * Import this module BEFORE importing the page under test — it only registers
 * `vi.mock` factories and exposes the knobs the tests turn.
 */
import React from 'react';
import { vi } from 'vitest';

const knobs = vi.hoisted(() => ({
  push: vi.fn(),
  auth: vi.fn(),
  activeGame: null as null | { gameCode: string; teacherName: string; lessonNames: string[] },
  classroom: { classroomId: 'c1' as string | null, classroom: { id: 'c1', name: 'ELA (7th)' } as { id: string; name: string } | null, level: 'core' },
  landscape: false,
  lessons: [] as unknown[],
  reviewLessonId: '',
  reviewCount: 0,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: knobs.push }),
  usePathname: () => '/en/student',
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: knobs.auth }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    // Echo the params so a call that passes them in the wrong position is visible.
    t: (k: string, a?: unknown, b?: unknown) => {
      const params = (a && typeof a === 'object' ? a : b) as Record<string, unknown> | undefined;
      return params ? `${k}|${JSON.stringify(params)}` : k;
    },
    language: 'en',
    dir: 'ltr',
  }),
}));
vi.mock('@/hooks/useStudentClassroom', () => ({ useStudentClassroom: () => knobs.classroom }));
vi.mock('@/components/education/EducationHeader', () => ({ EducationHeader: () => null }));
vi.mock('@/components/ui/PageLoader', () => ({ PageLoader: () => <div data-testid="loader" /> }));
vi.mock('@/lib/education/studentDisplayName', () => ({ resolveStudentDisplayName: () => 'Maya' }));
vi.mock('@/lib/supabase', () => ({ signOut: vi.fn() }));
vi.mock('@/lib/analytics/lazyPosthog', () => ({ default: { capture: vi.fn() } }));
vi.mock('next/image', () => ({
  __esModule: true,
  default: ({ fill: _f, priority: _p, ...p }: Record<string, unknown>) => React.createElement('img', p as never),
}));
vi.mock('@/components/Avatar', () => ({ default: () => <span data-testid="avatar" /> }));
vi.mock('@/components/education/ClassroomLeaderboard', () => ({ default: () => <div data-testid="leaderboard" /> }));
vi.mock('@/components/student/academy/useAcademyData', () => ({
  useAcademyData: () => ({
    lessons: knobs.lessons,
    lessonsLoading: false,
    reviewLessonId: knobs.reviewLessonId,
    reviewCount: knobs.reviewCount,
    streak: 3,
    stars: 2,
  }),
}));
vi.mock('@/hooks/useActiveClassroomGame', () => ({
  useActiveClassroomGame: () => ({ activeGame: knobs.activeGame, socket: null, isConnected: true }),
}));
vi.mock('@/hooks/useClassroomRewardListener', () => ({
  useClassroomRewardListener: () => ({ reward: null, clearReward: vi.fn() }),
}));

export function asStudent(extra: Record<string, unknown> = {}) {
  knobs.auth.mockReturnValue({
    user: { id: 's1', ...extra },
    profile: { id: 's1', user_role: null, total_xp: 120 },
    loading: false,
  });
}

export function resetKnobs() {
  knobs.push.mockReset();
  knobs.activeGame = null;
  knobs.classroom = { classroomId: 'c1', classroom: { id: 'c1', name: 'ELA (7th)' }, level: 'core' };
  knobs.lessons = [];
  knobs.reviewLessonId = '';
  knobs.reviewCount = 0;
  knobs.landscape = false;
  window.matchMedia = ((q: string) => ({
    matches: knobs.landscape && q.includes('aspect-ratio'),
    media: q,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as never;
  asStudent();
}
export { knobs };
