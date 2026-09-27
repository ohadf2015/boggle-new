/**
 * Live Vocab Quiz — who owns the screen at the final whistle.
 *
 * The bug this locks down was the one disqualifying gap of round 2: a student
 * who had just watched a live score climb to 502 was shown a recap card reading
 * "ON THE PODIUM! 0 POINTS / 0 of 25 lesson words", and the projector never
 * reached its standings at all — the shots labelled "standings" were the lobby.
 *
 * Neither number was lost. The BOARD's results page won the surface. A quiz
 * room is a real classroom room in the board engine's eyes, so if anything
 * drives that engine's end path (`endGame`) the shell flips `showResults` and
 * renders board-shaped scores — and a quiz puts no words on a grid, so those
 * scores are zero BY CONSTRUCTION. Same room, two endings, and the wrong one
 * rendered: recurring-pitfall class 3.
 *
 * The rule is therefore stated once, here, as a pure predicate rather than as
 * an inline boolean in `app/[locale]/multiplayer/PageClient.tsx` — the sibling
 * predicate in this same module carries a comment explaining that this exact
 * bug class is "invisible exactly while it was an inline boolean".
 */
import { describe, it, expect } from 'vitest';
import { quizOwnsRoundEnd, showBoardWaitingScreen } from '../useIsVocabQuizRoom';

const QUIZ_ENDED = { isQuizRoom: true, showResults: true, isActive: true };

describe('quizOwnsRoundEnd', () => {
  it('hands a finished quiz its own ending instead of the board results page', () => {
    expect(quizOwnsRoundEnd(QUIZ_ENDED)).toBe(true);
  });

  it('leaves an ordinary board round alone', () => {
    expect(quizOwnsRoundEnd({ ...QUIZ_ENDED, isQuizRoom: false })).toBe(false);
  });

  it('claims nothing while the round is still being played', () => {
    // Mid-round there is no results page to beat; the in-game view is already
    // the quiz's, and claiming here would only add a branch that can drift.
    expect(quizOwnsRoundEnd({ ...QUIZ_ENDED, showResults: false })).toBe(false);
  });

  it('stands down once the viewer has left the room', () => {
    // `isActive` false means the shell has torn the room down — the quiz
    // surfaces mount under it, so there is nothing left to render the podium
    // into. Better the board's fallback than a blank screen.
    expect(quizOwnsRoundEnd({ ...QUIZ_ENDED, isActive: false })).toBe(false);
  });

  it('treats every field as optional, the way the shell supplies them', () => {
    expect(quizOwnsRoundEnd({})).toBe(false);
  });
});

describe('showBoardWaitingScreen', () => {
  it('keeps the board\'s "Tallying the scores…" card for a board round', () => {
    expect(showBoardWaitingScreen({ waitingForResults: true })).toBe(true);
  });

  it('never shows it to a student whose quiz just ended', () => {
    // Reproduced live on 2026-09-11 in room 6H59DJ: a student finished a quiz
    // on 540 points and their phone showed "0 SCORE · 0 words · Tallying the
    // scores…" — the board's waiting card, whose score comes from the board
    // leaderboard and whose word count comes from words found on a grid the
    // quiz never drew. Both are zero by construction, and the quiz's own end
    // screen was one branch below it.
    expect(showBoardWaitingScreen({ waitingForResults: true, isQuizRoom: true })).toBe(false);
  });

  it('shows nothing while a round is still being played', () => {
    expect(showBoardWaitingScreen({ waitingForResults: false })).toBe(false);
  });
});
