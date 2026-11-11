import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, language: 'en' }) }));

import { useClassroomGameJoin } from '../useClassroomGameJoin';
import { AUTO_JOIN_HANDLED_KEY, resetAutoJoinMemoryForTest } from '../useClassroomAutoJoin';

function fakeSocket() {
  const handlers: Record<string, (d: unknown) => void> = {};
  return {
    on: vi.fn((e: string, cb: (d: unknown) => void) => { handlers[e] = cb; }),
    off: vi.fn(),
    emit: vi.fn(),
    fire: (e: string, d: unknown) => handlers[e]?.(d),
  };
}

const game = { gameCode: 'LIVE01', teacherName: 'T', lessonNames: [] };
const handled = () => JSON.parse(sessionStorage.getItem(AUTO_JOIN_HANDLED_KEY) ?? '[]');

describe('useClassroomGameJoin — acknowledged joins are remembered for auto-join', () => {
  beforeEach(() => { sessionStorage.clear(); resetAutoJoinMemoryForTest(); });

  it('Given the server acks the join, Then the game is marked handled', () => {
    const socket = fakeSocket();
    const { result } = renderHook(() => useClassroomGameJoin({ activeGame: game, socket: socket as never, userId: 'u1', username: 'Noa' }));
    act(() => result.current.join());
    act(() => socket.fire('joinedClassroomGame', { gameCode: 'LIVE01' }));
    expect(handled()).toContain('LIVE01');
  });

  it('Given the server refuses the join, Then the game is not marked handled and the error stays', () => {
    const socket = fakeSocket();
    const { result } = renderHook(() => useClassroomGameJoin({ activeGame: game, socket: socket as never, userId: 'u1', username: 'Noa' }));
    act(() => result.current.join());
    act(() => socket.fire('classroomGameError', { gameCode: 'LIVE01', code: 'ROOM_LOCKED' }));
    expect(handled()).not.toContain('LIVE01');
    expect(result.current.joinError).toBeTruthy();
  });
});
