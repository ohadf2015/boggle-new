/**
 * The meta-game beat on a result screen: the ledger strip, the rank ribbon and
 * the achievement toasts. The rule under test is restraint — a node that moved
 * nothing shows nothing, never a row of zeros.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguageSafe: () => ({ t: (k: string) => k, language: 'en' }),
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));
vi.mock('@/contexts/SoundEffectsContext', () => ({ useSoundEffects: () => ({ playXpGainSound: vi.fn() }) }));

const showAchievementToast = vi.fn();
vi.mock('@/components/achievements/AchievementToast', () => ({ showAchievementToast }));
const toastDismiss = vi.fn();
vi.mock('react-hot-toast', () => ({ default: { dismiss: (...a: unknown[]) => toastDismiss(...a), custom: vi.fn() } }));

import EcosystemRewards from '../EcosystemRewards';
import type { RunResult } from '../../runTypes';

const result = (over: Partial<RunResult> = {}): RunResult => ({
  score: 200, stars: 2, bestStars: 2, won: true, rewards: [], validWords: ['easers'], totalStars: 4,
  xpGained: 0, coinsGained: 0, leaderboardPoints: 0, achievementsUnlocked: [],
  ...over,
});

describe('EcosystemRewards', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    showAchievementToast.mockClear();
    showAchievementToast.mockImplementation((p: { achievement: { id: string } }) => `toast-${p.achievement.id}`);
    toastDismiss.mockClear();
  });
  afterEach(() => { vi.useRealTimers(); });

  it('Given a node that moved nothing, then nothing is rendered at all', () => {
    render(<EcosystemRewards result={result()} />);
    expect(screen.queryByTestId('eco-rewards')).toBeNull();
    expect(screen.queryByTestId('eco-strip')).toBeNull();
  });

  it('Given xp and season points, then the ledger names each one', () => {
    render(<EcosystemRewards result={result({ xpGained: 40, leaderboardPoints: 200 })} />);
    const strip = screen.getByTestId('eco-strip');
    expect(strip).toHaveTextContent('adventurePlay.eco.xp');
    expect(strip).toHaveTextContent('adventurePlay.eco.points');
    // Coins did not move on a plain fight node — no zero chip for them.
    expect(strip).not.toHaveTextContent('adventurePlay.eco.coins');
  });

  it('Given an account level-up, then the rank it reached is stated — not a bare "level up"', () => {
    render(<EcosystemRewards result={result({ xpGained: 90, levelUp: { newLevel: 9, levelsGained: 1, newTitles: [] } })} />);
    expect(screen.getByTestId('eco-rank-ribbon')).toHaveTextContent('adventurePlay.eco.rank');
  });

  it('Given a mid-run level-up, then no fullscreen modal opens over the chest the player must tap', () => {
    render(<EcosystemRewards result={result({ xpGained: 90, levelUp: { newLevel: 9, levelsGained: 1, newTitles: [] } })} />);
    act(() => { vi.advanceTimersByTime(8000); });
    expect(screen.getByTestId('eco-rank-ribbon')).toBeInTheDocument();
    expect(document.querySelector('[data-testid="level-up-celebration"]')).toBeNull();
  });

  it('Given only an achievement unlock, then it still celebrates — one toast per unlock', async () => {
    render(<EcosystemRewards result={result({ achievementsUnlocked: ['VETERAN', 'CENTURION'] })} />);
    expect(screen.getByTestId('eco-rewards')).toBeInTheDocument();
    // The toast module is loaded lazily — let its import settle before the clock runs.
    await act(async () => { await vi.dynamicImportSettled?.(); });
    act(() => { vi.advanceTimersByTime(5000); });
    expect(showAchievementToast).toHaveBeenCalledTimes(2);
    expect(showAchievementToast.mock.calls[0][0].achievement.nameKey).toBe('achievements.VETERAN.name');
  });

  it('Given no unlocks, then no toast is ever fired', async () => {
    render(<EcosystemRewards result={result({ xpGained: 40 })} />);
    await act(async () => { await vi.dynamicImportSettled?.(); });
    act(() => { vi.advanceTimersByTime(5000); });
    expect(showAchievementToast).not.toHaveBeenCalled();
  });

  it('Given the player continues before the toast chunk lands, then no toast leaks into the next battle', async () => {
    // The timers used to be registered inside the import's .then() — an unmount
    // that raced the import cleaned up nothing, and the toasts fired anyway.
    const { unmount } = render(<EcosystemRewards result={result({ achievementsUnlocked: ['VETERAN'] })} />);
    unmount();
    await act(async () => { await vi.dynamicImportSettled?.(); });
    act(() => { vi.advanceTimersByTime(8000); });
    expect(showAchievementToast).not.toHaveBeenCalled();
  });

  it('Given a toast already showing when the screen closes, then it is dismissed — not carried into the next battle', async () => {
    // The <Toaster> is app-wide, so a toast outlives its screen unless the
    // screen takes it down on the way out.
    const { unmount } = render(<EcosystemRewards result={result({ achievementsUnlocked: ['VETERAN'] })} />);
    await act(async () => { await vi.dynamicImportSettled?.(); });
    act(() => { vi.advanceTimersByTime(5000); });
    expect(showAchievementToast).toHaveBeenCalledTimes(1);
    unmount();
    expect(toastDismiss).toHaveBeenCalledWith('toast-VETERAN');
  });
});
