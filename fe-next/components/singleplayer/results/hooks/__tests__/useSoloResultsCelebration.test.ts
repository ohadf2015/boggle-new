import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSoloResultsCelebration } from '../useSoloResultsCelebration';

const fireConfetti = vi.fn();
vi.mock('@/utils/confettiUtils', async (orig) => ({
  ...(await orig<typeof import('@/utils/confettiUtils')>()),
  fireConfetti: (...a: unknown[]) => fireConfetti(...a),
}));

type Props = Parameters<typeof useSoloResultsCelebration>[0];
const make = (over: Partial<Props['results']> = {}, rest: Partial<Props> = {}): Props => ({
  results: { gameSessionId: 'g', isNewHighScore: false, ...over } as Props['results'],
  mode: 'solo-bots',
  playerRank: 1,
  isWinner: true,
  hasMinimumScore: true,
  ...rest,
});
let n = 0;
const id = () => `sess-${Date.now()}-${n++}`;

beforeEach(() => { fireConfetti.mockClear(); sessionStorage.clear(); });

describe('useSoloResultsCelebration', () => {
  it('fires confetti once per game session even when rank resolves late', () => {
    const gameSessionId = id();
    const { rerender } = renderHook((p: Props) => useSoloResultsCelebration(p), {
      initialProps: make({ gameSessionId }, { playerRank: 0, isWinner: false }),
    });
    expect(fireConfetti).not.toHaveBeenCalled();
    rerender(make({ gameSessionId }, { playerRank: 1 }));
    rerender(make({ gameSessionId }, { playerRank: 2 }));
    rerender(make({ gameSessionId, isNewHighScore: true }, { playerRank: 2 }));
    expect(fireConfetti).toHaveBeenCalledTimes(1);
  });

  it('uses neo palette hex, not off-brand colors', () => {
    renderHook(() => useSoloResultsCelebration(make({ gameSessionId: id() }, { mode: 'solo' as Props['mode'], playerRank: 0 })));
    const colors = fireConfetti.mock.calls[0][0].colors as string[];
    expect(colors).toContain('#BFFF00');
    expect(colors).not.toContain('#4ecdc4');
  });

  it('does not auto-open the share modal for a plain win', () => {
    const { result } = renderHook(() => useSoloResultsCelebration(make({ gameSessionId: id() })));
    expect(result.current.showShareModal).toBe(false);
  });

  it('auto-opens the share modal on a new personal best', () => {
    const { result } = renderHook(() => useSoloResultsCelebration(make({ gameSessionId: id(), isNewHighScore: true })));
    expect(result.current.showShareModal).toBe(true);
  });
});
