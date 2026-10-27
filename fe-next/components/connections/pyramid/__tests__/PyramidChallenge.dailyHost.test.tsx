/**
 * Pyramid hosted as the day's Word Bridge daily (/connections/daily):
 *  - the end screen hands off to the next daily quest instead of linking to the
 *    very page the player is on;
 *  - a finished run stays finished on revisit, on the SAME pyramid (winning
 *    marks it solved, and the solved filter used to serve a different one).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PyramidChallenge from '../PyramidChallenge';
import { dailyResultKey } from '@/lib/connections/dailyResultStore';

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

describe('PyramidChallenge as the daily host', () => {
  beforeEach(() => {
    window.localStorage.clear();
    nextQuest.mockClear();
    // The results hero reads reduced motion from matchMedia, not the mocked hook.
    window.matchMedia = vi.fn().mockImplementation((q: string) => ({
      matches: q.includes('reduce'), media: q, addEventListener: vi.fn(), removeEventListener: vi.fn(),
    })) as unknown as typeof window.matchMedia;
  });

  it('given a finished daily pyramid, then the shared daily hero leads the end screen and the game fires no confetti of its own', () => {
    render(<PyramidChallenge sharePath={SHARE} />);
    winPyramid();
    const hero = screen.getByTestId('daily-results-hero');
    expect(hero.getAttribute('data-mode')).toBe('connections');
    expect(hero.getAttribute('data-outcome')).toBe('win');
    expect(screen.queryByTestId('pyramid-streak-chip')).toBeNull();
    expect(confetti.fireVictoryConfetti).not.toHaveBeenCalled();
  });

  it('given a finished daily pyramid, then the end screen offers the next daily quest, not a link back to this page', () => {
    render(<PyramidChallenge sharePath={SHARE} />);
    winPyramid();
    expect(screen.getByTestId('next-quest-cta')).toBeTruthy();
    expect(nextQuest).toHaveBeenCalledWith(
      expect.objectContaining({ justFinished: 'connections', currentLanguage: 'en', source: 'pyramid_daily_results' }),
    );
    expect(screen.queryByTestId('pyramid-back-to-daily')).toBeNull();
  });

  it('given the standalone pyramid route, then the end screen keeps its hub link and no daily hero', () => {
    render(<PyramidChallenge />);
    winPyramid();
    expect(screen.getByTestId('pyramid-back-to-daily')).toBeTruthy();
    expect(screen.queryByTestId('daily-results-hero')).toBeNull();
    expect(screen.queryByTestId('next-quest-cta')).toBeNull();
  });

  it('given a won daily pyramid, when revisited the same day, then the same pyramid opens on its end screen', () => {
    const first = render(<PyramidChallenge sharePath={SHARE} />);
    winPyramid();
    const today = new Date().toISOString().slice(0, 10);
    expect(window.localStorage.getItem(dailyResultKey(today, 'en'))).not.toBeNull();
    first.unmount();

    render(<PyramidChallenge sharePath={SHARE} />);
    expect(screen.getByText('connections.pyramid.won')).toBeTruthy();
    expect(screen.queryByTestId('pyramid-root')).toBeNull();
    // Same day, same pyramid — not the next unsolved one.
    expect(screen.queryByText('OTHER')).toBeNull();
  });

  it('given the run ends, then the host is told it is terminal (also on a restored revisit)', () => {
    const onTerminal = vi.fn();
    const first = render(<PyramidChallenge sharePath={SHARE} onTerminal={onTerminal} />);
    expect(onTerminal).not.toHaveBeenCalled();
    winPyramid();
    expect(onTerminal).toHaveBeenCalled();
    first.unmount();

    const again = vi.fn();
    render(<PyramidChallenge sharePath={SHARE} onTerminal={again} />);
    expect(again).toHaveBeenCalled();
  });
});
