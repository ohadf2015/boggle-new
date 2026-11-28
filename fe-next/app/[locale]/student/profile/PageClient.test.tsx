import { vi } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

const state = vi.hoisted(() => ({
  lessons: [] as unknown[],
  progress: [] as unknown[],
  earnedRows: [] as unknown[],
  mode: { active: false, pending: false, lessons: null as unknown[] | null, error: false, retry: () => undefined },
}));
vi.mock('@/hooks/useTeacherStudentModeLessons', () => ({ useTeacherStudentModeLessons: () => state.mode }));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1' }, loading: false, profile: { display_name: 'Test Student', avatar_config: null } }),
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, f?: unknown) => (typeof f === 'string' ? f : k), language: 'en', dir: 'ltr' }),
}));
vi.mock('@/hooks/useStudentProgress', () => ({
  useStudentProgress: () => ({ lessons: state.lessons, progress: state.progress, isLoading: false, error: null }),
}));
vi.mock('@/components/student/pages/AcademyPageFrame', () => ({
  AcademyPageFrame: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  FrameSkeleton: () => <div />,
}));
vi.mock('@/components/Avatar', () => ({ default: () => <span /> }));
vi.mock('@/components/streak/StreakFlame', () => ({ StreakFlame: () => <span /> }));
vi.mock('@/lib/education/motion/useEduReducedMotion', () => ({ useEduReducedMotion: () => true }));
vi.mock('@/components/education', () => ({
  EducationBadgeGrid: ({ achievements }: { achievements: { achievementKey: string }[] }) => (
    <div data-testid="badge-grid">{achievements.map((a) => a.achievementKey)}</div>
  ),
}));
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (table: string) => ({
      select: () => {
        if (table === 'achievement_definitions') {
          return Promise.resolve({ data: [{ key: 'first_lesson', category: 'progress', icon: '📚', is_secret: false, base_name_key: 'n.first', base_description_key: 'd.first' }], error: null });
        }
        return { eq: () => Promise.resolve({ data: table === 'student_achievements' ? state.earnedRows : [], error: null }) };
      },
    }),
  },
}));

import StudentProfilePageClient from './PageClient';

const lesson = (p: Record<string, unknown>) => ({ lessonId: 'l1', status: 'started', progress: { total_xp: 0, current_streak: 0, words_mastered: [], total_practice_sessions: 0, ...p } });

describe('StudentProfilePageClient', () => {
  beforeEach(() => {
    state.lessons = [];
    state.progress = [];
    state.earnedRows = [];
    state.mode = { active: false, pending: false, lessons: null, error: false, retry: () => undefined };
  });

  test('given a teacher in student mode, then the stats are their own progress on that class’s lessons only', async () => {
    state.lessons = [lesson({ total_xp: 500, total_practice_sessions: 9 })];
    state.progress = [{ lesson_id: 'c-l1', total_xp: 20, current_streak: 1, words_mastered: ['a'], total_practice_sessions: 1, completed_at: null }];
    state.mode = { ...state.mode, active: true, lessons: [{ lessonId: 'c-l1', status: 'assigned', lesson: { id: 'c-l1', name: 'Class', words: [] } }, { lessonId: 'c-l2', status: 'assigned', lesson: { id: 'c-l2', name: 'Two', words: [] } }] };
    render(<StudentProfilePageClient />);
    await waitFor(() => expect(screen.getByText('20 education.xp.totalXp')).toBeInTheDocument());
  });

  test('given the student-mode class read failed, then a retry shows instead of a brand-new-student profile', () => {
    state.mode = { ...state.mode, active: true, error: true };
    render(<StudentProfilePageClient />);
    expect(screen.getByTestId('student-view-retry')).toBeInTheDocument();
    expect(screen.queryByTestId('profile-first-step')).toBeNull();
  });

  test('given a new student, then one first step replaces the dead zero stats', async () => {
    state.lessons = [lesson({})];
    render(<StudentProfilePageClient />);
    await waitFor(() => expect(screen.getByTestId('profile-first-step')).toBeInTheDocument());
    expect(screen.getByTestId('profile-first-step').querySelector('a')).toHaveAttribute('href', '/en/student/lessons');
    expect(screen.queryByText('education.practice.wordsFound')).toBeNull();
  });

  test('given a new student on a phone, then the play button drops under the copy instead of squeezing it to one word per line', async () => {
    state.lessons = [lesson({})];
    render(<StudentProfilePageClient />);
    const card = await screen.findByTestId('profile-first-step');
    expect(card.className).toMatch(/(^|\s)flex-wrap(\s|$)/);
    expect(card.querySelector('a')!.className).toMatch(/(^|\s)w-full(\s|$)/);
    expect(card.querySelector('a')!.className).toMatch(/(^|\s)sm:w-auto(\s|$)/);
  });

  test('given nothing earned, then the achievements heading appears once with a link to all awards and no pin line', async () => {
    state.lessons = [lesson({})];
    render(<StudentProfilePageClient />);
    await waitFor(() => expect(screen.getByTestId('profile-awards-teaser')).toBeInTheDocument());
    expect(screen.getAllByText('student.dashboard.achievements')).toHaveLength(1);
    expect(screen.getByText('student.dashboard.viewAll').closest('a')).toHaveAttribute('href', '/en/student/achievements');
    expect(screen.queryByText(/pinned/i)).toBeNull();
    expect(screen.getByTestId('profile-awards-teaser')).toHaveTextContent('Closest award');
  });

  test('given XP in two lessons, then the profile adds them up', async () => {
    state.lessons = [lesson({ total_xp: 100, words_mastered: ['a'], total_practice_sessions: 2 }), lesson({ total_xp: 50, words_mastered: ['b', 'c'], total_practice_sessions: 1 })];
    render(<StudentProfilePageClient />);
    await waitFor(() => expect(screen.getByText('150 education.xp.totalXp')).toBeInTheDocument());
    expect(screen.queryByTestId('profile-first-step')).toBeNull();
  });

  test('given earned rows, then the badge grid shows without a second heading from the page', async () => {
    state.lessons = [lesson({ total_xp: 10, total_practice_sessions: 1 })];
    state.earnedRows = [{ current_tier: 'bronze', progress_value: 1, is_pinned: false, achievement_definitions: { key: 'first_lesson', category: 'progress', icon: '📚', is_secret: false, achievement_tiers: [] } }];
    render(<StudentProfilePageClient />);
    await waitFor(() => expect(screen.getByTestId('badge-grid')).toBeInTheDocument());
    expect(screen.queryByText('student.dashboard.achievements')).toBeNull();
  });
});
