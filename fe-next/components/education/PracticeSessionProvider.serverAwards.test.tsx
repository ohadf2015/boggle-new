import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const { mockAwardPracticeXp, mockApplyServerStreak } = vi.hoisted(() => ({ mockAwardPracticeXp: vi.fn(), mockApplyServerStreak: vi.fn() }));

vi.mock('@/utils/logger', () => ({
  __esModule: true,
  default: { log: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));
vi.mock('@/lib/avatar/revealTrigger', () => ({ publishLevelUp: vi.fn() }));
vi.mock('@/lib/education/telemetry', () => ({ trackEduPracticeComplete: vi.fn(), trackEduError: vi.fn() }));
vi.mock('@/hooks/useEducationXp', () => ({
  __esModule: true,
  default: vi.fn(() => ({
    totalXp: 0,
    currentLevel: 1,
    xpProgress: { currentLevel: 1, progressPercent: 0, xpInCurrentLevel: 0, xpNeededForNextLevel: 100, isMaxLevel: false },
    streak: { currentStreak: 0, longestStreak: 0 },
    awardPracticeXp: mockAwardPracticeXp,
    applyServerStreak: mockApplyServerStreak,
    reconcileAwardedXp: vi.fn(() => 1),
    isLoading: false,
  })),
}));
vi.mock('@/components/achievements/UnifiedAchievementModal', () => ({
  __esModule: true,
  UnifiedAchievementModal: ({ unlock, onClose }: { unlock: { achievementKey: string; tier: string }; onClose: () => void }) => (
    <button data-testid="award-modal" onClick={onClose}>{`${unlock.achievementKey}:${unlock.tier}`}</button>
  ),
}));

import { PracticeSessionProvider, usePracticeSession } from './PracticeSessionProvider';

const FIRST = { achievementKey: 'first_lesson', tier: 'bronze', icon: '📚', isNew: true, isUpgrade: false };
const store: Record<string, string> = {};

function Finish({ sessionId }: { sessionId: string }) {
  const { completePracticeSession } = usePracticeSession();
  return (
    <button data-testid={`finish-${sessionId}`} onClick={() => completePracticeSession({ type: 'flashcard', sessionId, cardsReviewed: 5, cardsCorrect: 5 })}>
      finish
    </button>
  );
}

function respondWith(newAwards: unknown, practiceStreak: unknown = null) {
  const fetchMock = vi.fn(async (_url: unknown, init?: RequestInit) => ({
    ok: true,
    json: async () => ({
      session: { id: JSON.parse(String(init?.body)).sessionId, completed_at: '2026-11-21T00:00:00Z', xp_awarded: 50 },
      newAwards,
      practiceStreak,
    }),
  }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

beforeEach(() => {
  vi.clearAllMocks();
  for (const k of Object.keys(store)) delete store[k];
  (localStorage.getItem as ReturnType<typeof vi.fn>).mockImplementation((key: string) => store[key] ?? null);
  (localStorage.setItem as ReturnType<typeof vi.fn>).mockImplementation((key: string, val: string) => { store[key] = val; });
  mockAwardPracticeXp.mockResolvedValue({ totalXp: 50, breakdown: {}, masteryMessage: null, leveledUp: false, newLevel: 1 });
});

afterEach(() => vi.unstubAllGlobals());

const renderProvider = () =>
  render(
    <PracticeSessionProvider studentId="S1" lessonId="L1">
      <Finish sessionId="s-1" />
      <Finish sessionId="s-2" />
    </PracticeSessionProvider>
  );

describe('PracticeSessionProvider server-granted awards', () => {
  it('GIVEN the server grants first_lesson on the first practice WHEN it returns THEN the celebration shows, and the same award never shows again', async () => {
    respondWith([FIRST]);
    const user = userEvent.setup();
    renderProvider();

    await user.click(screen.getByTestId('finish-s-1'));
    expect(await screen.findByTestId('award-modal')).toHaveTextContent('first_lesson:bronze');

    await user.click(screen.getByTestId('award-modal'));
    await waitFor(() => expect(screen.queryByTestId('award-modal')).toBeNull());

    await user.click(screen.getByTestId('finish-s-2'));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    expect(screen.queryByTestId('award-modal')).toBeNull();
  });

  it('GIVEN the server could not grant awards WHEN it returns null THEN nothing is celebrated from local counters', async () => {
    respondWith(null);
    const user = userEvent.setup();
    renderProvider();

    await user.click(screen.getByTestId('finish-s-1'));
    await user.click(screen.getByTestId('finish-s-2'));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    expect(screen.queryByTestId('award-modal')).toBeNull();
  });

  it('GIVEN the server returns the lesson streak WHEN the practice completes THEN the provider shows that number', async () => {
    respondWith([], { current: 3, longest: 5 });
    const user = userEvent.setup();
    renderProvider();

    await user.click(screen.getByTestId('finish-s-1'));
    await waitFor(() => expect(mockApplyServerStreak).toHaveBeenCalledWith({ current: 3, longest: 5 }));
  });
});
