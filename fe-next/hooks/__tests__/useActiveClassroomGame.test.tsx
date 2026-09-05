/**
 * useActiveClassroomGame — the student's "is my class playing right now?" feed.
 *
 * Two bugs lived here, and both had the same shape: the hook only ever SET a
 * game and never cleared one.
 *
 *   - An empty `activeClassroomGames` list (teacher ended it, or Redis expired
 *     the key) left the previous game in place, so the student kept a JOIN
 *     button pointing at a dead multiplayer room.
 *   - `classroomGameEnded` — broadcast by the server from every end path — had
 *     no listener at all.
 *
 * The banner that used to own this logic had a third, worse bug: it opened its
 * socket with NO auth token, so `getActiveClassroomGames` rejected it before it
 * was ever subscribed to `classroom:<id>`. That is why the banner now consumes
 * this hook instead of duplicating it. The token is asserted here.
 */
import { renderHook, act, waitFor } from '@testing-library/react';

const socketHandlers: Record<string, (data: unknown) => void> = {};
const managerHandlers: Record<string, (data: unknown) => void> = {};
const mockEmit = vi.fn();
const mockDisconnect = vi.fn();
const mockIo = vi.fn();

const mockSocket = {
  connected: true,
  emit: mockEmit,
  disconnect: mockDisconnect,
  on: vi.fn((event: string, fn: (data: unknown) => void) => { socketHandlers[event] = fn; }),
  io: { on: vi.fn((event: string, fn: (data: unknown) => void) => { managerHandlers[event] = fn; }) },
};

vi.mock('socket.io-client', () => ({
  io: (...args: unknown[]) => { mockIo(...args); return mockSocket; },
}));

vi.mock('@/utils/SocketContext', () => ({ getSocketURL: () => 'http://localhost:3001' }));

const mockGetSession = vi.fn(async () => ({ data: { session: { access_token: 'jwt-abc' } } }));
vi.mock('@/utils/supabase/client', () => ({
  createClient: () => ({ auth: { getSession: mockGetSession } }),
}));

import { useActiveClassroomGame } from '../useActiveClassroomGame';

const GAME = { gameCode: 'ABC123', teacherName: 'Ms Plant', lessonNames: ['Unit 3'] };

describe('useActiveClassroomGame', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const k of Object.keys(socketHandlers)) delete socketHandlers[k];
    for (const k of Object.keys(managerHandlers)) delete managerHandlers[k];
  });

  it('connects with the signed-in student access token', async () => {
    // GIVEN a signed-in student
    renderHook(() => useActiveClassroomGame('class-1'));

    // WHEN the socket is opened
    await waitFor(() => expect(mockIo).toHaveBeenCalled());

    // THEN the handshake carries the token the server reads
    expect(mockIo).toHaveBeenCalledWith(
      'http://localhost:3001',
      expect.objectContaining({ auth: { token: 'jwt-abc' } })
    );
  });

  it('clears the active game when the server reports an empty list', async () => {
    // GIVEN a live game on screen
    const { result } = renderHook(() => useActiveClassroomGame('class-1'));
    await waitFor(() => expect(socketHandlers['activeClassroomGames']).toBeDefined());
    act(() => { socketHandlers['activeClassroomGames']({ games: [GAME] }); });
    expect(result.current.activeGame?.gameCode).toBe('ABC123');

    // WHEN the next poll comes back empty (game ended or the Redis key expired)
    act(() => { socketHandlers['activeClassroomGames']({ games: [] }); });

    // THEN the JOIN affordance goes away instead of pointing at a dead room
    expect(result.current.activeGame).toBeNull();
  });

  it('clears the active game on classroomGameEnded', async () => {
    // GIVEN a live game on screen
    const { result } = renderHook(() => useActiveClassroomGame('class-1'));
    await waitFor(() => expect(socketHandlers['activeClassroomGames']).toBeDefined());
    act(() => { socketHandlers['activeClassroomGames']({ games: [GAME] }); });

    // WHEN the teacher ends the round
    act(() => { socketHandlers['classroomGameEnded']?.({ gameCode: 'ABC123' }); });

    // THEN the banner stops offering to join it
    expect(result.current.activeGame).toBeNull();
  });

  it('ignores classroomGameEnded for a different game code', async () => {
    // GIVEN a live game on screen
    const { result } = renderHook(() => useActiveClassroomGame('class-1'));
    await waitFor(() => expect(socketHandlers['activeClassroomGames']).toBeDefined());
    act(() => { socketHandlers['activeClassroomGames']({ games: [GAME] }); });

    // WHEN some other room's game ends
    act(() => { socketHandlers['classroomGameEnded']?.({ gameCode: 'ZZZ999' }); });

    // THEN this one is untouched
    expect(result.current.activeGame?.gameCode).toBe('ABC123');
  });

  it('surfaces a server rejection instead of swallowing it', async () => {
    // GIVEN the socket is refused (not a member, not authenticated, bad payload)
    const { result } = renderHook(() => useActiveClassroomGame('class-1'));
    await waitFor(() => expect(socketHandlers['classroomGameError']).toBeDefined());

    // WHEN the server answers with an error
    act(() => { socketHandlers['classroomGameError']({ error: 'Authentication required' }); });

    // THEN the caller can tell "rejected" apart from "no game running"
    expect(result.current.error).toBe('Authentication required');
  });
});
