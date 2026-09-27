/**
 * Re-handshake the shared socket when a session appears AFTER it connected.
 *
 * The server verifies the Supabase JWT once, at connect time
 * (`server/socketSetup.ts` → `socket.data.verifiedUserId`), and never again.
 * The app-wide socket opens on the first page, so a classroom guest who is
 * minted an anonymous account on the join page (`signInAnonymously`) walks
 * into the live room on a socket that is still tokenless — and
 * `reloadOnSignIn` deliberately skips anonymous sign-ins, so nothing reopens
 * it. The join is logged "(guest)", `authUserId` stays null, and every
 * end-of-round writer (quiz `finishQuiz`, board `playerScoresFromGameResults`)
 * drops the student: game JECL96 ended "0 students recorded" with two anonymous
 * students who each had a real `auth.users` row and a classroom membership.
 *
 * A reconnect re-runs the `auth` callback (fresh token), and SocketContext's
 * connect handler re-emits any remembered `join`, so a student already seated
 * is rebound under their verified id.
 */

import logger from '@/utils/logger';

export interface SocketAuthUpgradeInput {
  event: string;
  token?: string | null;
  socketConnected: boolean;
  /** Whether the handshake the server holds for this socket carried a JWT. */
  handshakeHadToken: boolean;
}

export function shouldUpgradeSocketAuth({
  event,
  token,
  socketConnected,
  handshakeHadToken,
}: SocketAuthUpgradeInput): boolean {
  return event === 'SIGNED_IN' && !!token && socketConnected && !handshakeHadToken;
}

type UpgradableSocket = { connected: boolean; disconnect: () => unknown; connect: () => unknown };

/** Subscribe to auth changes; returns a stop function. */
export function watchSocketAuthUpgrade(
  socket: UpgradableSocket,
  handshakeHadToken: () => boolean
): () => void {
  let stopped = false;
  let unsubscribe: (() => void) | undefined;

  void import('@/utils/supabase/client')
    .then(({ createClient }) => {
      const { data } = createClient().auth.onAuthStateChange((event, session) => {
        const token = (session as { access_token?: string } | null)?.access_token;
        if (
          !shouldUpgradeSocketAuth({
            event,
            token,
            socketConnected: socket.connected,
            handshakeHadToken: handshakeHadToken(),
          })
        ) {
          return;
        }
        logger.log('[SOCKET.IO] Session appeared on a guest socket — re-handshaking');
        socket.disconnect();
        socket.connect();
      });
      unsubscribe = () => data.subscription.unsubscribe();
      if (stopped) unsubscribe();
    })
    .catch(() => {
      // No Supabase client (tests / misconfigured env): stay a guest socket.
    });

  return () => {
    stopped = true;
    unsubscribe?.();
  };
}
