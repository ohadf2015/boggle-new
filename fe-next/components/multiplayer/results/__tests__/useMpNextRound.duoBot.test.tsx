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

const startPayload = (socket: ReturnType<typeof fakeSocket>) =>
  socket.emit.mock.calls.find((c) => c[0] === 'startGame')?.[1] as Record<string, unknown>;

describe('useMpNextRound — exp-mp-duo-bot-v1 rides the results "next round" start too', () => {
  it('given the host is in the bot arm, when the next round starts, then startGame asks for a duo bot', async () => {
    const socket = fakeSocket();
    const { result } = renderHook(() =>
      useMpNextRound({ socket: socket as never, isHost: true, gameCode: 'ABC123', roomLanguage: 'en', selectedGameMode: 'random', duoBot: true }),
    );
    await act(() => result.current.handleStartGame());
    expect(startPayload(socket)).toMatchObject({ duoBot: true });
  });

  it('given control (or no flag), when the next round starts, then startGame carries no duoBot', async () => {
    const socket = fakeSocket();
    const { result } = renderHook(() =>
      useMpNextRound({ socket: socket as never, isHost: true, gameCode: 'ABC123', roomLanguage: 'en', selectedGameMode: 'random' }),
    );
    await act(() => result.current.handleStartGame());
    expect(startPayload(socket)).not.toHaveProperty('duoBot');
  });
});
