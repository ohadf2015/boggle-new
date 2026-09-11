/**
 * Live Vocab Quiz — "is this room running a quiz?"
 *
 * A deliberately tiny detector for the multiplayer shell, which needs to swap
 * in the quiz surface but should not carry the full quiz state. It cannot ask
 * `game.gameMode`: the quiz is not a `GameMode` (see shared/types/vocabQuiz),
 * so the room's mode is whatever board mode the lobby last held. The server's
 * own quiz traffic is the signal instead.
 *
 * `VocabQuizView` mounts after this flips and asks for its own snapshot, so a
 * student who joins or refreshes mid-round still lands on the live question.
 */

'use client';

import { useEffect, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { VOCAB_QUIZ_EVENTS } from '@/shared/types/vocabQuiz';

export function useIsVocabQuizRoom(socket: Socket | null): boolean {
  const [isQuizRoom, setIsQuizRoom] = useState(false);

  useEffect(() => {
    if (!socket) return;

    const claim = () => setIsQuizRoom(true);
    // `state` is the reconnect answer and may say the quiz is already over —
    // still a quiz room, because the student must see final standings rather
    // than a letter grid that was never generated.
    socket.on(VOCAB_QUIZ_EVENTS.question, claim);
    socket.on(VOCAB_QUIZ_EVENTS.state, claim);
    socket.on(VOCAB_QUIZ_EVENTS.ended, claim);

    // ...and let go when a BOARD round starts in the same room. The flag now
    // also hides the classroom join code (the quiz surface carries its own), so
    // a latch that never released would take the code off screen for a board
    // round played after a quiz — which is the 2026-08-30 incident recorded in
    // lib/education/classroomLobbyChrome.ts, reintroduced by the back door.
    const release = () => setIsQuizRoom(false);
    socket.on('startGame', release);

    const ask = () => socket.emit(VOCAB_QUIZ_EVENTS.requestState);
    socket.on('connect', ask);
    ask();

    return () => {
      socket.off(VOCAB_QUIZ_EVENTS.question, claim);
      socket.off(VOCAB_QUIZ_EVENTS.state, claim);
      socket.off(VOCAB_QUIZ_EVENTS.ended, claim);
      socket.off('startGame', release);
      socket.off('connect', ask);
    };
  }, [socket]);

  return isQuizRoom;
}

export default useIsVocabQuizRoom;

/**
 * Every field is `| undefined` on purpose. These come straight out of the host
 * shell's runtime/settings slices, where several are optional, and the inline
 * predicate this replaced tolerated that because it was all `&&`. Narrowing
 * them to `boolean` here would move a real type error into a file that neither
 * eslint (not type-aware) nor vitest (types stripped) checks — it would surface
 * only in `npm run build`. The body reads them truthily, so widening costs
 * nothing.
 */
export interface ProjectorGateInput {
  /** The board shell's "a round is running" flag — a quiz never sets it. */
  gameStarted?: boolean;
  /** Board grid + a running clock. */
  hasActiveGameData?: boolean;
  waitingForResults?: boolean;
  /** The host is competing, so the grid view owns the screen, not the TV. */
  hostPlaying?: boolean;
  /** A letter grid exists. The TV's board branch reads it unconditionally. */
  hasBoard?: boolean;
  /** The server's quiz traffic has claimed this room. */
  isQuizRoom?: boolean;
}

/**
 * Should the classroom projector mount the broadcast view?
 *
 * Lives here rather than inline in `HostView` because the bug it fixes was
 * invisible exactly while it was an inline boolean: a quiz room fails every
 * board-shaped term in it (no `startGame`, no grid, no clock), so the teacher's
 * screen stayed empty for a whole round while the students played. A quiz room
 * satisfies the gate on its own, and drops out of it for the two states where
 * the TV genuinely must not be up — the host is playing, or results are
 * pending.
 *
 * `isQuizRoom` latches for the life of the room, so this also keeps the podium
 * on the wall after the last question instead of blanking at the whistle.
 */
export function projectorShowsQuiz({
  gameStarted,
  hasActiveGameData,
  waitingForResults,
  hostPlaying,
  hasBoard,
  isQuizRoom,
}: ProjectorGateInput): boolean {
  if (waitingForResults || hostPlaying) return false;
  if (isQuizRoom) return true;
  return !!(gameStarted || hasActiveGameData) && !!hasBoard;
}
