import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const fx = vi.hoisted(() => ({ post: vi.fn(), start: vi.fn(), end: vi.fn(), active: vi.fn(), session: vi.fn() }));
vi.mock('@/lib/holidays/holidayClient', () => ({
  holidayQuery: () => ({ holiday: 'christmas', localDate: '2026-12-15', locale: 'en' }),
  holidayPost: (...a: unknown[]) => fx.post(...a),
}));
vi.mock('@/utils/growthTracking', () => ({ trackGameStart: fx.start, trackGameEnd: fx.end }));
vi.mock('@/utils/onboardingStorage', () => ({ hasSupabaseSession: () => fx.session() }));
vi.mock('@/contexts/SoundEffectsContext', () => ({ useSoundEffects: () => ({ setGameActive: fx.active }) }));

import { useArcadeRound } from '../useArcadeRound';

const round = { roundId: 'r1', lang: 'en', seconds: 75, content: { balls: [] } };

beforeEach(() => {
  Object.values(fx).forEach((f) => f.mockReset());
  fx.session.mockReturnValue(true);
  fx.post.mockImplementation(async (path: string) => (path === 'arcade/round' ? round : { score: 120, coins: 4 }));
});

describe('useArcadeRound', () => {
  it('Given a round starts and finishes, then it counts as a finished game and the server settles the coins', async () => {
    const { result } = renderHook(() => useArcadeRound('snowball'));
    await waitFor(() => expect(result.current.state.phase).toBe('playing'));
    expect(fx.start).toHaveBeenCalledWith('holiday-arcade-snowball', expect.objectContaining({ roundId: 'r1' }));
    expect(fx.active).toHaveBeenCalledWith(true);
    act(() => result.current.finish({ score: 150, plays: [{ w: 'SNOW', i: 0 }] }));
    expect(fx.end).toHaveBeenCalledWith('holiday-arcade-snowball', 150, 1, true, expect.any(Number), expect.objectContaining({ roundId: 'r1' }));
    expect(fx.active).toHaveBeenLastCalledWith(false);
    await waitFor(() => expect(result.current.state.phase === 'over' && result.current.state.settle).toEqual({ state: 'done', score: 120, coins: 4 }));
    expect(fx.post).toHaveBeenCalledWith('arcade/score', expect.anything(), { roundId: 'r1', plays: [{ w: 'SNOW', i: 0 }], score: 150 });
  });

  it('Given a guest round, then the game still counts but no score is sent', async () => {
    fx.post.mockResolvedValue({ ...round, roundId: null });
    fx.session.mockReturnValue(false);
    const { result } = renderHook(() => useArcadeRound('sleigh'));
    await waitFor(() => expect(result.current.state.phase).toBe('playing'));
    act(() => result.current.finish({ score: 40, plays: [] }));
    expect(fx.end).toHaveBeenCalled();
    expect(result.current.state.phase === 'over' && result.current.state.settle).toEqual({ state: 'guest' });
    expect(fx.post).toHaveBeenCalledTimes(1);
  });

  it('Given finish fires twice, then the game end is reported once', async () => {
    const { result } = renderHook(() => useArcadeRound('wrap'));
    await waitFor(() => expect(result.current.state.phase).toBe('playing'));
    act(() => {
      result.current.finish({ score: 10, plays: [] });
      result.current.finish({ score: 10, plays: [] });
    });
    expect(fx.end).toHaveBeenCalledTimes(1);
  });

  it('Given the round cannot start, then an error state with retry shows', async () => {
    fx.post.mockRejectedValue(new Error('500'));
    const { result } = renderHook(() => useArcadeRound('oil'));
    await waitFor(() => expect(result.current.state.phase).toBe('error'));
  });
});
