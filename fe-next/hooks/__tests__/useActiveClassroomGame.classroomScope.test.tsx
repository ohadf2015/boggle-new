/**
 * useActiveClassroomGame — a response for one classroom must never surface
 * under another.
 *
 * The live critic saw a student enrolled ONLY in "Flow Check" shown a banner
 * naming "Week 3 Vocabulary", a lesson belonging to the teacher's OTHER
 * classroom, and tapping through landed on the bare multiplayer hub. The
 * membership check on the server is sound (verified against the database: both
 * students had exactly one membership row), so the cross-talk has to be
 * client-side. Two holes made it possible, and both are pinned here:
 *
 *   1. `initSocket` is async — it awaits `getSession()` before assigning
 *      `socketInstance`. When `classroomId` changes inside that window the
 *      cleanup runs with the local still `undefined`, so `socketInstance
 *      ?.disconnect()` does NOTHING. The old socket survives, stays subscribed
 *      to the OLD `classroom:<id>` room, keeps polling every 15 seconds, and
 *      its listeners still close over the same stable `setActiveGame` — so the
 *      previous classroom's game is written into the current classroom's
 *      banner. Recurring pitfall class 3: two paths to teardown, one silently
 *      does nothing.
 *
 *   2. `activeClassroomGames` carried no classroomId, so the client could not
 *      tell whose answer it was holding and trusted every one of them.
 */
import { renderHook, act, waitFor } from '@testing-library/react';

const socketHandlers: Record<string, (data: unknown) => void> = {};
const mockEmit = vi.fn();
const mockDisconnect = vi.fn();
const mockIo = vi.fn();

function makeSocket() {
  return {
    connected: true,
    emit: mockEmit,
    disconnect: mockDisconnect,
    on: vi.fn((event: string, fn: (data: unknown) => void) => { socketHandlers[event] = fn; }),
    io: { on: vi.fn() },
  };
}

let currentSocket = makeSocket();

vi.mock('socket.io-client', () => ({
  io: (...args: unknown[]) => { mockIo(...args); return currentSocket; },
}));
vi.mock('@/utils/SocketContext', () => ({ getSocketURL: () => 'http://localhost:3001' }));

/**
 * Session resolution can be held open on purpose so a classroom change can race
 * it — that window is where the teardown bug lives.
 */
const SESSION = { data: { session: { access_token: 'jwt-abc' } } };
let holdSession = false;
let releaseSession: (() => void) | null = null;
const mockGetSession = vi.fn(() => {
  if (!holdSession) return Promise.resolve(SESSION);
  return new Promise((resolve) => {
    releaseSession = () => resolve(SESSION);
  });
});
vi.mock('@/utils/supabase/client', () => ({
  createClient: () => ({ auth: { getSession: mockGetSession } }),
}));

import { useActiveClassroomGame } from '../useActiveClassroomGame';

const OTHER_CLASS_GAME = {
  gameCode: 'WEEK03',
  classroomId: 'ela-period-3',
  teacherName: 'Ms Plant',
  lessonNames: ['Week 3 Vocabulary'],
};

describe('useActiveClassroomGame — classroom scoping', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const k of Object.keys(socketHandlers)) delete socketHandlers[k];
    releaseSession = null;
    holdSession = false;
    currentSocket = makeSocket();
  });

  /** Mount, let the async socket setup finish, and hand back the hook result. */
  async function mountReady(classroomId: string) {
    const rendered = renderHook(() => useActiveClassroomGame(classroomId));
    await waitFor(() => expect(socketHandlers.activeClassroomGames).toBeDefined());
    return rendered;
  }

  it('disconnects a socket whose classroom changed while the session was still resolving', async () => {
    // GIVEN a hook mounted for one classroom, with getSession() held pending
    holdSession = true;
    const { rerender, unmount } = renderHook(
      ({ id }: { id: string }) => useActiveClassroomGame(id),
      { initialProps: { id: 'ela-period-3' } }
    );
    await waitFor(() => expect(releaseSession).not.toBeNull());

    // WHEN the classroom changes before the socket has been created — the
    // cleanup for classroom A runs while its `socketInstance` local is still
    // undefined — and only then does the session resolve
    const releaseFirst = releaseSession!;
    releaseSession = null;
    rerender({ id: 'flow-check' });
    await act(async () => { releaseFirst(); });
    await waitFor(() => expect(releaseSession).not.toBeNull());
    await act(async () => { releaseSession!(); });
    await waitFor(() => expect(mockIo).toHaveBeenCalledTimes(2));

    unmount();

    // THEN every socket this hook opened is torn down. A survivor keeps its
    // seat in the old `classroom:<id>` room, keeps polling every 15 seconds,
    // and still closes over the same stable `setActiveGame` — so the previous
    // classroom's game gets written into this classroom's banner.
    await waitFor(() => {
      expect(mockDisconnect).toHaveBeenCalledTimes(mockIo.mock.calls.length);
    });
  });

  it('ignores an activeClassroomGames response addressed to another classroom', async () => {
    // GIVEN a student whose banner is scoped to Flow Check
    const { result } = await mountReady('flow-check');

    // WHEN a response for the teacher's OTHER classroom reaches this socket
    act(() => {
      socketHandlers.activeClassroomGames({
        classroomId: 'ela-period-3',
        games: [OTHER_CLASS_GAME],
      });
    });

    // THEN it is not shown. The student is not in that class.
    expect(result.current.activeGame).toBeNull();
  });

  it('ignores a game whose own classroomId is not this classroom', async () => {
    // GIVEN the same student
    const { result } = await mountReady('flow-check');

    // WHEN a response for THIS classroom nonetheless carries a foreign game
    act(() => {
      socketHandlers.activeClassroomGames({
        classroomId: 'flow-check',
        games: [OTHER_CLASS_GAME],
      });
    });

    // THEN the foreign game is dropped rather than advertised as this class's
    expect(result.current.activeGame).toBeNull();
  });

  it('still shows a game for this classroom', async () => {
    // GIVEN the same student
    const { result } = await mountReady('flow-check');

    // WHEN their own class's game arrives
    act(() => {
      socketHandlers.activeClassroomGames({
        classroomId: 'flow-check',
        games: [{
          gameCode: 'R438D5',
          classroomId: 'flow-check',
          teacherName: 'Ms Plant',
          lessonNames: ['Flow Check Words'],
        }],
      });
    });

    // THEN it is shown — the scoping must not swallow the happy path
    expect(result.current.activeGame?.gameCode).toBe('R438D5');
  });

  it('accepts a legacy response that carries no classroomId at all', async () => {
    // GIVEN a server that has not been redeployed yet
    const { result } = await mountReady('flow-check');

    // WHEN it answers in the old shape
    act(() => {
      socketHandlers.activeClassroomGames({
        games: [{ gameCode: 'R438D5', teacherName: 'Ms Plant', lessonNames: ['Flow Check Words'] }],
      });
    });

    // THEN the banner still works. Scoping must not become a silent blackout
    // against an older server (recurring pitfall class 4).
    expect(result.current.activeGame?.gameCode).toBe('R438D5');
  });
});
