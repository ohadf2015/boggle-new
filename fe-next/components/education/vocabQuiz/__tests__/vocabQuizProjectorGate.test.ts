/**
 * The projector must reach the quiz — the gate above it was a board-game gate.
 *
 * Reproduced live on 2026-09-11 in room TMQS55 with the Gauntlet II teacher
 * account and one student: every student saw question 1 and answered it, and
 * the teacher's projector stayed EMPTY for the whole round — header, teacher
 * control strip, and 750px of bare navy between them.
 *
 * The cause is one level above `TvBroadcastView`, which already routes a quiz
 * room to `VocabQuizHostView` correctly and has a passing test saying so. Its
 * mount in `HostView` is gated on `runtime.gameStarted || hasActiveGameData`
 * AND `runtime.tableData` — three board-game facts. A Vocab Quiz has no letter
 * grid, so `tableData` is never populated, and it never emits `startGame`, so
 * `gameStarted` stays false. The gate can therefore never open for the one room
 * type whose branch sits directly behind it.
 *
 * This is recurring-pitfall class 3 twice over, at two altitudes: the inner
 * route was fixed and tested in isolation while the outer route that decides
 * whether the inner one runs at all was left on the board-game predicate, and
 * mocking `TvBroadcastView` in that test is exactly what hid it.
 */
import { describe, it, expect } from 'vitest';
import { projectorShowsQuiz } from '../useIsVocabQuizRoom';

const BOARD_ROUND = {
  gameStarted: true,
  hasActiveGameData: true,
  waitingForResults: false,
  hostPlaying: false,
  hasBoard: true,
  isQuizRoom: false,
};

describe('projectorShowsQuiz', () => {
  it('opens for a live quiz that has no board and never fired startGame', () => {
    expect(
      projectorShowsQuiz({
        ...BOARD_ROUND,
        gameStarted: false,
        hasActiveGameData: false,
        hasBoard: false,
        isQuizRoom: true,
      })
    ).toBe(true);
  });

  it('still opens for an ordinary board round', () => {
    expect(projectorShowsQuiz(BOARD_ROUND)).toBe(true);
  });

  it('stays shut for a board room that has no grid yet', () => {
    // The original reason `hasBoard` is in the predicate: TvBroadcastView's
    // board branch reads the grid unconditionally. Only the quiz branch, which
    // returns before that, is allowed past without one.
    expect(projectorShowsQuiz({ ...BOARD_ROUND, hasBoard: false })).toBe(false);
  });

  it('stays shut while the host is playing — that is HostInGameView, not the TV', () => {
    expect(projectorShowsQuiz({ ...BOARD_ROUND, hostPlaying: true, isQuizRoom: true })).toBe(false);
  });

  it('stays shut for a BOARD round waiting on results', () => {
    expect(projectorShowsQuiz({ ...BOARD_ROUND, waitingForResults: true })).toBe(false);
  });

  it('keeps a quiz on the wall even when the shell claims it is waiting on results', () => {
    // `waitingForResults` is a board fact: the grid's clock hit zero and the
    // scores have not arrived. A quiz has neither grid nor board clock, so for
    // a quiz room the flag is noise raised by the shell's own watchdogs — and
    // honouring it blanked the projector at the whistle. Every "standings" shot
    // in the round-2 capture turned out to be the lobby because of this line.
    expect(
      projectorShowsQuiz({ ...BOARD_ROUND, waitingForResults: true, isQuizRoom: true })
    ).toBe(true);
  });

  it('keeps the projector on the quiz after the last question, for the podium', () => {
    // `isQuizRoom` latches for the life of the room on purpose: the standings
    // are the payoff, and dropping back to an empty board shell at the final
    // whistle is the same blank screen one beat later.
    expect(
      projectorShowsQuiz({
        gameStarted: false,
        hasActiveGameData: false,
        waitingForResults: false,
        hostPlaying: false,
        hasBoard: false,
        isQuizRoom: true,
      })
    ).toBe(true);
  });
});
