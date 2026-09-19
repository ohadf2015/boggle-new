/**
 * PracticeSessionProvider — server completion (the missing PATCH).
 *
 * `completePracticeSession` computed XP client-side for the UI, then a stale
 * comment claimed "XP persistence is handled server-side by PATCH
 * /api/education/practice" — but nothing ever called it. `completed_at` never
 * got set, `student_practice_progress` (which only counts completed rows)
 * stayed empty, and students earned 0 real XP forever. This file pins down
 * the PATCH call now threaded through via `sessionId` on
 * CompletePracticeSessionData.
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const {
  mockAwardPracticeXp,
  mockAcknowledgePersistence,
  mockCheckForUnlocks,
  mockAcknowledgeUnlock,
  mockLoggerError,
} = vi.hoisted(() => ({
  mockAwardPracticeXp: vi.fn(),
  mockAcknowledgePersistence: vi.fn(),
  mockCheckForUnlocks: vi.fn(),
  mockAcknowledgeUnlock: vi.fn(),
  mockLoggerError: vi.fn(),
}));

vi.mock('@/utils/logger', () => ({
  __esModule: true,
  default: { log: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: mockLoggerError, info: vi.fn() },
}));

vi.mock('@/lib/education/telemetry', () => ({
  trackEduPracticeComplete: vi.fn(),
  trackEduError: vi.fn(),
}));

vi.mock('@/hooks/useEducationXp', () => ({
  __esModule: true,
  default: vi.fn(() => ({
    totalXp: 500,
    currentLevel: 3,
    xpProgress: {
      currentLevel: 3,
      progressPercent: 50,
      xpInCurrentLevel: 100,
      xpNeededForNextLevel: 200,
      isMaxLevel: false,
    },
    streak: { currentStreak: 5, longestStreak: 10, lastPracticeDate: '2026-01-25' },
    awardPracticeXp: mockAwardPracticeXp,
    acknowledgePersistence: mockAcknowledgePersistence,
    isLoading: false,
    error: null,
    pendingUpdate: null,
  })),
}));

vi.mock('@/hooks/useAchievementUnlock', () => ({
  __esModule: true,
  default: vi.fn(() => ({
    pendingUnlocks: [],
    currentUnlock: null,
    acknowledgeUnlock: mockAcknowledgeUnlock,
    checkForUnlocks: mockCheckForUnlocks,
    isChecking: false,
  })),
}));

vi.mock('@/components/achievements/UnifiedAchievementModal', () => ({
  __esModule: true,
  UnifiedAchievementModal: () => <div data-testid="achievement-modal">Achievement Modal</div>,
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en', dir: 'ltr' }),
}));

import { PracticeSessionProvider, usePracticeSession } from './PracticeSessionProvider';

function stubFetch(impl: (input: unknown, init?: unknown) => Promise<{ ok: boolean; json: () => Promise<unknown> }>) {
  const fetchMock = vi.fn(impl);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function TestConsumer({ sessionId }: { sessionId: string }) {
  const context = usePracticeSession();
  return (
    <div>
      <span data-testid="session-xp">{context.sessionXpEarned}</span>
      <button
        data-testid="complete-btn"
        onClick={() => context.completePracticeSession({
          type: 'flashcard',
          sessionId,
          cardsReviewed: 10,
          cardsCorrect: 9,
        })}
      >
        Complete
      </button>
    </div>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAwardPracticeXp.mockResolvedValue({
    totalXp: 100,
    breakdown: { flashcardCorrect: 90, accuracyBonus: 10 },
    masteryMessage: 'Great job!',
    leveledUp: false,
    newTitles: [],
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('PracticeSessionProvider — server completion PATCH', () => {
  it('GIVEN a completed session with a sessionId WHEN it finishes THEN exactly one PATCH is sent with sessionId and completed:true', async () => {
    const fetchMock = stubFetch(async () => ({
      ok: true,
      json: async () => ({ session: { id: 'session-1', completed_at: '2026-09-16T00:00:00Z', xp_awarded: 42 } }),
    }));
    const user = userEvent.setup();

    render(
      <PracticeSessionProvider studentId="student-1" lessonId="lesson-1">
        <TestConsumer sessionId="session-1" />
      </PracticeSessionProvider>
    );

    await user.click(screen.getByTestId('complete-btn'));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/education/practice');
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body as string)).toEqual(
      expect.objectContaining({ sessionId: 'session-1', completed: true, cardsReviewed: 10, cardsCorrect: 9 })
    );
  });

  it('GIVEN the server returns xp_awarded WHEN the PATCH resolves THEN the displayed session XP prefers the server value', async () => {
    stubFetch(async () => ({
      ok: true,
      json: async () => ({ session: { id: 'session-2', completed_at: '2026-09-16T00:00:00Z', xp_awarded: 42 } }),
    }));
    const user = userEvent.setup();

    render(
      <PracticeSessionProvider studentId="student-1" lessonId="lesson-1">
        <TestConsumer sessionId="session-2" />
      </PracticeSessionProvider>
    );

    await user.click(screen.getByTestId('complete-btn'));

    await waitFor(() => expect(screen.getByTestId('session-xp')).toHaveTextContent('42'));
  });

  it('GIVEN the same session completes twice WHEN completePracticeSession runs both times THEN only one PATCH is sent', async () => {
    const fetchMock = stubFetch(async () => ({
      ok: true,
      json: async () => ({ session: { id: 'session-3', completed_at: '2026-09-16T00:00:00Z', xp_awarded: 10 } }),
    }));
    const user = userEvent.setup();

    render(
      <PracticeSessionProvider studentId="student-1" lessonId="lesson-1">
        <TestConsumer sessionId="session-3" />
      </PracticeSessionProvider>
    );

    await user.click(screen.getByTestId('complete-btn'));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    await user.click(screen.getByTestId('complete-btn'));
    // Give a duplicate send a chance to happen before asserting it didn't.
    await waitFor(() => expect(screen.getByTestId('session-xp')).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('GIVEN the PATCH fails WHEN a session completes THEN the failure is logged and nothing throws', async () => {
    stubFetch(async () => ({ ok: false, json: async () => ({ error: 'Session not found or not authorized' }) }));
    const user = userEvent.setup();

    render(
      <PracticeSessionProvider studentId="student-1" lessonId="lesson-1">
        <TestConsumer sessionId="session-4" />
      </PracticeSessionProvider>
    );

    await user.click(screen.getByTestId('complete-btn'));

    await waitFor(() => expect(mockLoggerError).toHaveBeenCalled());
    // Client-side XP display still updates — a persistence failure doesn't
    // break the results UI.
    expect(screen.getByTestId('session-xp')).toHaveTextContent('100');
  });

  it('GIVEN the PATCH throws (network error) WHEN a session completes THEN the failure is logged and nothing throws', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('network down'));
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();

    render(
      <PracticeSessionProvider studentId="student-1" lessonId="lesson-1">
        <TestConsumer sessionId="session-5" />
      </PracticeSessionProvider>
    );

    await user.click(screen.getByTestId('complete-btn'));

    await waitFor(() => expect(mockLoggerError).toHaveBeenCalled());
    expect(screen.getByTestId('session-xp')).toHaveTextContent('100');
  });

  it('GIVEN no sessionId on the completion payload WHEN it finishes THEN no PATCH is sent (guest / non-persistable rounds)', async () => {
    const fetchMock = stubFetch(async () => ({ ok: true, json: async () => ({ session: {} }) }));
    const user = userEvent.setup();

    function NoSessionConsumer() {
      const context = usePracticeSession();
      return (
        <button
          data-testid="complete-no-session"
          onClick={() => context.completePracticeSession({ type: 'flashcard', cardsReviewed: 5, cardsCorrect: 5 })}
        >
          Complete
        </button>
      );
    }

    render(
      <PracticeSessionProvider studentId="student-1" lessonId="lesson-1">
        <NoSessionConsumer />
      </PracticeSessionProvider>
    );

    await user.click(screen.getByTestId('complete-no-session'));

    await waitFor(() => expect(mockAwardPracticeXp).toHaveBeenCalled());
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('PracticeSessionProvider — a round the server records only as an ATTEMPT', () => {
  it('GIVEN the server leaves completed_at NULL (Word Craft below the bar) WHEN it resolves THEN XP shows 0 and the SAME session may complete on a replay', async () => {
    let call = 0;
    const fetchMock = stubFetch(async () => ({
      ok: true,
      json: async () => (++call === 1
        ? { session: { id: 'session-9', completed_at: null, xp_awarded: null } }
        : { session: { id: 'session-9', completed_at: '2026-09-19T00:00:00Z', xp_awarded: 60 } }),
    }));
    const user = userEvent.setup();

    render(
      <PracticeSessionProvider studentId="student-1" lessonId="lesson-1">
        <TestConsumer sessionId="session-9" />
      </PracticeSessionProvider>
    );

    await user.click(screen.getByTestId('complete-btn'));
    await waitFor(() => expect(screen.getByTestId('session-xp')).toHaveTextContent('0'));

    await user.click(screen.getByTestId('complete-btn'));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByTestId('session-xp')).toHaveTextContent('60'));
  });
});
