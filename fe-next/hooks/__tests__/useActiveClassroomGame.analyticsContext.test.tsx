/**
 * useActiveClassroomGame — classroom analytics context.
 *
 * WHY: `classroom_id` has never appeared on a single game lifecycle event,
 * all-time, so "which modes do students actually play in class" was
 * unanswerable. The server broadcasts `classroomGameStarted` to
 * `classroom:<id>` — but that broadcast had NO CLIENT LISTENER AT ALL and did
 * not even carry `classroomId`, so the student's browser never learned which
 * classroom it was in. A broadcast nothing receives is its own silent failure
 * (recurring pitfall class 4).
 *
 * Registering `classroom_id` as a PostHog super property here means every
 * later event from this browser — game_started, game_completed, and the
 * `growth:`-prefixed twins that are emitted from different call sites — carries
 * it by construction, instead of each emitter having to remember (class 3:
 * two paths that should behave identically, one silently doesn't).
 *
 * CLEARING IS AS LOAD-BEARING AS SETTING, which this hook's own header already
 * says about the JOIN button. Super properties persist in localStorage, so a
 * classroom_id left behind tags every later SOLO game as classroom play
 * (class 2: stale state across a boundary). Both clear paths are pinned here.
 */
import { renderHook, act, waitFor } from '@testing-library/react';

const socketHandlers: Record<string, (data: unknown) => void> = {};
const mockEmit = vi.fn();
const mockDisconnect = vi.fn();

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
  io: () => currentSocket,
}));
vi.mock('@/utils/SocketContext', () => ({ getSocketURL: () => 'http://localhost:3001' }));
vi.mock('@/utils/supabase/client', () => ({
  createClient: () => ({
    auth: { getSession: () => Promise.resolve({ data: { session: { access_token: 'jwt' } } }) },
  }),
}));

const mockSetContext = vi.fn();
vi.mock('@/lib/education/telemetry', () => ({
  setEduClassroomContext: (...a: unknown[]) => mockSetContext(...a),
}));

import { useActiveClassroomGame } from '../useActiveClassroomGame';

describe('useActiveClassroomGame — classroom analytics context', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const k of Object.keys(socketHandlers)) delete socketHandlers[k];
    currentSocket = makeSocket();
  });

  async function mountReady(classroomId: string) {
    const rendered = renderHook(() => useActiveClassroomGame(classroomId));
    await waitFor(() => expect(socketHandlers.classroomGameStarted).toBeDefined());
    return rendered;
  }

  it('Given the class game starts, When the broadcast arrives, Then classroom_id is registered from the PAYLOAD', async () => {
    await mountReady('cls-1');

    act(() => {
      socketHandlers.classroomGameStarted({ gameCode: 'ABC123', classroomId: 'cls-1' });
    });

    expect(mockSetContext).toHaveBeenCalledWith('cls-1');
  });

  it('Given an older server that omits classroomId, When the broadcast arrives, Then it falls back to the subscribed classroom', async () => {
    // The socket is only ever in `classroom:<id>` for the id it subscribed to,
    // so the hook's own argument is a safe fallback rather than a guess.
    await mountReady('cls-7');

    act(() => {
      socketHandlers.classroomGameStarted({ gameCode: 'ABC123' });
    });

    expect(mockSetContext).toHaveBeenCalledWith('cls-7');
  });

  it('Given a broadcast for ANOTHER classroom, When it arrives, Then the context is not set from it', async () => {
    // Same defence the banner already applies: trust the payload's own scope.
    await mountReady('cls-1');

    act(() => {
      socketHandlers.classroomGameStarted({ gameCode: 'ABC123', classroomId: 'someone-else' });
    });

    expect(mockSetContext).not.toHaveBeenCalledWith('someone-else');
  });

  it('Given the session ends, When classroomGameEnded arrives, Then classroom_id is CLEARED, not left stale', async () => {
    await mountReady('cls-1');

    act(() => {
      socketHandlers.classroomGameStarted({ gameCode: 'ABC123', classroomId: 'cls-1' });
    });
    mockSetContext.mockClear();

    act(() => {
      socketHandlers.classroomGameEnded({ gameCode: 'ABC123', sessionEnded: true });
    });

    expect(mockSetContext).toHaveBeenCalledWith(null);
  });

  it('Given the student taps JOIN, When the hook unmounts on navigation, Then classroom_id SURVIVES', async () => {
    // The load-bearing case. Both consumers router.push to /multiplayer to
    // PLAY, which unmounts this hook — so a clear-on-unmount would wipe
    // classroom_id a beat before `game_started` fires on the multiplayer page
    // and the whole feature would be a silent no-op. The scope must outlive the
    // navigation that starts the game it describes.
    const { unmount } = await mountReady('cls-1');

    act(() => {
      socketHandlers.classroomGameStarted({ gameCode: 'ABC123', classroomId: 'cls-1' });
    });
    mockSetContext.mockClear();

    unmount();

    expect(mockSetContext).not.toHaveBeenCalledWith(null);
  });

  it('Given the student is back on the hub with no live game, When the roster reports empty, Then classroom_id is cleared', async () => {
    // The other clear path: a student who leaves mid-game never receives
    // classroomGameEnded, so without this their later SOLO games keep the tag.
    await mountReady('cls-1');

    act(() => {
      socketHandlers.classroomGameStarted({ gameCode: 'ABC123', classroomId: 'cls-1' });
    });
    mockSetContext.mockClear();

    act(() => {
      socketHandlers.activeClassroomGames({ classroomId: 'cls-1', games: [] });
    });

    expect(mockSetContext).toHaveBeenCalledWith(null);
  });
});
