import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const fx = vi.hoisted(() => ({ post: vi.fn(), start: vi.fn(), end: vi.fn(), active: vi.fn(), session: vi.fn(), inGame: vi.fn() }));
vi.mock('@/lib/holidays/holidayClient', () => ({
  holidayQuery: () => ({ holiday: 'christmas', localDate: '2026-12-15', locale: 'en' }),
  holidayPost: (...a: unknown[]) => fx.post(...a),
}));
vi.mock('@/utils/growthTracking', () => ({ trackGameStart: fx.start, trackGameEnd: fx.end }));
vi.mock('@/utils/onboardingStorage', () => ({ hasSupabaseSession: () => fx.session() }));
vi.mock('@/contexts/NavigationContext', () => ({ useHideNavigation: () => fx.inGame }));
vi.mock('@/contexts/SoundEffectsContext', () => ({ useSoundEffects: () => ({ setGameActive: fx.active }) }));

import { useArcadeRound } from '../useArcadeRound';

const round = { roundId: 'r1', lang: 'en', seconds: 60, content: { seed: 5 } };

beforeEach(() => {
  Object.values(fx).forEach((f) => f.mockReset());
  fx.session.mockReturnValue(true);
  fx.post.mockImplementation(async (path: string) => (path === 'arcade/round' ? round : { score: 120, coins: 4 }));
});

describe('useArcadeRound', () => {
  it('Given a game opens, then play starts at once with a seed while the round is registered in the background', () => {
    let resolve: (v: unknown) => void = () => {};
    fx.post.mockImplementation(() => new Promise((r) => (resolve = r)));
    const { result } = renderHook(() => useArcadeRound('dash'));
    expect(result.current.state.phase).toBe('playing');
    expect(result.current.state.phase === 'playing' && Number.isInteger(result.current.state.seed)).toBe(true);
    expect(fx.post).toHaveBeenCalledWith('arcade/round', expect.anything(), { game: 'dash' });
    resolve(round);
  });

  it('Given a round finishes, then it counts as a finished game and the server settles the coins', async () => {
    const { result } = renderHook(() => useArcadeRound('dash'));
    await waitFor(() => expect(fx.start).toHaveBeenCalled());
    expect(fx.start).toHaveBeenCalledWith('holiday-arcade-dash', expect.objectContaining({ holiday: 'christmas' }));
    expect(fx.active).toHaveBeenCalledWith(true);
    act(() => result.current.finish({ score: 150 }));
    expect(fx.end).toHaveBeenCalledWith('holiday-arcade-dash', 150, 1, true, expect.any(Number), expect.any(Object));
    expect(fx.active).toHaveBeenLastCalledWith(false);
    await waitFor(() => expect(result.current.state.phase === 'over' && result.current.state.settle).toEqual({ state: 'done', score: 120, coins: 4 }));
    expect(fx.post).toHaveBeenCalledWith('arcade/score', expect.anything(), { roundId: 'r1', score: 150 });
  });

  it('Given the player finishes before the round registered, then the score waits for the round id and still settles', async () => {
    let resolve: (v: unknown) => void = () => {};
    fx.post.mockImplementation((path: string) => (path === 'arcade/round' ? new Promise((r) => (resolve = r)) : Promise.resolve({ score: 80, coins: 3 })));
    const { result } = renderHook(() => useArcadeRound('splat'));
    act(() => result.current.finish({ score: 80 }));
    expect(result.current.state.phase === 'over' && result.current.state.settle).toEqual({ state: 'saving' });
    await act(async () => resolve(round));
    await waitFor(() => expect(result.current.state.phase === 'over' && result.current.state.settle).toEqual({ state: 'done', score: 80, coins: 3 }));
  });

  it('Given a guest round, then the game still counts but no score is sent', async () => {
    fx.post.mockResolvedValue({ ...round, roundId: null });
    fx.session.mockReturnValue(false);
    const { result } = renderHook(() => useArcadeRound('presents'));
    act(() => result.current.finish({ score: 40 }));
    await waitFor(() => expect(result.current.state.phase === 'over' && result.current.state.settle).toEqual({ state: 'guest' }));
    expect(fx.end).toHaveBeenCalled();
    expect(fx.post).toHaveBeenCalledTimes(1);
  });

  it('Given the round cannot be registered for a signed-in player, then the score shows a save error instead of hanging', async () => {
    fx.post.mockRejectedValue(new Error('500'));
    const { result } = renderHook(() => useArcadeRound('latke'));
    act(() => result.current.finish({ score: 10 }));
    await waitFor(() => expect(result.current.state.phase === 'over' && result.current.state.settle).toEqual({ state: 'error' }));
  });

  it('Given finish fires twice, then the game end is reported once', () => {
    const { result } = renderHook(() => useArcadeRound('catch'));
    act(() => {
      result.current.finish({ score: 10 });
      result.current.finish({ score: 10 });
    });
    expect(fx.end).toHaveBeenCalledTimes(1);
  });

  it('Given play again, then a new seed starts instantly and a new round is registered', async () => {
    const { result } = renderHook(() => useArcadeRound('spin'));
    act(() => result.current.finish({ score: 10 }));
    const before = fx.post.mock.calls.filter((c) => c[0] === 'arcade/round').length;
    act(() => result.current.start());
    expect(result.current.state.phase).toBe('playing');
    expect(fx.post.mock.calls.filter((c) => c[0] === 'arcade/round').length).toBe(before + 1);
  });

  it('Given a round is running, then the page is marked in-game, and cleared at game over and on leave', () => {
    const { result, unmount } = renderHook(() => useArcadeRound('splat'));
    expect(fx.inGame).toHaveBeenLastCalledWith(true);
    act(() => result.current.finish({ score: 10 }));
    expect(fx.inGame).toHaveBeenLastCalledWith(false);
    unmount();
    expect(fx.inGame).toHaveBeenLastCalledWith(false);
  });
});
