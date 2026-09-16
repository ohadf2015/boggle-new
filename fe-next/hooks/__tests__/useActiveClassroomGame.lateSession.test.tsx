/**
 * The socket that connects before the session exists, and stays anonymous.
 *
 * `initSocket` reads `supabase.auth.getSession()` ONCE and pins the result into
 * the handshake. The server sets `socket.data.verifiedUserId` from that
 * handshake token and never revisits it, so a socket that opened without one is
 * anonymous for its whole life — and `joinClassroomGame`
 * (`classroomGameHandler.ts:319`) hard-refuses an anonymous socket with
 * "Authentication required".
 *
 * Two ways a student lands there, both real:
 *   - a cold load or a deep link, where the cookie-backed session has not
 *     hydrated at the instant this effect runs;
 *   - an in-app WebView (Google Classroom opens links in one) that partitions
 *     storage, so the first read comes back empty.
 *
 * Either way the banner's JOIN fails every time and re-entering the class code
 * does not help — nothing re-mounts this socket. Reported by a teacher
 * 2026-09-14: a few students "received an error" and re-entering the code never
 * connected them.
 */
import { renderHook, waitFor } from '@testing-library/react';

const socketHandlers: Record<string, (data: unknown) => void> = {};
const mockEmit = vi.fn();
const mockDisconnect = vi.fn();
const mockConnect = vi.fn();
const mockIo = vi.fn();

const mockSocket = {
  connected: false,
  auth: {} as Record<string, unknown>,
  emit: mockEmit,
  connect: mockConnect,
  disconnect: mockDisconnect,
  on: vi.fn((event: string, fn: (data: unknown) => void) => { socketHandlers[event] = fn; }),
  io: { on: vi.fn() },
};

vi.mock('socket.io-client', () => ({
  io: (...args: unknown[]) => { mockIo(...args); return mockSocket; },
}));
vi.mock('@/utils/SocketContext', () => ({ getSocketURL: () => 'http://localhost:3001' }));

/** No session at mount — the whole point of this file. */
const mockGetSession = vi.fn(async () => ({ data: { session: null } }));
let authCallback: ((event: string, session: unknown) => void) | null = null;
const mockOnAuthStateChange = vi.fn((cb: (event: string, session: unknown) => void) => {
  authCallback = cb;
  return { data: { subscription: { unsubscribe: vi.fn() } } };
});

vi.mock('@/utils/supabase/client', () => ({
  createClient: () => ({
    auth: { getSession: mockGetSession, onAuthStateChange: mockOnAuthStateChange },
  }),
}));

import { useActiveClassroomGame } from '../useActiveClassroomGame';

beforeEach(() => {
  vi.clearAllMocks();
  authCallback = null;
  mockSocket.auth = {};
  for (const k of Object.keys(socketHandlers)) delete socketHandlers[k];
});

describe('a socket opened before the session existed', () => {
  it('still opens, so a signed-out student sees nothing worse than today', async () => {
    renderHook(() => useActiveClassroomGame('class-1'));
    await waitFor(() => expect(mockIo).toHaveBeenCalled());
    expect(mockIo).toHaveBeenCalledWith('http://localhost:3001', expect.objectContaining({ auth: {} }));
  });

  /** The fix: notice the session when it lands rather than staying anonymous. */
  it('watches for a session it did not have at connect time', async () => {
    renderHook(() => useActiveClassroomGame('class-1'));
    await waitFor(() => expect(mockOnAuthStateChange).toHaveBeenCalled());
  });

  it('re-handshakes with the token once the session arrives', async () => {
    renderHook(() => useActiveClassroomGame('class-1'));
    await waitFor(() => expect(authCallback).toBeTruthy());

    authCallback!('SIGNED_IN', { access_token: 'jwt-late' });

    await waitFor(() => expect(mockSocket.auth).toEqual({ token: 'jwt-late' }));
    // A handshake is only re-read on a fresh connection.
    expect(mockDisconnect).toHaveBeenCalled();
    expect(mockConnect).toHaveBeenCalled();
  });

  /** Reconnecting a socket that is already authenticated would drop the feed. */
  it('does not re-handshake when the session carries no token', async () => {
    renderHook(() => useActiveClassroomGame('class-1'));
    await waitFor(() => expect(authCallback).toBeTruthy());

    authCallback!('SIGNED_OUT', null);

    expect(mockConnect).not.toHaveBeenCalled();
  });
});
