/**
 * "Practice these words" has to actually go somewhere.
 *
 * `LastGameInsights` is the good half of the after-game story — coverage,
 * per-word miss rate, per-student table, all free and all backed by rows the
 * server really writes. Its one action button pushed
 * `?tab=lessons&reviewWords=…`, and:
 *
 *   - nothing in the repo read `reviewWords`; a repo-wide grep found exactly two
 *     occurrences, both writers;
 *   - `lessons` is not a tab id. The tabs are `play | prepare | review`, and
 *     `activeTab` was local state seeded to `'play'` that never read the URL.
 *
 * So the teacher tapped it at the bell, the page reloaded onto the Play tab, and
 * the missed words were dropped. The insight was right and the follow-through
 * was a no-op — the worst pairing, because it teaches her the feature is broken.
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

const { mockSearchParams, mockUseAuth } = vi.hoisted(() => ({
  mockSearchParams: new URLSearchParams(),
  mockUseAuth: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => mockSearchParams,
}));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, language: 'en' }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: mockUseAuth }));
vi.mock('@/hooks/useClassroom', () => ({
  useClassrooms: () => ({ classrooms: [], isLoading: false, error: null, refresh: vi.fn() }),
}));
vi.mock('@/hooks/useRecentGameSettings', () => ({
  useRecentGameSettings: () => ({ getMostRecent: () => null, hasRecentConfig: false }),
}));
vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => ({ grant: null, loading: false, hasPro: false }) }));

// Stub every heavy child; the deep link is the whole subject here.
vi.mock('@/components/education/EducationHeader', () => ({ EducationHeader: () => null }));
vi.mock('@/components/education/TeacherOnboarding', () => ({ TeacherOnboarding: () => null }));
vi.mock('@/components/education/TeacherWelcomeBanner', () => ({ TeacherWelcomeBanner: () => null }));
vi.mock('../ClassroomManager', () => ({ __esModule: true, default: () => null }));
vi.mock('../PlayTabFirstRunCard', () => ({ __esModule: true, default: () => null }));
vi.mock('../QuickStartButton', () => ({ __esModule: true, default: () => null }));
vi.mock('../StudentsPresentStrip', () => ({ __esModule: true, default: () => null }));
vi.mock('../assignments', () => ({ AssignmentTrackingPanel: () => null, AssignmentCreator: () => null }));
vi.mock('../dashboard', () => ({ DuelMonitoringPanel: () => null }));
vi.mock('../analytics/AnalyticsDashboard', () => ({ AnalyticsDashboard: () => null }));
vi.mock('../analytics/LastGameInsights', () => ({ LastGameInsights: () => null }));
vi.mock('../ProGate', () => ({ ProGate: ({ children }: { children: React.ReactNode }) => children }));
vi.mock('../curriculum/CurriculumWordListBrowser', () => ({ CurriculumWordListBrowser: () => null }));
vi.mock('../TeacherPlanBadge', () => ({ TeacherPlanBadge: () => null }));
vi.mock('../ProWelcomeCelebration', () => ({ ProWelcomeCelebration: () => null }));
vi.mock('../LessonBuilder', () => ({
  __esModule: true,
  default: ({ initialReviewWords }: { initialReviewWords?: string[] }) => (
    <div data-testid="lesson-builder" data-review-words={(initialReviewWords ?? []).join('|')} />
  ),
}));
vi.mock('framer-motion', () => ({
  m: new Proxy({}, {
    get: () => ({ children, ...p }: { children?: React.ReactNode; [k: string]: unknown }) =>
      React.createElement('div', p, children as React.ReactNode),
  }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

import TeacherDashboard from '../TeacherDashboard';

function setParams(query: string) {
  for (const key of Array.from(mockSearchParams.keys())) mockSearchParams.delete(key);
  new URLSearchParams(query).forEach((v, k) => mockSearchParams.set(k, v));
}

describe('TeacherDashboard — the review-words deep link', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      profile: { user_role: 'teacher', is_admin: false },
      user: { id: 'teacher-1' },
    });
  });

  it('lands on Prepare and hands the missed words to the lesson creator', async () => {
    // GIVEN the CTA's URL
    setParams('tab=prepare&reviewWords=photosynthesis%2Cchlorophyll');

    // WHEN the dashboard mounts on it
    render(<TeacherDashboard />);

    // THEN the Prepare tab is showing and the words arrived
    const builder = await screen.findByTestId('lesson-builder');
    expect(builder).toHaveAttribute('data-review-words', 'photosynthesis|chlorophyll');
  });

  it('honours ?tab= on first render for every real tab id', async () => {
    // GIVEN a bare tab deep link
    setParams('tab=prepare');

    // WHEN the dashboard mounts
    render(<TeacherDashboard />);

    // THEN it opens there rather than on Play
    await waitFor(() => expect(screen.getByTestId('lesson-builder')).toBeInTheDocument());
  });

  it('ignores a tab id that does not exist and stays on Play', () => {
    // GIVEN the old broken CTA's `tab=lessons`, or any typo
    setParams('tab=lessons');

    // WHEN the dashboard mounts
    render(<TeacherDashboard />);

    // THEN it does not render the Prepare tab's content
    expect(screen.queryByTestId('lesson-builder')).not.toBeInTheDocument();
  });
});
