/**
 * Pitfalls Class 1 — a practice deep link opened cold (typed URL / hard reload).
 *
 * Auth resolves in two steps: `loading` flips false as soon as the Supabase
 * session is read (`user` set), while the profile row — which `isAuthenticated`
 * also requires — arrives a moment later. The page used to decide "guest" in
 * that gap, auto-start the round as a device-local guest round, and never POST
 * a `practice_sessions` row. An anonymous classroom student opening an
 * assignment link therefore could never have the round recorded as homework.
 *
 * Uses the REAL `usePracticeProgress` so the guest-vs-signed-in decision and the
 * page's auto-start are exercised together, against a mocked fetch.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import React from 'react';

const { mockUseAuth } = vi.hoisted(() => ({ mockUseAuth: vi.fn() }));

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => mockUseAuth() }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useParams: () => ({ id: 'lesson-1' }),
  useSearchParams: () => new URLSearchParams('mode=solo_board&variant=wordcraft'),
  usePathname: () => '/en/student/lessons/lesson-1',
}));
vi.mock('next/dynamic', () => ({ __esModule: true, default: () => () => null }));

vi.mock('@/hooks/usePracticeLessons', () => ({
  usePracticeLesson: () => ({
    lesson: {
      id: 'lesson-1',
      name: 'Week 3',
      description: null,
      language: 'en',
      words: [{ word: 'banter' }, { word: 'quorum' }],
      classroom_id: 'c1',
      assignment: null,
    },
    isLoading: false,
    error: null,
  }),
}));
vi.mock('@/hooks/useStudentClassroom', () => ({
  useStudentClassroom: () => ({ level: 'core', isLoading: false }),
}));

vi.mock('@/components/education/EducationHeader', () => ({ EducationHeader: () => <div>header</div> }));
vi.mock('@/components/ui/PageLoader', () => ({ PageLoader: () => <div data-testid="page-loader">loading</div> }));
vi.mock('@/components/education/XpProgressBar', () => ({ __esModule: true, default: () => <div>xp</div> }));
vi.mock('@/components/education/StreakBonusIndicator', () => ({ __esModule: true, default: () => <div>streak</div> }));
vi.mock('@/components/education/practicePicker/PracticePicker', () => ({
  __esModule: true,
  default: () => <div data-testid="picker">picker</div>,
}));
vi.mock('@/components/education/practice/PracticeModeStage', () => ({
  __esModule: true,
  default: () => <div data-testid="practice-stage">stage</div>,
}));
vi.mock('@/components/education/PracticeSessionProvider', () => ({
  PracticeSessionProvider: ({ children, studentId }: { children: React.ReactNode; studentId: string }) => (
    <div data-testid="session-provider" data-student-id={studentId}>
      {children}
    </div>
  ),
  usePracticeSession: () => ({
    totalXp: 0,
    streak: { currentStreak: 0 },
    sessionXpEarned: 0,
    sessionMasteryMessage: null,
    completePracticeSession: vi.fn(),
    levelUpData: null,
    dismissLevelUp: vi.fn(),
  }),
}));

import LessonPracticePageClient from '../PageClient';
import { readGuestPractice } from '@/lib/education/practiceGuestProgress';

const fetchMock = vi.fn();

function postCalls() {
  return fetchMock.mock.calls.filter(
    ([url, init]) => String(url) === '/api/education/practice' && (init as RequestInit | undefined)?.method === 'POST'
  );
}

beforeEach(() => {
  localStorage.clear();
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (_url: string, init?: RequestInit) => {
    if (init?.method === 'POST') {
      return { ok: true, json: async () => ({ session: { id: 'session-1' } }) };
    }
    return { ok: true, json: async () => ({ progress: null, mastery: 'not_started' }) };
  });
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('practice deep link opened before auth has resolved', () => {
  it('starts exactly one server session for a student whose profile lands after the session', async () => {
    // Given: first paint — auth still loading, no user yet
    mockUseAuth.mockReturnValue({ user: null, profile: null, isAuthenticated: false, loading: true });
    const { rerender } = render(<LessonPracticePageClient />);
    expect(screen.getByTestId('page-loader')).toBeInTheDocument();

    // When: the session resolves (user set, loading done) but the profile is still in flight…
    const user = { id: 'anon-student-1', is_anonymous: true };
    mockUseAuth.mockReturnValue({ user, profile: null, isAuthenticated: false, loading: false });
    await act(async () => {
      rerender(<LessonPracticePageClient />);
    });
    // …and then the profile arrives.
    mockUseAuth.mockReturnValue({ user, profile: { id: user.id }, isAuthenticated: true, loading: false });
    await act(async () => {
      rerender(<LessonPracticePageClient />);
    });

    // Then: one POST, the round runs under the student's id, and nothing was
    // written to the device as a guest round.
    await waitFor(() => expect(postCalls()).toHaveLength(1));
    const body = JSON.parse(String((postCalls()[0][1] as RequestInit).body));
    expect(body).toMatchObject({ lessonId: 'lesson-1', practiceType: 'solo_board', variant: 'wordcraft' });
    expect(screen.getByTestId('session-provider').getAttribute('data-student-id')).toBe('anon-student-1');
    expect(readGuestPractice('lesson-1').sessions.solo_board ?? 0).toBe(0);
    expect(screen.getByTestId('practice-stage')).toBeInTheDocument();
  });

  it('still runs a real no-account visitor as a device-local guest round, with no POST', async () => {
    // Given: first paint — auth still loading
    mockUseAuth.mockReturnValue({ user: null, profile: null, isAuthenticated: false, loading: true });
    const { rerender } = render(<LessonPracticePageClient />);

    // When: auth resolves with no session at all
    mockUseAuth.mockReturnValue({ user: null, profile: null, isAuthenticated: false, loading: false });
    await act(async () => {
      rerender(<LessonPracticePageClient />);
    });

    // Then: the round opens, is counted on the device, and never hits the server
    expect(await screen.findByTestId('practice-stage')).toBeInTheDocument();
    await waitFor(() => expect(readGuestPractice('lesson-1').sessions.solo_board ?? 0).toBe(1));
    expect(postCalls()).toHaveLength(0);
  });
});
