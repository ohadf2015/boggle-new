/**
 * PyramidChallenge hosted as the Word Bridge daily (/connections/daily on a
 * pyramid day).
 *
 *  1. Its results card linked "play the daily" to /connections/daily — the page
 *     it was already on, so the only onward step looped back into the quest.
 *     As the daily it must hand off to the next quest like every other daily.
 *  2. Re-opening the daily after finishing started a pyramid again — and a won
 *     pyramid is marked solved, so it was a DIFFERENT pyramid. The finished run
 *     must come back instead.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PyramidChallenge from '../PyramidChallenge';
import { loadDailySnapshot, saveDailySnapshot } from '@/lib/connections/dailySnapshot';

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
vi.mock('@/utils/confettiUtils', () => ({ fireVictoryConfetti: vi.fn() }));
vi.mock('@/hooks/useRewardedFeatureUnlock', () => ({
  useRewardedFeatureUnlock: () => ({ canShowAd: false, status: 'idle', offer: vi.fn() }),
}));
vi.mock('@/components/ads/ResultsBannerSlot', () => ({ default: () => null }));
vi.mock('@/components/daily/results/NextQuestCta', () => ({
  NextQuestCta: ({ justFinished }: { justFinished: string }) => (
    <div data-testid="next-quest-cta" data-just-finished={justFinished} />
  ),
}));

const mockPyramid = {
  id: 'revisit-pyramid',
  metaAnswer: 'STONE',
  metaHint: 'Hard and rigid',
  base: [
    { id: 'p1', word1: 'ROLLING', word2: 'TABLET', bridge: 'STONE', difficulty: 'easy' },
    { id: 'p2', word1: 'RIVER', word2: 'FRUIT', bridge: 'STONE', difficulty: 'medium' },
    { id: 'p3', word1: 'PRECIOUS', word2: 'COLD', bridge: 'STONE', difficulty: 'hard' },
  ],
  difficulty: 'medium',
};

vi.mock('@/lib/connections/pyramid/daily', () => ({ dailyPyramid: () => mockPyramid }));
vi.mock('@/lib/connections/pyramid/puzzles', () => ({ getPyramidsForLocale: () => [mockPyramid] }));
vi.mock('@/lib/connections/dailyClient', async (orig) => ({
  ...((await orig()) as object),
  todayUTC: () => '2026-10-15',
}));

const OK = { reached: true, solved: true, wrongAttempts: 0, hintUsed: false };

function typeWord(word: string) {
  for (const ch of word) fireEvent.keyDown(window, { key: ch.toLowerCase() });
}

function winPyramid() {
  for (let i = 0; i < 3; i++) {
    typeWord('STONE');
    fireEvent.keyDown(window, { key: 'Enter' });
    fireEvent.click(screen.getByText('connections.next'));
  }
  typeWord('STONE');
  fireEvent.keyDown(window, { key: 'Enter' });
}

describe('PyramidChallenge as the daily quest', () => {
  beforeEach(() => window.localStorage.clear());

  it('given the daily host, a finished pyramid hands off to the next quest instead of looping to itself', () => {
    // Given the pyramid hosted as today's daily
    render(<PyramidChallenge daily sharePath="en/connections/daily" />);
    // When it is won
    winPyramid();
    // Then the next-quest CTA is offered, and no link back into this same page
    expect(screen.getByTestId('next-quest-cta').getAttribute('data-just-finished')).toBe('connections');
    expect(screen.queryByTestId('pyramid-back-to-daily')).toBeNull();
  });

  it('given the standalone pyramid, the finished card still points to the daily quest', () => {
    render(<PyramidChallenge />);
    winPyramid();
    expect(screen.getByTestId('pyramid-back-to-daily').getAttribute('href')).toBe('/en/connections/daily');
    expect(screen.queryByTestId('next-quest-cta')).toBeNull();
  });

  it('given the daily host, the finished run is kept for today', () => {
    render(<PyramidChallenge daily sharePath="en/connections/daily" />);
    winPyramid();
    expect(loadDailySnapshot('2026-10-15')).toMatchObject({
      kind: 'pyramid',
      pyramidId: 'revisit-pyramid',
      won: true,
      language: 'en',
      gaveUpBase: [false, false, false],
      // The day streak the card showed, so the revisit chip matches it.
      streak: 1,
    });
  });

  it('given a pyramid already finished today, re-opening the daily shows that result, not a new run', () => {
    // Given today's finished pyramid on this device
    saveDailySnapshot({
      kind: 'pyramid',
      dateISO: '2026-10-15',
      language: 'en',
      pyramidId: 'revisit-pyramid',
      won: false,
      score: 120,
      gaveUpBase: [false, true, false],
      outcomes: [OK, { ...OK, solved: false }, OK, { ...OK, solved: false }],
      streak: 4,
    });
    // When the daily opens again
    render(<PyramidChallenge daily sharePath="en/connections/daily" />);
    // Then the stored result is shown, flagged as already played, with the next step
    expect(screen.getByTestId('daily-already-played')).toBeTruthy();
    expect(screen.getByText('connections.pyramid.lost')).toBeTruthy();
    expect(screen.getByText('120')).toBeTruthy();
    expect(screen.getByTestId('pyramid-streak-chip').textContent).toContain('4');
    expect(screen.getByTestId('next-quest-cta')).toBeTruthy();
    // …and no playable riddle
    expect(screen.queryByTestId('pyramid-root')).toBeNull();
  });

  it('given the standalone pyramid route, a daily snapshot does not lock practice play', () => {
    saveDailySnapshot({
      kind: 'pyramid',
      dateISO: '2026-10-15',
      language: 'en',
      pyramidId: 'revisit-pyramid',
      won: true,
      score: 300,
      gaveUpBase: [false, false, false],
      outcomes: [OK, OK, OK, OK],
      streak: 1,
    });
    render(<PyramidChallenge />);
    expect(screen.getByTestId('pyramid-root')).toBeTruthy();
  });
});
