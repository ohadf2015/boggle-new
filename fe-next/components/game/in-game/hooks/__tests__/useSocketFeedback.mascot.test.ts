import { vi, describe, beforeEach, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';

vi.mock('@/utils/haptics', () => ({
  hapticError: vi.fn(),
  hapticWordAccepted: vi.fn(),
  hapticForWordScore: vi.fn(),
}));

import { useSocketFeedback } from '../useSocketFeedback';
import { subscribeMascotEvents, _resetMascotBus } from '@/lib/blast/mascotBus';

function socketStub() {
  const handlers: Record<string, (data: unknown) => void> = {};
  return {
    handlers,
    on: vi.fn((e: string, h: (data: unknown) => void) => { handlers[e] = h; }),
    off: vi.fn(),
    emit: vi.fn(),
  };
}

describe('useSocketFeedback — mascot', () => {
  beforeEach(() => _resetMascotBus());

  it('tells the mascot the length of a word the server accepted', () => {
    const socket = socketStub();
    const events: unknown[] = [];
    subscribeMascotEvents((e) => events.push(e));
    renderHook(() => useSocketFeedback({
      socket: socket as never,
      isPlaying: true,
      t: (k: string) => k,
      setCurrentFeedback: vi.fn(),
      setLastWordFoundTime: vi.fn(),
      playWordAcceptedSound: vi.fn(),
      playWordRejectedSound: vi.fn(),
    }));

    socket.handlers.wordAccepted({ word: 'PLANET', score: 6 });

    expect(events).toEqual([{ kind: 'word-submitted', wordLength: 6, gemLetterUsed: false }]);
  });
});
