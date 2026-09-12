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
  if (hostPlaying) return false;
  // `waitingForResults` is a BOARD fact — "the grid's clock hit zero and the
  // server has not sent scores yet" — raised by the shell's own watchdogs. A
  // quiz has no grid and no board clock, so for a quiz room the flag is never
  // information, only noise; honouring it took the podium off the wall at the
  // exact moment the class looked up (round-2 capture: every projector shot
  // labelled "standings" was the lobby). The host's phone still wins, because
  // that is a different view, not a different state.
  if (isQuizRoom) return true;
  if (waitingForResults) return false;
  return !!(gameStarted || hasActiveGameData) && !!hasBoard;
}

/**
 * Which ending does a classroom room show — the quiz's, or the board's?
 *
 * The multiplayer shell renders `ResultsPage` the moment `showResults` flips,
 * before any quiz-aware branch. For a quiz room that page is wrong twice over:
 * its scores come from words found on a grid the quiz never drew (so they are
 * zero by construction) and its lesson-word tally counts board coverage (so it
 * is zero too). A student who had just scored 502 was shown "0 POINTS / 0 of 25
 * lesson words" — recurring-pitfall class 3, two endings for one room with the
 * wrong one rendering.
 *
 * Stated here, next to `projectorShowsQuiz`, because that predicate's own
 * comment records that this bug class is invisible exactly while it lives as an
 * inline boolean at the call site.
 */
export interface RoundEndOwnershipInput {
  /** The server's quiz traffic has claimed this room. */
  isQuizRoom?: boolean;
  /** The shell wants to render the board's results page. */
  showResults?: boolean;
  /** The shell still has a room mounted to render into. */
  isActive?: boolean;
}

export function quizOwnsRoundEnd({
  isQuizRoom,
  showResults,
  isActive,
}: RoundEndOwnershipInput): boolean {
  if (!isQuizRoom || !showResults) return false;
  // With no room mounted there is nothing for the quiz surfaces to render into;
  // the board's fallback beats a blank screen.
  return !!isActive;
}

/**
 * Should the student's phone show the BOARD's "Tallying the scores…" card?
 *
 * `PlayerView` renders that card whenever `waitingForResults` is raised, above
 * every mode-specific branch. It reads its score from the board leaderboard and
 * its word count from words found on a grid — for a quiz both are zero by
 * construction, and the quiz's own end screen sits one branch below it.
 *
 * Reproduced live on 2026-09-11 (room 6H59DJ): a student finished a quiz on 540
 * points and their phone read "0 SCORE · 0 words · Tallying the scores…". Same
 * fact as `projectorShowsQuiz`, one surface over: `waitingForResults` is a
 * board-shaped flag and a quiz room must never be judged by it.
 */
export function showBoardWaitingScreen({
  isQuizRoom,
  waitingForResults,
}: {
  isQuizRoom?: boolean;
  waitingForResults?: boolean;
}): boolean {
  return !!waitingForResults && !isQuizRoom;
}

/**
 * The same rule, as one line at the call site.
 *
 * `PlayerView` is 828 lines and the gauntlet gate refuses to let a pre-existing
 * file grow, so the fix has to cost the shell a single statement: detection and
 * predicate are folded together here instead of being spelled out over there.
 * The pure `showBoardWaitingScreen` stays exported — a rule that can only be
 * exercised by mounting an 800-line shell is a rule nobody tests.
 */
export function useBoardWaitingScreen(
  socket: Socket | null,
  waitingForResults?: boolean
): boolean {
  return showBoardWaitingScreen({ isQuizRoom: useIsVocabQuizRoom(socket), waitingForResults });
}
