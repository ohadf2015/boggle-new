import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('@/hooks/useInterstitialAd', () => ({ useInterstitialAd: () => ({ showInterstitial: vi.fn().mockResolvedValue(undefined) }) }));
vi.mock('@/lib/boardSelection', () => ({ pickRichestBoardClient: () => [['a']] }));

import { useMpNextRound } from '../useMpNextRound';

function fakeSocket() {
  return {
    emit: vi.fn((event: string, _payload: unknown, ack?: (r: { success: boolean }) => void) => {
      if (event === 'resetGame') ack?.({ success: true });
    }),
  };
}

describe('useMpNextRound — a classroom card restarts the mode that just ran', () => {
  it('given a pinned mode, when the round starts, then startGame carries it instead of the host pick', async () => {
    const socket = fakeSocket();
    const { result } = renderHook(() =>
      useMpNextRound({ socket: socket as never, isHost: true, gameCode: 'ABC123', roomLanguage: 'en', selectedGameMode: 'random' }),
    );
    await act(() => result.current.handleStartGame({ gameMode: 'blast' }));
    expect(socket.emit).toHaveBeenCalledWith('startGame', expect.objectContaining({ gameMode: 'blast' }));
  });

  it('given no pin (or a click event), when the round starts, then the host pick is used', async () => {
    const socket = fakeSocket();
    const { result } = renderHook(() =>
      useMpNextRound({ socket: socket as never, isHost: true, gameCode: 'ABC123', roomLanguage: 'en', selectedGameMode: 'random' }),
    );
    await act(() => result.current.handleStartGame({ type: 'click' } as never));
    expect(socket.emit).toHaveBeenCalledWith('startGame', expect.objectContaining({ gameMode: 'random' }));
  });
});
