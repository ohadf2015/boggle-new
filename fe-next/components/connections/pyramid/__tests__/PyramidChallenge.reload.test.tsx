/** A daily pyramid run survives a reload mid-run, so reloading never resets a scored run. */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PyramidChallenge from '../PyramidChallenge';

const submitDailyScore = vi.hoisted(() => vi.fn());
vi.mock('@/lib/connections/dailyClient', async (orig) => ({
  ...((await orig()) as object),
  submitDailyScore: (...a: unknown[]) => submitDailyScore(...a),
}));
vi.mock('@/hooks/useDailyPlayedStatus', () => ({
  useDailyPlayedStatus: () => ({ today: { wordHunt: false, wordWheel: false, wordTower: false, connections: true }, streak: { current: 2, longest: 2 } }),
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string) => k }),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, profile: null, isAdmin: false }),
}));
vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => true }));
vi.mock('@/hooks/useHapticFeedback', () => ({
  useHapticFeedback: () => ({ haptic: vi.fn(), customHaptic: vi.fn() }),
  GAME_HAPTICS: { validWord: 10, invalidWord: [1], comboLevelUp: [1] },
}));
vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({ playMatchFoundSound: vi.fn(), playErrorSound: vi.fn(), playVictorySound: vi.fn() }),
}));
const confetti = vi.hoisted(() => ({ fireVictoryConfetti: vi.fn(), fireConfetti: vi.fn() }));
vi.mock('@/utils/confettiUtils', () => confetti);
vi.mock('@/hooks/useRewardedFeatureUnlock', () => ({
  useRewardedFeatureUnlock: () => ({ canShowAd: false, status: 'idle', offer: vi.fn() }),
}));
vi.mock('@/components/ads/ResultsBannerSlot', () => ({ default: () => null }));
const nextQuest = vi.fn();
vi.mock('@/components/daily/results/NextQuestCta', () => ({
  NextQuestCta: (props: Record<string, unknown>) => {
    nextQuest(props);
    return <div data-testid="next-quest-cta" />;
  },
}));

const makePyramid = (id: string, meta: string) => ({
  id,
  metaAnswer: meta,
  metaHint: 'hint',
  base: [
    { id: `${id}-1`, word1: 'ROLLING', word2: 'TABLET', bridge: 'STONE', difficulty: 'easy' },
    { id: `${id}-2`, word1: 'RIVER', word2: 'FRUIT', bridge: 'STONE', difficulty: 'medium' },
    { id: `${id}-3`, word1: 'PRECIOUS', word2: 'COLD', bridge: 'STONE', difficulty: 'hard' },
  ],
  difficulty: 'medium',
});
const TODAY = makePyramid('today-pyr', 'STONE');
const OTHER = makePyramid('other-pyr', 'OTHER');

// Mirrors the real selector: a solved filter that excludes today's pick would
// hand back a different pyramid.
vi.mock('@/lib/connections/pyramid/daily', () => ({
  dailyPyramid: (_d: string, _l: string, solved?: ReadonlySet<string>) =>
    solved?.has('today-pyr') ? OTHER : TODAY,
}));
vi.mock('@/lib/connections/pyramid/puzzles', () => ({
  getPyramidsForLocale: () => [TODAY, OTHER],
}));

function typeWord(word: string) {
  for (const ch of word) fireEvent.keyDown(window, { key: ch.toLowerCase() });
}
function solveBaseStage() {
  typeWord('STONE');
  fireEvent.keyDown(window, { key: 'Enter' });
  fireEvent.click(screen.getByText('connections.next'));
}
function winPyramid() {
  solveBaseStage();
  solveBaseStage();
  solveBaseStage();
  typeWord('STONE');
  fireEvent.keyDown(window, { key: 'Enter' });
}
const SHARE = 'en/connections/daily';
const DAY = '2026-09-07';
const RUN_KEY = `connections-daily-pyramid-run-${DAY}`;

describe('PyramidChallenge daily host — mid-run reload', () => {
  beforeEach(() => {
    window.localStorage.clear();
    submitDailyScore.mockReset();
    submitDailyScore.mockResolvedValue({ status: 'saved', result: { success: true, streak: 3, score: 1150, currentRank: 1, totalPlayers: 1 } });
    window.matchMedia = vi.fn().mockImplementation((q: string) => ({
      matches: q.includes('reduce'), media: q, addEventListener: vi.fn(), removeEventListener: vi.fn(),
    })) as unknown as typeof window.matchMedia;
  });

  it('given an untouched run, then nothing is saved', () => {
    render(<PyramidChallenge sharePath={SHARE} today={DAY} />);
    expect(window.localStorage.getItem(RUN_KEY)).toBeNull();
  });

  it('given a solved first riddle, when the page reloads, then the run resumes on the second riddle', () => {
    const first = render(<PyramidChallenge sharePath={SHARE} today={DAY} />);
    solveBaseStage();
    expect(screen.getByText('RIVER')).toBeTruthy();
    first.unmount();

    render(<PyramidChallenge sharePath={SHARE} today={DAY} />);
    expect(screen.getByText('RIVER')).toBeTruthy();
    expect(screen.queryByText('ROLLING')).toBeNull();
  });

  it('given a wrong guess, when the page reloads, then the lost life stays lost', () => {
    const first = render(<PyramidChallenge sharePath={SHARE} today={DAY} />);
    typeWord('WRONG');
    fireEvent.keyDown(window, { key: 'Enter' });
    const before = JSON.parse(window.localStorage.getItem(RUN_KEY) ?? 'null');
    expect(before?.state.wrongAttempts).toBe(1);
    first.unmount();

    render(<PyramidChallenge sharePath={SHARE} today={DAY} />);
    typeWord('STONE');
    fireEvent.keyDown(window, { key: 'Enter' });
    const after = JSON.parse(window.localStorage.getItem(RUN_KEY) ?? 'null');
    expect(after.state.lives).toBe(before.state.lives);
  });

  it('given a resumed run is finished, then the score is submitted once and the run is cleared', async () => {
    const first = render(<PyramidChallenge sharePath={SHARE} today={DAY} />);
    solveBaseStage();
    first.unmount();

    render(<PyramidChallenge sharePath={SHARE} today={DAY} />);
    solveBaseStage();
    solveBaseStage();
    typeWord('STONE');
    fireEvent.keyDown(window, { key: 'Enter' });
    await waitFor(() => expect(submitDailyScore).toHaveBeenCalledTimes(1));
    expect(submitDailyScore.mock.calls[0][0]).toMatchObject({ puzzlesSolved: 4 });
    expect(window.localStorage.getItem(RUN_KEY)).toBeNull();
  });

  it('given a reload right after solving a riddle, then that riddle still counts as solved', async () => {
    const first = render(<PyramidChallenge sharePath={SHARE} today={DAY} />);
    typeWord('STONE');
    fireEvent.keyDown(window, { key: 'Enter' });
    first.unmount();

    render(<PyramidChallenge sharePath={SHARE} today={DAY} />);
    fireEvent.click(screen.getByText('connections.next'));
    solveBaseStage();
    solveBaseStage();
    typeWord('STONE');
    fireEvent.keyDown(window, { key: 'Enter' });
    await waitFor(() => expect(submitDailyScore).toHaveBeenCalledTimes(1));
    expect(submitDailyScore.mock.calls[0][0]).toMatchObject({ puzzlesSolved: 4 });
  });

  it('given the standalone pyramid, then no daily run is saved', () => {
    render(<PyramidChallenge />);
    solveBaseStage();
    expect(window.localStorage.getItem(RUN_KEY)).toBeNull();
  });
});
